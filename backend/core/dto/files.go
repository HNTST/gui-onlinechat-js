package dto

// ============================================================
// Files DTO
// ============================================================

// UploadAvatarResponse — ответ POST /api/v2/user/avatar.
type UploadAvatarResponse struct {
	FileID int `json:"file_id"`
}
