package users

import (
	"net/http"
	"net/url"
	"strconv"

	"gui-onlinechat/backend/core/dto"
)

// GetUserData — данные чужого пользователя (GET /api/v2/users?id=).
func (f *Users) GetUserData(userID int64) (*dto.GetUserResponse, error) {
	query := url.Values{"id": {strconv.FormatInt(userID, 10)}}
	var resp dto.GetUserResponse
	if err := f.core.DoRequest(http.MethodGet, "/api/v2/users", query, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
