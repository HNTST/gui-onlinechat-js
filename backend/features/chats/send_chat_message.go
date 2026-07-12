package chats

import (
	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// SendChatMessage — отправка сообщения через WS.
func (f *Chats) SendChatMessage(chatID int64, req dto.SaveMessageRequest) error {
	log := logger.For("chats", "SendChatMessage")

	if err := f.ws.Send(map[string]interface{}{
		"message":   req.Message,
		"chat_id":   chatID,
		"sender_id": f.core.UserID,
	}); err != nil {
		log.Error("ошибка отправки сообщения", err, "chatID", chatID)
		return errs.Wrapf(errs.CodeInternal, "chats.SendChatMessage", err, "не удалось отправить сообщение")
	}
	return nil
}
