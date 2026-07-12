package dto

// ============================================================
// Chat DTO
// ============================================================

// SaveChatRequest — тело POST /api/v2/chat.
type SaveChatRequest struct {
	Author     int64  `json:"author"`
	ChatName   string `json:"chat_name"`
	TargetUser int64  `json:"target_user"`
	IsGroup    *bool  `json:"is_group,omitempty"`
}

// SaveChatResponse — ответ POST /api/v2/chat.
type SaveChatResponse struct {
	ChatID int64 `json:"chat_id"`
}

// AddUserToChatRequest — тело POST /api/v2/chat/{chat_id}/members.
type AddUserToChatRequest struct {
	UsersIDs []int `json:"users_ids"`
}

// AddUserToChatResponse — ответ POST /api/v2/chat/{chat_id}/members.
type AddUserToChatResponse struct {
	ChatID   int64   `json:"chat_id"`
	UsersIDs []int64 `json:"users_ids"`
}

// LastMessageDTO — последнее сообщение в чате.
type LastMessageDTO struct {
	ID       int    `json:"id"`
	Text     string `json:"text"`
	SenderID int    `json:"sender_id"`
	SentAt   string `json:"sent_at"`
	IsRead   bool   `json:"is_read"`
}

// ChatExtendedDTO — расширенная информация о чате.
type ChatExtendedDTO struct {
	ID          int             `json:"id"`
	Name        string          `json:"name"`
	UnreadCount int             `json:"unread_count"`
	LastMessage *LastMessageDTO `json:"last_message,omitempty"`
}

// GetUserChatsExtendedResponse — ответ GET /api/v2/chats.
type GetUserChatsExtendedResponse struct {
	Chats []ChatExtendedDTO `json:"chats"`
}

// GetChatMembersResponse — ответ GET /api/v2/chats/{chat_id}/members.
type GetChatMembersResponse struct {
	Members []int `json:"members"`
}

// ============================================================
// Message DTO
// ============================================================

// MessageDTO — сообщение чата.
type MessageDTO struct {
	ID        int    `json:"id"`
	Message   string `json:"message"`
	SenderID  int    `json:"sender_id"`
	SentAt    string `json:"sent_at"`
	IsRead    bool   `json:"is_read"`
	IsEdited  bool   `json:"is_edited"`
	IsDeleted bool   `json:"is_deleted"`
}

// GetChatMessagesResponse — ответ GET /api/v2/chats/{chat_id}/messages.
type GetChatMessagesResponse struct {
	Messages []MessageDTO `json:"messages"`
}

// SaveMessageRequest — тело отправки сообщения через WS.
type SaveMessageRequest struct {
	Message string `json:"message"`
}

// MarkMessagesAsReadRequest — тело PATCH /api/v2/chats/{chat_id}/messages/read-status.
type MarkMessagesAsReadRequest struct {
	LastReadMessageID int `json:"last_read_message_id"`
}

// EditMessageRequest — тело PUT /api/v2/chats/{chat_id}/messages/{message_id}.
type EditMessageRequest struct {
	Text string `json:"text"`
}

// ============================================================
// Composite DTO (orchestration)
// ============================================================

// ChatWithProfile — чат + профиль собеседника.
type ChatWithProfile struct {
	Chat    ChatExtendedDTO  `json:"chat"`
	Profile *GetUserResponse `json:"profile,omitempty"`
}

// ChatsWithProfilesResponse — ответ GetChatsWithProfiles.
type ChatsWithProfilesResponse struct {
	Chats []ChatWithProfile `json:"chats"`
}

// ChatHistoryResponse — история чата + профили отправителей.
type ChatHistoryResponse struct {
	Messages []MessageDTO                `json:"messages"`
	Profiles map[string]*GetUserResponse `json:"profiles"`
}
