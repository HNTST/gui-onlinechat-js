package chats

import (
	"fmt"

	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// EditChatMessage — редактирование сообщения (PUT /api/v2/chats/{chat_id}/messages/{message_id}).
func (f *Chats) EditChatMessage(chatID, messageID int64, req dto.EditMessageRequest) error {
	log := logger.For("chats", "EditChatMessage")

	path := fmt.Sprintf("/api/v2/chats/%d/messages/%d", chatID, messageID)
	if err := f.core.DoRequest("PUT", path, nil, req, nil); err != nil {
		log.Error("ошибка редактирования", err, "chatID", chatID, "messageID", messageID)
		return errs.Wrapf(errs.CodeHTTP, "chats.EditChatMessage", err, "не удалось отредактировать сообщение %d", messageID)
	}
	return nil
}
