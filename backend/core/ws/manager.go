package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

// Manager управляет WebSocket-соединением: подключение, чтение, запись, реконнект.
type Manager struct {
	serverAddr string
	httpClient *http.Client

	conn       *websocket.Conn
	mu         sync.Mutex
	sendCh     chan []byte
	started    atomic.Bool
	shutdownCh chan struct{}

	// UserID устанавливается после Login/Register и используется при отправке.
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

// SetUserID обновляет ID текущего пользователя (вызывается после Login/Register).
func (m *Manager) SetUserID(id int64) {
	m.userID = id
}

// UserID возвращает ID текущего пользователя.
func (m *Manager) GetUserID() int64 {
	return m.userID
}

// Start запускает цикл WS-жизни: коннект → read+write → реконнект.
// Блокирующий вызов, запускать в горутине.
func (m *Manager) Start(ctx interface{ Emit(string, ...interface{}) }) {
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

		// Проверяем наличие кук
		if m.httpClient.Jar != nil {
			serverURL, _ := url.Parse(m.serverAddr)
			httpsURL, _ := url.Parse("https://" + serverURL.Host)
			if len(m.httpClient.Jar.Cookies(httpsURL)) == 0 {
				log.Printf("[WS] Нет кук в jar — пропускаем подключение")
				return
			}
		}

		if err := m.connect(); err != nil {
			log.Printf("[WS] Ошибка подключения: %v", err)
			time.Sleep(3 * time.Second)
			continue
		}

		log.Printf("[WS] Подключение успешно, запуск циклов чтения/записи")

		m.sendCh = make(chan []byte, 64)
		stopCh := make(chan struct{})

		var wg sync.WaitGroup
		wg.Add(2)

		go func() {
			defer wg.Done()
			m.readLoop(ctx)
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
			log.Printf("[WS] Переподключение через 3 сек...")
			time.Sleep(3 * time.Second)
		}
	}
}

// Close безопасно закрывает WebSocket и останавливает реконнект.
func (m *Manager) Close() {
	close(m.shutdownCh)
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.conn != nil {
		m.conn.Close()
		m.conn = nil
		log.Printf("[WS] Соединение закрыто")
	}
}

// Send отправляет JSON-сообщение через канал в WS writer-горутину.
func (m *Manager) Send(payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("ошибка сериализации WS-сообщения: %w", err)
	}

	log.Printf("[WS SEND] userID=%d, data=%s", m.userID, string(data))

	select {
	case m.sendCh <- data:
	default:
		log.Printf("[WS SEND] Канал переполнен, сообщение丢弃")
	}
	return nil
}

// connect устанавливает WebSocket-соединение.
func (m *Manager) connect() error {
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

	log.Printf("[WS] Подключение к %s", wsURL.String())

	conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), header)
	if err != nil {
		return fmt.Errorf("WebSocket dial error: %w", err)
	}

	m.mu.Lock()
	m.conn = conn
	m.mu.Unlock()

	log.Printf("[WS] Успешное подключение к %s", wsURL.Host+wsURL.Path)
	return nil
}

// readLoop читает сообщения из WS и рассылает их через Wails EventsEmit.
func (m *Manager) readLoop(emitter interface{ Emit(string, ...interface{}) }) {
	for {
		m.mu.Lock()
		conn := m.conn
		m.mu.Unlock()

		if conn == nil {
			return
		}

		_, data, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[WS READ] Ошибка: %v", err)
			return
		}

		log.Printf("[WS READ] %s", string(data))
		emitter.Emit("new_message", string(data))
	}
}

// writeLoop читает из sendCh и пишет в WebSocket.
func (m *Manager) writeLoop(stopCh <-chan struct{}) {
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
				log.Printf("[WS WRITE] Нет соединения, пропуск сообщения")
				continue
			}

			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				log.Printf("[WS WRITE] Ошибка записи: %v", err)
				return
			}
		case <-stopCh:
			return
		}
	}
}
