package chats

import (
	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// CreateChat — создание чата (POST /api/v2/chat).
func (f *Chats) CreateChat(req dto.SaveChatRequest) (*dto.SaveChatResponse, error) {
	log := logger.For("chats", "CreateChat")

	var resp dto.SaveChatResponse
	if err := f.core.DoRequest("POST", "/api/v2/chat", nil, req, &resp); err != nil {
		log.Error("ошибка создания чата", err)
		return nil, errs.Wrapf(errs.CodeHTTP, "chats.CreateChat", err, "не удалось создать чат")
	}
	return &resp, nil
}
