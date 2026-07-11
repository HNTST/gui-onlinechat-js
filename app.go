package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx          context.Context
	serverAddr   string
	httpClient   *http.Client
	wsConn       *websocket.Conn
	wsMu         sync.Mutex
	wsSendCh     chan []byte
	wsStarted    atomic.Bool
	shuttingDown bool
	userID       int64
}

// NewApp creates a new App application struct
func NewApp() *App {
	jar, _ := cookiejar.New(nil)
	return &App{
		serverAddr: "https://hntgolang.duckdns.org",
		httpClient: &http.Client{Jar: jar},
	}
}

// startup is called when the app starts — Wails lifecycle
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	log.Printf("[App] Запуск приложения, контекст сохранён")
}

// shutdown is called when the app exits — Wails lifecycle
func (a *App) shutdown(ctx context.Context) {
	log.Printf("[App] Завершение приложения, закрытие WebSocket...")
	a.shuttingDown = true
	a.closeWS()
}

// closeWS — безопасно закрывает WebSocket-соединение
func (a *App) closeWS() {
	a.wsMu.Lock()
	defer a.wsMu.Unlock()
	if a.wsConn != nil {
		a.wsConn.Close()
		a.wsConn = nil
		log.Printf("[WS] Соединение закрыто")
	}
}

// connectWS — устанавливает соединение с внешним WebSocket-сервером
func (a *App) connectWS() error {
	serverURL, _ := url.Parse(a.serverAddr)
	wsURL := url.URL{
		Scheme: "wss",
		Host:   serverURL.Host,
		Path:   "/api/v2/ws",
	}

	header := http.Header{}
	if a.httpClient.Jar != nil {
		httpsURL, _ := url.Parse("https://" + serverURL.Host)
		cookies := a.httpClient.Jar.Cookies(httpsURL)
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

	a.wsMu.Lock()
	a.wsConn = conn
	a.wsMu.Unlock()

	log.Printf("[WS] Успешное подключение к %s", wsURL.Host+wsURL.Path)
	return nil
}

// wsReadLoop — цикл чтения сообщений из WebSocket (только чтение)
func (a *App) wsReadLoop() {
	for {
		a.wsMu.Lock()
		conn := a.wsConn
		a.wsMu.Unlock()

		if conn == nil {
			return
		}

		_, data, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[WS READ] Ошибка: %v", err)
			return
		}

		log.Printf("[WS READ] %s", string(data))
		runtime.EventsEmit(a.ctx, "new_message", string(data))
	}
}

// wsWriteLoop — цикл записи сообщений в WebSocket (только запись)
func (a *App) wsWriteLoop(stopCh <-chan struct{}) {
	for {
		select {
		case msg, ok := <-a.wsSendCh:
			if !ok {
				return
			}
			a.wsMu.Lock()
			conn := a.wsConn
			a.wsMu.Unlock()

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

// startWS — единая точка управления WS: коннект → чтение + запись → реконнект
func (a *App) startWS() {
	if !a.wsStarted.CompareAndSwap(false, true) {
		return
	}
	defer a.wsStarted.Store(false)

	for !a.shuttingDown {
		// Проверяем наличие кук
		if a.httpClient.Jar != nil {
			serverURL, _ := url.Parse(a.serverAddr)
			httpsURL, _ := url.Parse("https://" + serverURL.Host)
			if len(a.httpClient.Jar.Cookies(httpsURL)) == 0 {
				log.Printf("[WS] Нет кук в jar — пропускаем подключение")
				return
			}
		}

		// Подключаемся
		if err := a.connectWS(); err != nil {
			log.Printf("[WS] Ошибка подключения: %v", err)
			time.Sleep(3 * time.Second)
			continue
		}

		log.Printf("[WS] Подключение успешно, запуск циклов чтения/записи")

		// Канал для отправки + сигнал остановки
		a.wsSendCh = make(chan []byte, 64)
		stopCh := make(chan struct{})

		var wg sync.WaitGroup
		wg.Add(2)

		// Читающая горутина — главная, при выходе останавливает запись
		go func() {
			defer wg.Done()
			a.wsReadLoop()
			close(stopCh)
		}()

		// Пишущая горутина — читает из канала, пишет в сокет
		go func() {
			defer wg.Done()
			a.wsWriteLoop(stopCh)
		}()

		// Ждём: когда reader умрёт — закрываем stopCh → writer тоже умрёт
		wg.Wait()

		// Чистим соединение
		a.wsMu.Lock()
		if a.wsConn != nil {
			a.wsConn.Close()
			a.wsConn = nil
		}
		a.wsMu.Unlock()
		close(a.wsSendCh)

		if !a.shuttingDown {
			log.Printf("[WS] Переподключение через 3 сек...")
			time.Sleep(3 * time.Second)
		}
	}
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// ============================================================
// V2 Request / Response структуры (по спецификации Swagger)
// ============================================================

// --- Чаты ---

// SaveChatRequest — тело POST /api/v2/chat (согласно Swagger)
type SaveChatRequest struct {
	Author     int64  `json:"author"`
	ChatName   string `json:"chat_name"`
	TargetUser int64  `json:"target_user"`
	IsGroup    *bool  `json:"is_group,omitempty"`
}

// SaveChatResponse — ответ POST /api/v2/chat
type SaveChatResponse struct {
	ChatID int64 `json:"chat_id"`
}

// AddUserToChatRequest — тело POST /api/v2/chat/{chat_id}/members
type AddUserToChatRequest struct {
	UsersIDs []int `json:"users_ids"`
}

// AddUserToChatResponse — ответ POST /api/v2/chat/{chat_id}/members
type AddUserToChatResponse struct {
	ChatID   int64   `json:"chat_id"`
	UsersIDs []int64 `json:"users_ids"`
}

// LastMessageDTO — последнее сообщение в чате
type LastMessageDTO struct {
	ID       int    `json:"id"`
	Text     string `json:"text"`
	SenderID int    `json:"sender_id"`
	SentAt   string `json:"sent_at"`
	IsRead   bool   `json:"is_read"`
}

// ChatExtendedDTO — расширенная информация о чате
type ChatExtendedDTO struct {
	ID          int             `json:"id"`
	Name        string          `json:"name"`
	UnreadCount int             `json:"unread_count"`
	LastMessage *LastMessageDTO `json:"last_message,omitempty"`
}

// GetUserChatsExtendedResponse — ответ GET /api/v2/chats
type GetUserChatsExtendedResponse struct {
	Chats []ChatExtendedDTO `json:"chats"`
}

// GetChatMembersResponse — ответ GET /api/v2/chats/{chat_id}/members
type GetChatMembersResponse struct {
	Members []int `json:"members"`
}

// MessageDTO — сообщение чата
type MessageDTO struct {
	ID        int    `json:"id"`
	Message   string `json:"message"`
	SenderID  int    `json:"sender_id"`
	SentAt    string `json:"sent_at"`
	IsRead    bool   `json:"is_read"`
	IsEdited  bool   `json:"is_edited"`
	IsDeleted bool   `json:"is_deleted"`
}

// GetChatMessagesResponse — ответ GET /api/v2/chats/{chat_id}/messages
type GetChatMessagesResponse struct {
	Messages []MessageDTO `json:"messages"`
}

// SaveMessageRequest — тело POST /api/v2/chats/{chat_id}/messages
type SaveMessageRequest struct {
	Message string `json:"message"`
}

// MarkMessagesAsReadRequest — тело PATCH /api/v2/chats/{chat_id}/messages/read-status
type MarkMessagesAsReadRequest struct {
	LastReadMessageID int `json:"last_read_message_id"`
}

// EditMessageRequest — тело PUT /api/v2/chats/{chat_id}/messages/{message_id}
type EditMessageRequest struct {
	Text string `json:"text"`
}

// --- Пользователи ---

// GetUserResponse — ответ GET /api/v2/user
type GetUserResponse struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	AvatarID *int   `json:"avatar_id,omitempty"`
	Reg      string `json:"reg,omitempty"`
}

// SaveUserRequest — тело POST /api/v2/user
type SaveUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password,omitempty"`
}

// SaveUserResponse — ответ POST /api/v2/user
type SaveUserResponse struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	AvatarID *int   `json:"avatar_id,omitempty"`
	Reg      string `json:"reg,omitempty"`
}

// GetUserIDResponse — ответ GET /api/v2/user_id
type GetUserIDResponse struct {
	UserID int `json:"user_id"`
}

// --- Файлы ---

// UploadAvatarResponse — ответ POST /api/v2/user/avatar
type UploadAvatarResponse struct {
	FileID int `json:"file_id"`
}

// ============================================================
// HTTP Helper
// ============================================================

// doRequest — универсальный HTTP-helper
func (a *App) doRequest(method, path string, query url.Values, body, out interface{}) error {
	u, err := url.Parse(a.serverAddr + path)
	if err != nil {
		return fmt.Errorf("неверный URL: %w", err)
	}
	if query != nil {
		u.RawQuery = query.Encode()
	}

	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("ошибка сериализации: %w", err)
		}
		log.Printf("[HTTP %s] %s -> JSON: %s", method, u.String(), string(data))
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(a.ctx, method, u.String(), reqBody)
	if err != nil {
		return fmt.Errorf("ошибка создания запроса: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	log.Printf("[HTTP %s] %s Headers: %v", method, u.String(), req.Header)
	resp, err := a.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("ошибка выполнения запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respData, _ := io.ReadAll(resp.Body)
		log.Printf("[HTTP %s] %s <- статус %d: %s", method, u.String(), resp.StatusCode, string(respData))
		return fmt.Errorf("API вернул статус %d: %s", resp.StatusCode, string(respData))
	}

	if out != nil {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			return fmt.Errorf("ошибка декодирования ответа: %w", err)
		}
	}
	return nil
}

// ============================================================
// Методы V2 API (Wails-биндинги)
// ============================================================

// 1. CreateChat — создание чата (POST /api/v2/chat)
func (a *App) CreateChat(req SaveChatRequest) (*SaveChatResponse, error) {
	var resp SaveChatResponse
	if err := a.doRequest(http.MethodPost, "/api/v2/chat", nil, req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 2. AddUsersToChat — добавление пользователей (POST /api/v2/chat/{chat_id}/members)
func (a *App) AddUsersToChat(chatID int64, req AddUserToChatRequest) (*AddUserToChatResponse, error) {
	path := fmt.Sprintf("/api/v2/chat/%d/members", chatID)
	var resp AddUserToChatResponse
	if err := a.doRequest(http.MethodPost, path, nil, req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 3. GetUserChats — чаты пользователя (GET /api/v2/chats?user_id=)
func (a *App) GetUserChats() (*GetUserChatsExtendedResponse, error) {
	var resp GetUserChatsExtendedResponse
	if err := a.doRequest(http.MethodGet, "/api/v2/chats", nil, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 4. GetChatMembers — участники чата (GET /api/v2/chats/{chat_id}/members)
func (a *App) GetChatMembers(chatID int64) (*GetChatMembersResponse, error) {
	path := fmt.Sprintf("/api/v2/chats/%d/members", chatID)
	var resp GetChatMembersResponse
	if err := a.doRequest(http.MethodGet, path, nil, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 5. GetChatMessages — сообщения чата с пагинацией (GET /api/v2/chats/{chat_id}/messages)
func (a *App) GetChatMessages(chatID int64, lastMessageID *int64, limit *int) (*GetChatMessagesResponse, error) {
	path := fmt.Sprintf("/api/v2/chats/%d/messages", chatID)
	query := url.Values{}
	if lastMessageID != nil {
		query.Set("last_message_id", strconv.FormatInt(*lastMessageID, 10))
	}
	if limit != nil {
		query.Set("limit", strconv.Itoa(*limit))
	}
	var resp GetChatMessagesResponse
	if err := a.doRequest(http.MethodGet, path, query, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 6. SendChatMessage — отправка сообщения через канал в WS writer-горутину
func (a *App) SendChatMessage(chatID int64, req SaveMessageRequest) error {
	wsMsg := map[string]interface{}{
		"message":   req.Message,
		"chat_id":   chatID,
		"sender_id": a.userID,
	}
	data, _ := json.Marshal(wsMsg)

	log.Printf("[WS SEND] userID=%d, chat_id=%d, message=%q", a.userID, chatID, req.Message)

	select {
	case a.wsSendCh <- data:
	default:
		log.Printf("[WS SEND] Канал переполнен, сообщение丢弃")
	}

	return nil
}

// 7. MarkMessagesAsRead — отметка о прочтении (PATCH /api/v2/chats/{chat_id}/messages/read-status)
func (a *App) MarkMessagesAsRead(chatID int64, req MarkMessagesAsReadRequest) error {
	path := fmt.Sprintf("/api/v2/chats/%d/messages/read-status", chatID)
	return a.doRequest(http.MethodPatch, path, nil, req, nil)
}

// 8. EditChatMessage — редактирование сообщения (PUT /api/v2/chats/{chat_id}/messages/{message_id})
func (a *App) EditChatMessage(chatID, messageID int64, req EditMessageRequest) error {
	path := fmt.Sprintf("/api/v2/chats/%d/messages/%d", chatID, messageID)
	return a.doRequest(http.MethodPut, path, nil, req, nil)
}

// 9. DeleteChatMessage — мягкое удаление сообщения (DELETE /api/v2/chats/{chat_id}/messages/{message_id})
func (a *App) DeleteChatMessage(chatID, messageID int64) error {
	path := fmt.Sprintf("/api/v2/chats/%d/messages/%d", chatID, messageID)
	return a.doRequest(http.MethodDelete, path, nil, nil, nil)
}

// 10. GetUserData — данные чужого пользователя (GET /api/v2/users?id=)
func (a *App) GetUserData(userID int64) (*GetUserResponse, error) {
	query := url.Values{"id": {strconv.FormatInt(userID, 10)}}
	var resp GetUserResponse
	if err := a.doRequest(http.MethodGet, "/api/v2/users", query, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 10a. GetSelfData — данные своего аккаунта (GET /api/v2/user/profile)
func (a *App) GetSelfData() (*GetUserResponse, error) {
	var resp GetUserResponse
	if err := a.doRequest(http.MethodGet, "/api/v2/user/profile", nil, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 11. RegisterUser — регистрация пользователя (POST /api/v2/auth/register)
func (a *App) RegisterUser(req SaveUserRequest) (*SaveUserResponse, error) {
	var resp SaveUserResponse
	if err := a.doRequest(http.MethodPost, "/api/v2/auth/register", nil, req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 12. GetUserID — получение ID пользователя по имени (GET /api/v2/user_id?username=)
func (a *App) GetUserID(username string) (*GetUserIDResponse, error) {
	query := url.Values{"username": {username}}
	var resp GetUserIDResponse
	if err := a.doRequest(http.MethodGet, "/api/v2/user_id", query, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 13. UploadAvatar — загрузка аватара (POST /api/v2/user/avatar?user_id=, multipart/form-data)
func (a *App) UploadAvatar(fileName string, fileData []byte) (*UploadAvatarResponse, error) {
	u, _ := url.Parse(a.serverAddr + "/api/v2/user/avatar")

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("new_user_avatar", fileName)
	if err != nil {
		return nil, fmt.Errorf("ошибка создания form-data: %w", err)
	}
	if _, err := fw.Write(fileData); err != nil {
		return nil, fmt.Errorf("ошибка записи файла в form-data: %w", err)
	}
	w.Close()

	req, err := http.NewRequestWithContext(a.ctx, http.MethodPost, u.String(), &buf)
	if err != nil {
		return nil, fmt.Errorf("ошибка создания запроса: %w", err)
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ошибка выполнения запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respData, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API вернул статус %d: %s", resp.StatusCode, string(respData))
	}

	var result UploadAvatarResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("ошибка декодирования ответа: %w", err)
	}
	return &result, nil
}

// 14. GetAvatar — получение бинарного потока аватара (GET /api/v2/user/avatar?id=)
func (a *App) GetAvatar(avatarID int64) ([]byte, error) {
	query := url.Values{"id": {strconv.FormatInt(avatarID, 10)}}
	u, _ := url.Parse(a.serverAddr + "/api/v2/user/avatar")
	u.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(a.ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("ошибка создания запроса: %w", err)
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ошибка выполнения запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API вернул статус %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// 15. GetAvatarBase64 — аватар в base64 (GET /api/v2/user/avatar?id=)
func (a *App) GetAvatarBase64(avatarID string) (string, error) {
	query := url.Values{"id": {avatarID}}
	u, _ := url.Parse(a.serverAddr + "/api/v2/user/avatar")
	u.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(a.ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "", fmt.Errorf("ошибка создания запроса: %w", err)
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ошибка выполнения запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API вернул статус %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("ошибка чтения ответа: %w", err)
	}

	return base64.StdEncoding.EncodeToString(data), nil
}

// ============================================================
// Компоновочные DTO — объединяют несколько вызовов API в один
// ============================================================

// ChatWithProfile — чат + профиль собеседника (для рендера списка чатов)
type ChatWithProfile struct {
	Chat    ChatExtendedDTO  `json:"chat"`
	Profile *GetUserResponse `json:"profile,omitempty"`
}

// ChatsWithProfilesResponse — ответ GetChatsWithProfiles
type ChatsWithProfilesResponse struct {
	Chats []ChatWithProfile `json:"chats"`
}

// ChatHistoryResponse — история чата + профили отправителей (для рендера окна чата)
type ChatHistoryResponse struct {
	Messages []MessageDTO              `json:"messages"`
	Profiles map[string]*GetUserResponse `json:"profiles"`
}

// ============================================================
// Компоновочные методы — вся оркестрация сетевых вызовов в Go
// ============================================================

// FindOrCreateChat — поиск пользователя по имени + создание чата за один вызов.
func (a *App) FindOrCreateChat(query string) (*SaveChatResponse, error) {
	// Шаг 1: находим ID пользователя по имени
	uidResp, err := a.GetUserID(query)
	if err != nil {
		return nil, fmt.Errorf("пользователь %q не найден: %w", query, err)
	}

	// Шаг 2: создаём чат (author = текущий пользователь, target_user = найденный)
	createReq := SaveChatRequest{
		Author:     a.userID,
		ChatName:   query,
		TargetUser: int64(uidResp.UserID),
	}
	chatResp, err := a.CreateChat(createReq)
	if err != nil {
		return nil, fmt.Errorf("не удалось создать чат: %w", err)
	}
	return chatResp, nil
}

// GetChatsWithProfiles — список чатов с подResolution профилей собеседников.
// Возвращает готовые данные для рендера сайдбара.
func (a *App) GetChatsWithProfiles() (*ChatsWithProfilesResponse, error) {
	chatsResp, err := a.GetUserChats()
	if err != nil {
		return nil, err
	}

	result := make([]ChatWithProfile, 0, len(chatsResp.Chats))
	for _, chat := range chatsResp.Chats {
		cwp := ChatWithProfile{Chat: chat}

		// Пытаемся найти профиль собеседника по имени чата
		if chat.Name != "" {
			if uidResp, err := a.GetUserID(chat.Name); err == nil {
				if profile, err := a.GetUserData(int64(uidResp.UserID)); err == nil {
					cwp.Profile = profile
				}
			}
		}

		result = append(result, cwp)
	}

	return &ChatsWithProfilesResponse{Chats: result}, nil
}

// GetChatHistory — полная история чата с профилями отправителей + автопометка прочтения.
// Возвращает готовые данные для рендера окна чата.
func (a *App) GetChatHistory(chatID int64, lastMessageID *int64, limit *int) (*ChatHistoryResponse, error) {
	// Шаг 1: загружаем сообщения
	msgResp, err := a.GetChatMessages(chatID, lastMessageID, limit)
	if err != nil {
		return nil, err
	}

	// Шаг 2: собираем уникальные ID отправителей и подтягиваем их профили
	profiles := make(map[string]*GetUserResponse)
	seen := make(map[int]bool)
	for _, msg := range msgResp.Messages {
		if !seen[msg.SenderID] {
			seen[msg.SenderID] = true
			sid := int64(msg.SenderID)
			var profile *GetUserResponse
			if int64(msg.SenderID) == a.userID {
				profile, err = a.GetSelfData()
			} else {
				profile, err = a.GetUserData(sid)
			}
			if err == nil {
				profiles[strconv.Itoa(msg.SenderID)] = profile
			}
		}
	}

	// Шаг 3: помечаем сообщения прочитанными
	if len(msgResp.Messages) > 0 {
		maxID := 0
		for _, msg := range msgResp.Messages {
			if msg.ID > maxID {
				maxID = msg.ID
			}
		}
		if maxID > 0 {
			_ = a.MarkMessagesAsRead(chatID, MarkMessagesAsReadRequest{LastReadMessageID: maxID})
		}
	}

	return &ChatHistoryResponse{
		Messages: msgResp.Messages,
		Profiles: profiles,
	}, nil
}

// ============================================================
// Логика входа + запуск WebSocket
// ============================================================

// Login реализует идемпотентный вход и запускает WebSocket-соединение
func (a *App) Login(username, password string) (*GetUserResponse, error) {
	var resp GetUserResponse
	body := map[string]string{"username": username, "password": password}
	if err := a.doRequest(http.MethodPost, "/api/v2/auth/login", nil, body, &resp); err != nil {
		return nil, fmt.Errorf("ошибка входа: %w", err)
	}

	a.userID = int64(resp.ID)
	go a.startWS()
	return &resp, nil
}

func (a *App) Register(username, password string) (*GetUserResponse, error) {
	reg, err := a.RegisterUser(SaveUserRequest{Username: username, Password: password})
	if err != nil {
		return nil, err
	}
	a.userID = int64(reg.ID)
	go a.startWS()
	return &GetUserResponse{ID: reg.ID, Username: reg.Username, AvatarID: reg.AvatarID, Reg: reg.Reg}, nil
}

func (a *App) Logout() error {
	return a.doRequest(http.MethodPost, "/api/v2/auth/logout", nil, nil, nil)
}
