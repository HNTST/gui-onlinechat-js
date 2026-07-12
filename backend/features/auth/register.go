package auth

import (
	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// Register — регистрация нового пользователя + запуск WebSocket.
func (f *Auth) Register(username, password string) (*dto.GetUserResponse, error) {
	log := logger.For("auth", "Register")
	log.Debug("регистрация", "username", username)

	reg, err := f.RegisterUser(dto.SaveUserRequest{Username: username, Password: password})
	if err != nil {
		log.Error("ошибка регистрации", err)
		return nil, errs.Wrapf(errs.CodeHTTP, "auth.Register", err, "ошибка регистрации")
	}

	f.core.UserID = int64(reg.ID)
	f.ws.SetUserID(int64(reg.ID))
	go f.ws.Start()
	log.Info("регистрация выполнена", "userID", reg.ID)
	return &dto.GetUserResponse{ID: reg.ID, Username: reg.Username, AvatarID: reg.AvatarID, Reg: reg.Reg}, nil
}

// RegisterUser — регистрация пользователя (POST /api/v2/auth/register).
func (f *Auth) RegisterUser(req dto.SaveUserRequest) (*dto.SaveUserResponse, error) {
	log := logger.For("auth", "RegisterUser")

	var resp dto.SaveUserResponse
	if err := f.core.DoRequest("POST", "/api/v2/auth/register", nil, req, &resp); err != nil {
		log.Error("ошибка запроса", err)
		return nil, errs.Wrapf(errs.CodeHTTP, "auth.RegisterUser", err, "ошибка регистрации")
	}
	return &resp, nil
}
