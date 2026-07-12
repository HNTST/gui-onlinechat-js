package auth

import (
	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// Login — идемпотентный вход + запуск WebSocket.
func (f *Auth) Login(username, password string) (*dto.GetUserResponse, error) {
	log := logger.For("auth", "Login")
	log.Debug("выполняется вход", "username", username)

	var resp dto.GetUserResponse
	body := map[string]string{"username": username, "password": password}
	if err := f.core.DoRequest("POST", "/api/v2/auth/login", nil, body, &resp); err != nil {
		log.Error("ошибка входа", err)
		return nil, errs.Wrapf(errs.CodeHTTP, "auth.Login", err, "ошибка входа")
	}

	f.core.UserID = int64(resp.ID)
	f.ws.SetUserID(int64(resp.ID))
	go f.ws.Start()
	log.Info("вход выполнен", "userID", resp.ID)
	return &resp, nil
}
