package chats

import (
	"fmt"
	"net/http"

	"gui-onlinechat/backend/core/dto"
)

// GetChatMembers — участники чата (GET /api/v2/chats/{chat_id}/members).
func (f *Chats) GetChatMembers(chatID int64) (*dto.GetChatMembersResponse, error) {
	path := fmt.Sprintf("/api/v2/chats/%d/members", chatID)
	var resp dto.GetChatMembersResponse
	if err := f.core.DoRequest(http.MethodGet, path, nil, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
