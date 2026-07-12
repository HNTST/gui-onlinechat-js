package users

import (
	"net/http"

	"gui-onlinechat/backend/core/dto"
)

// GetSelfData — данные своего аккаунта (GET /api/v2/user/profile).
func (f *Users) GetSelfData() (*dto.GetUserResponse, error) {
	var resp dto.GetUserResponse
	if err := f.core.DoRequest(http.MethodGet, "/api/v2/user/profile", nil, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
