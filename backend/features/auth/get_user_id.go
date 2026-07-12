package auth

import (
	"net/http"
	"net/url"

	"gui-onlinechat/backend/core/dto"
)

// GetUserID — получение ID пользователя по имени (GET /api/v2/user_id).
func (f *Auth) GetUserID(username string) (*dto.GetUserIDResponse, error) {
	query := url.Values{"username": {username}}
	var resp dto.GetUserIDResponse
	if err := f.core.DoRequest(http.MethodGet, "/api/v2/user_id", query, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
