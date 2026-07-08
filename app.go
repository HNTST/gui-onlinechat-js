package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"sync"
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
	shuttingDown bool
	userID       int64
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		serverAddr: "https://hntgolang.duckdns.org",
		httpClient: &http.Client{},
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
func (a *App) connectWS(userID int64) error {
	serverURL, _ := url.Parse(a.serverAddr)
	wsURL := url.URL{
		Scheme: "wss",
		Host:   serverURL.Host,
		Path:   "/api/v2/ws",
		RawQuery: url.Values{
			"user_id": {strconv.FormatInt(userID, 10)},
		}.Encode(),
	}

	log.Printf("[WS] Подключение к %s", wsURL.String())

	conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), nil)
	if err != nil {
		return fmt.Errorf("WebSocket dial error: %w", err)
	}

	a.wsMu.Lock()
	a.wsConn = conn
	a.wsMu.Unlock()

	log.Printf("[WS] Успешное подключение к %s", wsURL.Host+wsURL.Path)
	return nil
}

// wsReadLoop — бесконечный цикл чтения сообщений из WebSocket
func (a *App) wsReadLoop() {
	a.wsMu.Lock()
	conn := a.wsConn
	a.wsMu.Unlock()

	if conn == nil {
		log.Printf("[WS] Нет активного соединения для чтения")
		return
	}

	defer func() {
		log.Printf("[WS] Цикл чтения завершён, очистка...")
		a.closeWS()
		if !a.shuttingDown {
			a.reconnect()
		}
	}()

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[WS ERROR] Ошибка чтения: %v", err)
			return
		}
		log.Printf("[WS RECEIVED] %s", string(data))
		runtime.EventsEmit(a.ctx, "new_message", string(data))
	}
}

// reconnect — переподключение с таймаутом после разрыва соединения
func (a *App) reconnect() {
	for {
		if a.shuttingDown {
			log.Printf("[WS] Выход — пропускаем переподключение")
			return
		}
		log.Printf("[WS] Переподключение через 3 секунды...")
		time.Sleep(3 * time.Second)
		if a.shuttingDown {
			log.Printf("[WS] Выход — пропускаем переподключение")
			return
		}
		if err := a.connectWS(a.userID); err != nil {
			log.Printf("[WS] Ошибка переподключения: %v", err)
			continue
		}
		log.Printf("[WS] Переподключение успешно, запуск цикла чтения")
		a.wsReadLoop()
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

// SaveChatRequest — тело POST /api/v2/chat
type SaveChatRequest struct {
	Author     int64  `json:"author"`
	ChatName   string `json:"chat_name"`
	TargetUser int64  `json:"target_user"`
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
	LastMessage *LastMessageDTO `json:"last_message"`
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
	Message  string `json:"message"`
	SenderID int    `json:"sender_id"`
	ChatID   int64  `json:"chat_id"`
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
	AvatarID int    `json:"avatar_id"`
	Reg      string `json:"reg"`
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
	AvatarID int    `json:"avatar_id"`
	Reg      string `json:"reg"`
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
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(a.ctx, method, u.String(), reqBody)
	if err != nil {
		return fmt.Errorf("ошибка создания запроса: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("ошибка выполнения запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respData, _ := io.ReadAll(resp.Body)
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
func (a *App) GetUserChats(userID int64) (*GetUserChatsExtendedResponse, error) {
	query := url.Values{"user_id": {strconv.FormatInt(userID, 10)}}
	var resp GetUserChatsExtendedResponse
	if err := a.doRequest(http.MethodGet, "/api/v2/chats", query, nil, &resp); err != nil {
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

// 6. SendChatMessage — отправка сообщения через HTTP POST + WS для broadcast
func (a *App) SendChatMessage(chatID int64, req SaveMessageRequest) error {
	a.wsMu.Lock()
	conn := a.wsConn
	a.wsMu.Unlock()

	if conn != nil {
		wsMsg := map[string]interface{}{
			"message":   req.Message,
			"chat_id":   chatID,
			"sender_id": req.SenderID,
		}
		data, _ := json.Marshal(wsMsg)
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("[Go Send WS WARN] Ошибка записи в WS: %v", err)
		}
	}

	return nil
}

// 7. MarkMessagesAsRead — отметка о прочтении (PATCH /api/v2/chats/{chat_id}/messages/read-status)
func (a *App) MarkMessagesAsRead(chatID, userID int64, req MarkMessagesAsReadRequest) error {
	path := fmt.Sprintf("/api/v2/chats/%d/messages/read-status", chatID)
	query := url.Values{"user_id": {strconv.FormatInt(userID, 10)}}
	return a.doRequest(http.MethodPatch, path, query, req, nil)
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

// 10. GetUserData — данные пользователя (GET /api/v2/user?user_id=)
func (a *App) GetUserData(userID int64) (*GetUserResponse, error) {
	query := url.Values{"user_id": {strconv.FormatInt(userID, 10)}}
	var resp GetUserResponse
	if err := a.doRequest(http.MethodGet, "/api/v2/user", query, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// 11. RegisterUser — регистрация пользователя (POST /api/v2/user)
func (a *App) RegisterUser(req SaveUserRequest) (*SaveUserResponse, error) {
	var resp SaveUserResponse
	if err := a.doRequest(http.MethodPost, "/api/v2/user", nil, req, &resp); err != nil {
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
func (a *App) UploadAvatar(userID int64, fileName string, fileData []byte) (*UploadAvatarResponse, error) {
	query := url.Values{"user_id": {strconv.FormatInt(userID, 10)}}
	u, _ := url.Parse(a.serverAddr + "/api/v2/user/avatar")
	u.RawQuery = query.Encode()

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

// ============================================================
// Логика входа + запуск WebSocket
// ============================================================

// Login реализует идемпотентный вход и запускает WebSocket-соединение
func (a *App) Login(username string) (*GetUserResponse, error) {
	idResp, err := a.GetUserID(username)
	if err == nil {
		userData, err := a.GetUserData(int64(idResp.UserID))
		if err != nil {
			return nil, fmt.Errorf("ошибка получения данных пользователя: %w", err)
		}
		a.userID = int64(userData.ID)
		go a.startWS()
		return userData, nil
	}

	regResp, err := a.RegisterUser(SaveUserRequest{Username: username})
	if err != nil {
		return nil, fmt.Errorf("регистрация не удалась: %w", err)
	}

	userData, err := a.GetUserData(int64(regResp.ID))
	if err != nil {
		return nil, fmt.Errorf("ошибка получения данных нового пользователя: %w", err)
	}

	a.userID = int64(userData.ID)
	go a.startWS()
	return userData, nil
}

// startWS — запускает подключение к WS и цикл чтения в горутине
func (a *App) startWS() {
	if err := a.connectWS(a.userID); err != nil {
		log.Printf("[WS] Начальное подключение не удалось: %v", err)
		a.reconnect()
		return
	}
	a.wsReadLoop()
}
