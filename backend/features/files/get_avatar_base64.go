package files

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// GetAvatarBase64 — аватар в base64 (GET /api/v2/user/avatar?id=).
func (f *Files) GetAvatarBase64(avatarID string) (string, error) {
	log := logger.For("files", "GetAvatarBase64")

	query := url.Values{"id": {avatarID}}
	u, _ := url.Parse(f.core.ServerAddr + "/api/v2/user/avatar")
	u.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(f.core.Ctx, "GET", u.String(), nil)
	if err != nil {
		return "", errs.Wrapf(errs.CodeInternal, "files.GetAvatarBase64", err, "ошибка создания запроса")
	}

	resp, err := f.core.HTTPClient.Do(req)
	if err != nil {
		return "", errs.Wrapf(errs.CodeHTTP, "files.GetAvatarBase64", err, "ошибка выполнения запроса")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", errs.New(errs.FromHTTPStatus(resp.StatusCode), "files.GetAvatarBase64", fmt.Sprintf("API вернул статус %d", resp.StatusCode))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", errs.Wrapf(errs.CodeInternal, "files.GetAvatarBase64", err, "ошибка чтения ответа")
	}

	log.Debug("аватар получен", "avatarID", avatarID, "size", len(data))
	return base64.StdEncoding.EncodeToString(data), nil
}
