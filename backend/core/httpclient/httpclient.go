package httpclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
)

// BaseApp содержит общие ресурсы: контекст, HTTP-клиент, адрес сервера.
// Все feature-пакеты получают указатель на эту структуру.
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

// DoRequest — универсальный HTTP-helper: сериализует body, отправляет запрос,
// проверяет статус, декодирует ответ в out.
func (b *BaseApp) DoRequest(method, path string, query url.Values, body, out interface{}) error {
	u, err := url.Parse(b.ServerAddr + path)
	if err != nil {
		return fmt.Errorf("неверный URL: %w", err)
	}
	if query != nil {
		u.RawQuery = query.Encode()
	}

	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("ошибка сериализации: %w", err)
		}
		log.Printf("[HTTP %s] %s -> JSON: %s", method, u.String(), string(data))
		reqBody = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(b.Ctx, method, u.String(), reqBody)
	if err != nil {
		return fmt.Errorf("ошибка создания запроса: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	log.Printf("[HTTP %s] %s Headers: %v", method, u.String(), req.Header)
	resp, err := b.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("ошибка выполнения запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respData, _ := io.ReadAll(resp.Body)
		log.Printf("[HTTP %s] %s <- статус %d: %s", method, u.String(), resp.StatusCode, string(respData))
		return fmt.Errorf("API вернул статус %d: %s", resp.StatusCode, string(respData))
	}

	if out != nil {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			return fmt.Errorf("ошибка декодирования ответа: %w", err)
		}
	}
	return nil
}
