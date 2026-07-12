package errs

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// Code — числовой код ошибки для фронтенда.
type Code int

const (
	CodeValidation  Code = 400
	CodeAuth        Code = 401
	CodeNotFound    Code = 404
	CodeConflict    Code = 409
	CodeHTTP        Code = 502
	CodeInternal    Code = 500
	CodeWSOverflow  Code = 503
)

// Error — единый тип ошибки приложения, сериализуется Wails в JSON для фронтенда.
type Error struct {
	Code    Code   `json:"code"`
	Message string `json:"message"`
	Op      string `json:"op,omitempty"`
	Err     error  `json:"-"`
}

func (e *Error) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s: %v", e.Op, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Op, e.Message)
}

func (e *Error) Unwrap() error {
	return e.Err
}

// JSON возвращает JSON-представление ошибки для фронтенда.
func (e *Error) JSON() string {
	data, _ := json.Marshal(e)
	return string(data)
}

// --- Конструкторы ---

// New создаёт ошибку с текстовым сообщением.
func New(code Code, op, msg string) *Error {
	return &Error{Code: code, Op: op, Message: msg}
}

// Wrap оборачивает существующую ошибку.
func Wrap(code Code, op string, err error) *Error {
	return &Error{Code: code, Op: op, Message: err.Error(), Err: err}
}

// Wrapf оборачивает ошибку с дополнительным контекстом.
func Wrapf(code Code, op string, err error, format string, args ...any) *Error {
	return &Error{Code: code, Op: op, Message: fmt.Sprintf(format, args...), Err: err}
}

// --- Готовые ошибки ---

func BadRequest(op, msg string) *Error  { return New(CodeValidation, op, msg) }
func Unauthorized(op string) *Error     { return New(CodeAuth, op, "необходима авторизация") }
func NotFound(op, msg string) *Error    { return New(CodeNotFound, op, msg) }
func Conflict(op, msg string) *Error    { return New(CodeConflict, op, msg) }
func Internal(op string, err error) *Error { return Wrap(CodeInternal, op, err) }

// FromHTTPStatus возвращает Code на основе HTTP-статуса.
func FromHTTPStatus(status int) Code {
	switch {
	case status == http.StatusUnauthorized:
		return CodeAuth
	case status == http.StatusNotFound:
		return CodeNotFound
	case status == http.StatusConflict:
		return CodeConflict
	case status >= 400 && status < 500:
		return CodeValidation
	default:
		return CodeHTTP
	}
}
