package chats

import (
	"net/http"

	"gui-onlinechat/backend/core/dto"
)

// CreateChat — создание чата (POST /api/v2/chat).
func (f *Chats) CreateChat(req dto.SaveChatRequest) (*dto.SaveChatResponse, error) {
	var resp dto.SaveChatResponse
	if err := f.core.DoRequest(http.MethodPost, "/api/v2/chat", nil, req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
