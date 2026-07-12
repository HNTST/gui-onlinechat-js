package files

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"

	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// UploadAvatar — загрузка аватара (POST /api/v2/user/avatar, multipart/form-data).
func (f *Files) UploadAvatar(fileName string, fileData []byte) (*dto.UploadAvatarResponse, error) {
	log := logger.For("files", "UploadAvatar")
	log.Debug("загрузка аватара", "fileName", fileName)

	u, _ := url.Parse(f.core.ServerAddr + "/api/v2/user/avatar")

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("new_user_avatar", fileName)
	if err != nil {
		return nil, errs.Wrapf(errs.CodeInternal, "files.UploadAvatar", err, "ошибка создания form-data")
	}
	if _, err := fw.Write(fileData); err != nil {
		return nil, errs.Wrapf(errs.CodeInternal, "files.UploadAvatar", err, "ошибка записи файла")
	}
	w.Close()

	req, err := http.NewRequestWithContext(f.core.Ctx, "POST", u.String(), &buf)
	if err != nil {
		return nil, errs.Wrapf(errs.CodeInternal, "files.UploadAvatar", err, "ошибка создания запроса")
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := f.core.HTTPClient.Do(req)
	if err != nil {
		return nil, errs.Wrapf(errs.CodeHTTP, "files.UploadAvatar", err, "ошибка выполнения запроса")
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respData, _ := io.ReadAll(resp.Body)
		code := errs.FromHTTPStatus(resp.StatusCode)
		return nil, errs.Wrapf(code, "files.UploadAvatar", err, "API вернул статус %d: %s", resp.StatusCode, string(respData))
	}

	var result dto.UploadAvatarResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, errs.Wrapf(errs.CodeInternal, "files.UploadAvatar", err, "ошибка декодирования ответа")
	}
	log.Info("аватар загружен", "fileID", result.FileID)
	return &result, nil
}
