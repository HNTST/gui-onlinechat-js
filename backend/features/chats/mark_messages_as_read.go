package chats

import (
	"fmt"
	"net/http"

	"gui-onlinechat/backend/core/dto"
)

// MarkMessagesAsRead — отметка о прочтении (PATCH /api/v2/chats/{chat_id}/messages/read-status).
func (f *Chats) MarkMessagesAsRead(chatID int64, req dto.MarkMessagesAsReadRequest) error {
	path := fmt.Sprintf("/api/v2/chats/%d/messages/read-status", chatID)
	return f.core.DoRequest(http.MethodPatch, path, nil, req, nil)
}
