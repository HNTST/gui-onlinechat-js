package chats

import (
	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// FindOrCreateChat — поиск пользователя по имени + создание чата.
func (f *Chats) FindOrCreateChat(query string) (*dto.SaveChatResponse, error) {
	log := logger.For("chats", "FindOrCreateChat")
	log.Debug("поиск или создание чата", "query", query)

	uid, err := f.resolveUID(query)
	if err != nil {
		log.Error("пользователь не найден", err, "query", query)
		return nil, errs.Wrapf(errs.CodeNotFound, "chats.FindOrCreateChat", err, "пользователь %q не найден", query)
	}

	createReq := dto.SaveChatRequest{
		Author:     f.core.UserID,
		ChatName:   query,
		TargetUser: uid,
	}
	chatResp, err := f.CreateChat(createReq)
	if err != nil {
		log.Error("не удалось создать чат", err, "query", query)
		return nil, errs.Wrapf(errs.CodeHTTP, "chats.FindOrCreateChat", err, "не удалось создать чат с %q", query)
	}
	log.Info("чат создан", "chatID", chatResp.ChatID)
	return chatResp, nil
}
