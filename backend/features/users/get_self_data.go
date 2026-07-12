package users

import (
	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// GetSelfData — данные своего аккаунта (GET /api/v2/user/profile).
func (f *Users) GetSelfData() (*dto.GetUserResponse, error) {
	log := logger.For("users", "GetSelfData")

	var resp dto.GetUserResponse
	if err := f.core.DoRequest("GET", "/api/v2/user/profile", nil, nil, &resp); err != nil {
		log.Error("ошибка получения профиля", err)
		return nil, errs.Wrapf(errs.CodeHTTP, "users.GetSelfData", err, "не удалось получить данные профиля")
	}
	return &resp, nil
}
