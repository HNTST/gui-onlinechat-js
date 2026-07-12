package chats

import (
	"gui-onlinechat/backend/core/dto"
)

// SendChatMessage — отправка сообщения через WS.
func (f *Chats) SendChatMessage(chatID int64, req dto.SaveMessageRequest) error {
	return f.ws.Send(map[string]interface{}{
		"message":   req.Message,
		"chat_id":   chatID,
		"sender_id": f.core.UserID,
	})
}
