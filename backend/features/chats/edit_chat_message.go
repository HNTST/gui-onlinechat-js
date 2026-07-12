package chats

import (
	"fmt"
	"net/http"

	"gui-onlinechat/backend/core/dto"
)

// EditChatMessage — редактирование сообщения (PUT /api/v2/chats/{chat_id}/messages/{message_id}).
func (f *Chats) EditChatMessage(chatID, messageID int64, req dto.EditMessageRequest) error {
	path := fmt.Sprintf("/api/v2/chats/%d/messages/%d", chatID, messageID)
	return f.core.DoRequest(http.MethodPut, path, nil, req, nil)
}
