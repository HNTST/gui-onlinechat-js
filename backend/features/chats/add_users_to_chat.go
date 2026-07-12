package chats

import (
	"fmt"
	"net/http"

	"gui-onlinechat/backend/core/dto"
)

// AddUsersToChat — добавление пользователей (POST /api/v2/chat/{chat_id}/members).
func (f *Chats) AddUsersToChat(chatID int64, req dto.AddUserToChatRequest) (*dto.AddUserToChatResponse, error) {
	path := fmt.Sprintf("/api/v2/chat/%d/members", chatID)
	var resp dto.AddUserToChatResponse
	if err := f.core.DoRequest(http.MethodPost, path, nil, req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
