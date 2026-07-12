package chats

import (
	"fmt"

	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// DeleteChatMessage — мягкое удаление сообщения (DELETE /api/v2/chats/{chat_id}/messages/{message_id}).
func (f *Chats) DeleteChatMessage(chatID, messageID int64) error {
	log := logger.For("chats", "DeleteChatMessage")

	path := fmt.Sprintf("/api/v2/chats/%d/messages/%d", chatID, messageID)
	if err := f.core.DoRequest("DELETE", path, nil, nil, nil); err != nil {
		log.Error("ошибка удаления", err, "chatID", chatID, "messageID", messageID)
		return errs.Wrapf(errs.CodeHTTP, "chats.DeleteChatMessage", err, "не удалось удалить сообщение %d", messageID)
	}
	return nil
}
