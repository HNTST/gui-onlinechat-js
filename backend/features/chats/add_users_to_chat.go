package chats

import (
	"fmt"

	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// AddUsersToChat — добавление пользователей (POST /api/v2/chat/{chat_id}/members).
func (f *Chats) AddUsersToChat(chatID int64, req dto.AddUserToChatRequest) (*dto.AddUserToChatResponse, error) {
	log := logger.For("chats", "AddUsersToChat")

	path := fmt.Sprintf("/api/v2/chat/%d/members", chatID)
	var resp dto.AddUserToChatResponse
	if err := f.core.DoRequest("POST", path, nil, req, &resp); err != nil {
		log.Error("ошибка добавления пользователей", err, "chatID", chatID)
		return nil, errs.Wrapf(errs.CodeHTTP, "chats.AddUsersToChat", err, "не удалось добавить пользователей в чат %d", chatID)
	}
	return &resp, nil
}
