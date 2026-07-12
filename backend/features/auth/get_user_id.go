package auth

import (
	"net/url"

	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// GetUserID — получение ID пользователя по имени (GET /api/v2/user_id).
func (f *Auth) GetUserID(username string) (*dto.GetUserIDResponse, error) {
	log := logger.For("auth", "GetUserID")

	query := url.Values{"username": {username}}
	var resp dto.GetUserIDResponse
	if err := f.core.DoRequest("GET", "/api/v2/user_id", query, nil, &resp); err != nil {
		log.Error("пользователь не найден", err, "username", username)
		return nil, errs.Wrapf(errs.CodeNotFound, "auth.GetUserID", err, "пользователь %q не найден", username)
	}
	return &resp, nil
}
