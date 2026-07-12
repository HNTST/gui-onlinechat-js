package chats

import (
	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// GetUserChats — чаты пользователя (GET /api/v2/chats).
func (f *Chats) GetUserChats() (*dto.GetUserChatsExtendedResponse, error) {
	log := logger.For("chats", "GetUserChats")

	var resp dto.GetUserChatsExtendedResponse
	if err := f.core.DoRequest("GET", "/api/v2/chats", nil, nil, &resp); err != nil {
		log.Error("ошибка получения чатов", err)
		return nil, errs.Wrapf(errs.CodeHTTP, "chats.GetUserChats", err, "не удалось получить список чатов")
	}
	return &resp, nil
}
