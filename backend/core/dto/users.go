package dto

// ============================================================
// Users DTO
// ============================================================

// GetUserResponse — ответ GET /api/v2/user, GET /api/v2/users, GET /api/v2/user/profile.
type GetUserResponse struct {
	ID       int     `json:"id"`
	Username string  `json:"username"`
	AvatarID *int    `json:"avatar_id,omitempty"`
	Reg      string  `json:"reg,omitempty"`
	LastSeen *string `json:"last_seen,omitempty"`
}
