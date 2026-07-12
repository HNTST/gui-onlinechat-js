package chats

import (
	"fmt"

	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// GetChatMembers — участники чата (GET /api/v2/chats/{chat_id}/members).
func (f *Chats) GetChatMembers(chatID int64) (*dto.GetChatMembersResponse, error) {
	log := logger.For("chats", "GetChatMembers")

	path := fmt.Sprintf("/api/v2/chats/%d/members", chatID)
	var resp dto.GetChatMembersResponse
	if err := f.core.DoRequest("GET", path, nil, nil, &resp); err != nil {
		log.Error("ошибка получения участников", err, "chatID", chatID)
		return nil, errs.Wrapf(errs.CodeHTTP, "chats.GetChatMembers", err, "не удалось получить участников чата %d", chatID)
	}
	return &resp, nil
}
