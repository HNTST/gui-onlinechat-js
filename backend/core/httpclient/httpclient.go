package httpclient

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"

	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// BaseApp содержит общие ресурсы: контекст, HTTP-клиент, адрес сервера.
type BaseApp struct {
	Ctx        context.Context
	ServerAddr string
	HTTPClient *http.Client
	UserID     int64
}

// New создаёт BaseApp с инициализированным CookieJar.
func New(serverAddr string) *BaseApp {
	jar, _ := cookiejar.New(nil)
	return &BaseApp{
		ServerAddr: serverAddr,
		HTTPClient: &http.Client{Jar: jar},
	}
}

// DoRequest — универсальный HTTP-helper.
func (b *BaseApp) DoRequest(method, path string, query url.Values, body, out interface{}) error {
	log := logger.For("httpclient", method+" "+path)

	u, err := url.Parse(b.ServerAddr + path)
	if err != nil {
		return errs.Wrapf(errs.CodeInternal, "DoRequest", err, "неверный URL: %s", path)
	}
	if query != nil {
		u.RawQuery = query.Encode()
	}

	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return errs.Wrapf(errs.CodeInternal, "DoRequest", err, "ошибка сериализации")
		}
		log.Debug("отправка запроса", "url", u.String(), "body", string(data))
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(b.Ctx, method, u.String(), reqBody)
	if err != nil {
		return errs.Wrapf(errs.CodeInternal, "DoRequest", err, "ошибка создания запроса")
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := b.HTTPClient.Do(req)
	if err != nil {
		return errs.Wrapf(errs.CodeHTTP, "DoRequest", err, "ошибка выполнения запроса")
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respData, _ := io.ReadAll(resp.Body)
		code := errs.FromHTTPStatus(resp.StatusCode)
		log.Error("API вернул ошибку", err, "status", resp.StatusCode, "body", string(respData))
		return errs.Wrapf(code, "DoRequest", err, "API вернул статус %d: %s", resp.StatusCode, string(respData))
	}

	if out != nil {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			return errs.Wrapf(errs.CodeInternal, "DoRequest", err, "ошибка декодирования ответа")
		}
	}
	return nil
}
