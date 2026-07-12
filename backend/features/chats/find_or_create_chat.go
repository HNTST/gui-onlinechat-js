package chats

import (
	"fmt"

	"gui-onlinechat/backend/core/dto"
)

// FindOrCreateChat — поиск пользователя по имени + создание чата за один вызов.
func (f *Chats) FindOrCreateChat(query string) (*dto.SaveChatResponse, error) {
	uid, err := f.resolveUID(query)
	if err != nil {
		return nil, fmt.Errorf("пользователь %q не найден: %w", query, err)
	}

	createReq := dto.SaveChatRequest{
		Author:     f.core.UserID,
		ChatName:   query,
		TargetUser: uid,
	}
	chatResp, err := f.CreateChat(createReq)
	if err != nil {
		return nil, fmt.Errorf("не удалось создать чат: %w", err)
	}
	return chatResp, nil
}
