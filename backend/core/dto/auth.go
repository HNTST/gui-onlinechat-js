package dto

// ============================================================
// Auth DTO
// ============================================================

// SaveUserRequest — тело POST /api/v2/user и POST /api/v2/auth/register.
type SaveUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password,omitempty"`
}

// SaveUserResponse — ответ POST /api/v2/user и POST /api/v2/auth/register.
type SaveUserResponse struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	AvatarID *int   `json:"avatar_id,omitempty"`
	Reg      string `json:"reg,omitempty"`
}

// GetUserIDResponse — ответ GET /api/v2/user_id.
type GetUserIDResponse struct {
	UserID int `json:"user_id"`
}
