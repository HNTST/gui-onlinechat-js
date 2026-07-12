package logger

import (
	"log/slog"
	"os"
)

var log *slog.Logger

func init() {
	log = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	slog.SetDefault(log)
}

// For создаёт логгер с привязкой к фиче и методу.
// Использование: log := logger.For("auth", "Login")
//   log.Info("выполняется вход")
//   log.Error("ошибка входа", err)
func For(feature, method string) *Logger {
	return &Logger{
		l: log.With(
			slog.String("feature", feature),
			slog.String("method", method),
		),
	}
}

// Logger — обёртка над slog с контекстом фичи и метода.
type Logger struct {
	l *slog.Logger
}

func (l *Logger) Debug(msg string, args ...any) {
	l.l.Debug(msg, args...)
}

func (l *Logger) Info(msg string, args ...any) {
	l.l.Info(msg, args...)
}

func (l *Logger) Warn(msg string, args ...any) {
	l.l.Warn(msg, args...)
}

// Error логирует ошибку с полем "error".
func (l *Logger) Error(msg string, err error, args ...any) {
	attrs := append([]any{slog.Any("error", err)}, args...)
	l.l.Error(msg, attrs...)
}
