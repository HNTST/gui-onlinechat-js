package files

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// GetAvatarBase64 — аватар в base64 (GET /api/v2/user/avatar?id=).
func (f *Files) GetAvatarBase64(avatarID string) (string, error) {
	query := url.Values{"id": {avatarID}}
	u, _ := url.Parse(f.core.ServerAddr + "/api/v2/user/avatar")
	u.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(f.core.Ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "", fmt.Errorf("ошибка создания запроса: %w", err)
	}

	resp, err := f.core.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ошибка выполнения запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API вернул статус %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("ошибка чтения ответа: %w", err)
	}

	return base64.StdEncoding.EncodeToString(data), nil
}
