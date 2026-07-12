package files

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
)

// GetAvatar — получение бинарного потока аватара (GET /api/v2/user/avatar?id=).
func (f *Files) GetAvatar(avatarID int64) ([]byte, error) {
	query := url.Values{"id": {strconv.FormatInt(avatarID, 10)}}
	u, _ := url.Parse(f.core.ServerAddr + "/api/v2/user/avatar")
	u.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(f.core.Ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("ошибка создания запроса: %w", err)
	}

	resp, err := f.core.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ошибка выполнения запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API вернул статус %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}
