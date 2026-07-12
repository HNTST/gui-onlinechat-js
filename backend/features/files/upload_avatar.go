package files

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"

	"gui-onlinechat/backend/core/dto"
)

// UploadAvatar — загрузка аватара (POST /api/v2/user/avatar, multipart/form-data).
func (f *Files) UploadAvatar(fileName string, fileData []byte) (*dto.UploadAvatarResponse, error) {
	u, _ := url.Parse(f.core.ServerAddr + "/api/v2/user/avatar")

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("new_user_avatar", fileName)
	if err != nil {
		return nil, fmt.Errorf("ошибка создания form-data: %w", err)
	}
	if _, err := fw.Write(fileData); err != nil {
		return nil, fmt.Errorf("ошибка записи файла в form-data: %w", err)
	}
	w.Close()

	req, err := http.NewRequestWithContext(f.core.Ctx, http.MethodPost, u.String(), &buf)
	if err != nil {
		return nil, fmt.Errorf("ошибка создания запроса: %w", err)
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := f.core.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ошибка выполнения запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respData, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API вернул статус %d: %s", resp.StatusCode, string(respData))
	}

	var result dto.UploadAvatarResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("ошибка декодирования ответа: %w", err)
	}
	return &result, nil
}
