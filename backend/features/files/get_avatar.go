package files

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"

	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// GetAvatar — получение бинарного потока аватара (GET /api/v2/user/avatar?id=).
func (f *Files) GetAvatar(avatarID int64) ([]byte, error) {
	log := logger.For("files", "GetAvatar")

	query := url.Values{"id": {strconv.FormatInt(avatarID, 10)}}
	u, _ := url.Parse(f.core.ServerAddr + "/api/v2/user/avatar")
	u.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(f.core.Ctx, "GET", u.String(), nil)
	if err != nil {
		return nil, errs.Wrapf(errs.CodeInternal, "files.GetAvatar", err, "ошибка создания запроса")
	}

	resp, err := f.core.HTTPClient.Do(req)
	if err != nil {
		return nil, errs.Wrapf(errs.CodeHTTP, "files.GetAvatar", err, "ошибка выполнения запроса")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errs.New(errs.FromHTTPStatus(resp.StatusCode), "files.GetAvatar", fmt.Sprintf("API вернул статус %d", resp.StatusCode))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, errs.Wrapf(errs.CodeInternal, "files.GetAvatar", err, "ошибка чтения ответа")
	}

	log.Debug("аватар получен", "avatarID", avatarID, "size", len(data))
	return data, nil
}
