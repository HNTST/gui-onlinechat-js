package chats

import (
	"fmt"

	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// MarkMessagesAsRead — отметка о прочтении (PATCH /api/v2/chats/{chat_id}/messages/read-status).
func (f *Chats) MarkMessagesAsRead(chatID int64, req dto.MarkMessagesAsReadRequest) error {
	log := logger.For("chats", "MarkMessagesAsRead")

	path := fmt.Sprintf("/api/v2/chats/%d/messages/read-status", chatID)
	if err := f.core.DoRequest("PATCH", path, nil, req, nil); err != nil {
		log.Error("ошибка пометки прочтения", err, "chatID", chatID)
		return errs.Wrapf(errs.CodeHTTP, "chats.MarkMessagesAsRead", err, "не удалось пометить сообщения чата %d как прочитанные", chatID)
	}
	return nil
}
