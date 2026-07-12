package users

import (
	"net/url"
	"strconv"

	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// GetUserData — данные чужого пользователя (GET /api/v2/users?id=).
func (f *Users) GetUserData(userID int64) (*dto.GetUserResponse, error) {
	log := logger.For("users", "GetUserData")

	query := url.Values{"id": {strconv.FormatInt(userID, 10)}}
	var resp dto.GetUserResponse
	if err := f.core.DoRequest("GET", "/api/v2/users", query, nil, &resp); err != nil {
		log.Error("ошибка получения данных", err, "userID", userID)
		return nil, errs.Wrapf(errs.CodeHTTP, "users.GetUserData", err, "не удалось получить данные пользователя %d", userID)
	}
	return &resp, nil
}
