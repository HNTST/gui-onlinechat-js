package auth

import (
	"net/http"

	"gui-onlinechat/backend/core/dto"
)

// Register — регистрация нового пользователя + запуск WebSocket.
func (f *Auth) Register(username, password string) (*dto.GetUserResponse, error) {
	reg, err := f.RegisterUser(dto.SaveUserRequest{Username: username, Password: password})
	if err != nil {
		return nil, err
	}
	f.core.UserID = int64(reg.ID)
	f.ws.SetUserID(int64(reg.ID))
	go f.ws.Start(f.core.Ctx.(interface{ Emit(string, ...interface{}) }))
	return &dto.GetUserResponse{ID: reg.ID, Username: reg.Username, AvatarID: reg.AvatarID, Reg: reg.Reg}, nil
}

// RegisterUser — регистрация пользователя (POST /api/v2/auth/register).
func (f *Auth) RegisterUser(req dto.SaveUserRequest) (*dto.SaveUserResponse, error) {
	var resp dto.SaveUserResponse
	if err := f.core.DoRequest(http.MethodPost, "/api/v2/auth/register", nil, req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
