package ws

import (
	"encoding/json"
	"net/http"
	"net/url"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// EmitFunc — функция для отправки событий во фронтенд.
type EmitFunc func(event string, data ...interface{})

// Manager управляет WebSocket-соединением.
type Manager struct {
	serverAddr string
	httpClient *http.Client

	conn       *websocket.Conn
	mu         sync.Mutex
	sendCh     chan []byte
	started    atomic.Bool
	shutdownCh chan struct{}

	emitFn EmitFunc
	userID int64
}

// New создаёт WS Manager.
func New(serverAddr string, httpClient *http.Client) *Manager {
	return &Manager{
		serverAddr: serverAddr,
		httpClient: httpClient,
		shutdownCh: make(chan struct{}),
	}
}

func (m *Manager) SetUserID(id int64)  { m.userID = id }
func (m *Manager) GetUserID() int64    { return m.userID }
func (m *Manager) SetEmitFn(fn EmitFunc) { m.emitFn = fn }

// Start запускает цикл WS-жизни. Блокирующий, запускать в горутине.
func (m *Manager) Start() {
	log := logger.For("ws", "Start")

	if !m.started.CompareAndSwap(false, true) {
		return
	}
	defer m.started.Store(false)

	for {
		select {
		case <-m.shutdownCh:
			return
		default:
		}

		if m.httpClient.Jar != nil {
			serverURL, _ := url.Parse(m.serverAddr)
			httpsURL, _ := url.Parse("https://" + serverURL.Host)
			if len(m.httpClient.Jar.Cookies(httpsURL)) == 0 {
				log.Warn("нет кук в jar, пропуск подключения")
				return
			}
		}

		if err := m.connect(); err != nil {
			log.Error("ошибка подключения", err)
			time.Sleep(3 * time.Second)
			continue
		}

		log.Info("подключение установлено, запуск циклов")

		m.sendCh = make(chan []byte, 64)
		stopCh := make(chan struct{})

		var wg sync.WaitGroup
		wg.Add(2)

		go func() {
			defer wg.Done()
			m.readLoop()
			close(stopCh)
		}()

		go func() {
			defer wg.Done()
			m.writeLoop(stopCh)
		}()

		wg.Wait()

		m.mu.Lock()
		if m.conn != nil {
			m.conn.Close()
			m.conn = nil
		}
		m.mu.Unlock()
		close(m.sendCh)

		select {
		case <-m.shutdownCh:
			return
		default:
			log.Info("переподключение через 3 сек")
			time.Sleep(3 * time.Second)
		}
	}
}

// Close закрывает WebSocket-соединение. readLoop/writeLoop завершатся,
// Start() выйдет из-за отсутствия кук (session удалён).
func (m *Manager) Close() {
	log := logger.For("ws", "Close")
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.conn != nil {
		m.conn.Close()
		m.conn = nil
		log.Info("соединение закрыто")
	}
}

// Send отправляет JSON через канал в WS writer-горутину.
func (m *Manager) Send(payload interface{}) error {
	log := logger.For("ws", "Send")

	data, err := json.Marshal(payload)
	if err != nil {
		return errs.Wrapf(errs.CodeInternal, "ws.Send", err, "ошибка сериализации")
	}

	log.Debug("отправка", "userID", m.userID, "data", string(data))

	select {
	case m.sendCh <- data:
	default:
		log.Warn("канал переполнен, сообщение丢弃")
	}
	return nil
}

func (m *Manager) connect() error {
	log := logger.For("ws", "connect")

	serverURL, _ := url.Parse(m.serverAddr)
	wsURL := url.URL{
		Scheme: "wss",
		Host:   serverURL.Host,
		Path:   "/api/v2/ws",
	}

	header := http.Header{}
	if m.httpClient.Jar != nil {
		httpsURL, _ := url.Parse("https://" + serverURL.Host)
		cookies := m.httpClient.Jar.Cookies(httpsURL)
		for _, c := range cookies {
			header.Add("Cookie", c.String())
		}
	}
	header.Add("Origin", "http://localhost:34115")

	log.Debug("подключение", "url", wsURL.String())

	conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), header)
	if err != nil {
		return errs.Wrap(errs.CodeHTTP, "ws.connect", err)
	}

	m.mu.Lock()
	m.conn = conn
	m.mu.Unlock()

	log.Info("успешное подключение", "host", wsURL.Host+wsURL.Path)
	return nil
}

func (m *Manager) readLoop() {
	log := logger.For("ws", "readLoop")

	for {
		m.mu.Lock()
		conn := m.conn
		m.mu.Unlock()

		if conn == nil {
			return
		}

		_, data, err := conn.ReadMessage()
		if err != nil {
			log.Error("ошибка чтения", err)
			return
		}

		log.Debug("получено", "data", string(data))
		if m.emitFn != nil {
			m.emitFn("new_message", string(data))
		}
	}
}

func (m *Manager) writeLoop(stopCh <-chan struct{}) {
	log := logger.For("ws", "writeLoop")

	for {
		select {
		case msg, ok := <-m.sendCh:
			if !ok {
				return
			}
			m.mu.Lock()
			conn := m.conn
			m.mu.Unlock()

			if conn == nil {
				log.Warn("нет соединения, пропуск")
				continue
			}

			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				log.Error("ошибка записи", err)
				return
			}
		case <-stopCh:
			return
		}
	}
}
