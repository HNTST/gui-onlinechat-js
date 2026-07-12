package chats

import (
	"net/http"

	"gui-onlinechat/backend/core/dto"
)

// GetUserChats — чаты пользователя (GET /api/v2/chats).
func (f *Chats) GetUserChats() (*dto.GetUserChatsExtendedResponse, error) {
	var resp dto.GetUserChatsExtendedResponse
	if err := f.core.DoRequest(http.MethodGet, "/api/v2/chats", nil, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
