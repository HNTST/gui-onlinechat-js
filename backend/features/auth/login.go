package auth

import (
	"fmt"
	"net/http"

	"gui-onlinechat/backend/core/dto"
)

// Login — идемпотентный вход + запуск WebSocket.
func (f *Auth) Login(username, password string) (*dto.GetUserResponse, error) {
	var resp dto.GetUserResponse
	body := map[string]string{"username": username, "password": password}
	if err := f.core.DoRequest(http.MethodPost, "/api/v2/auth/login", nil, body, &resp); err != nil {
		return nil, fmt.Errorf("ошибка входа: %w", err)
	}

	f.core.UserID = int64(resp.ID)
	f.ws.SetUserID(int64(resp.ID))
	go f.ws.Start(f.core.Ctx.(interface{ Emit(string, ...interface{}) }))
	return &resp, nil
}
