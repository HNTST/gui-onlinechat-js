package auth

import (
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// Logout — выход из аккаунта.
func (f *Auth) Logout() error {
	log := logger.For("auth", "Logout")

	f.ws.Close()

	if err := f.core.DoRequest("POST", "/api/v2/auth/logout", nil, nil, nil); err != nil {
		log.Error("ошибка выхода", err)
		return errs.Wrapf(errs.CodeHTTP, "auth.Logout", err, "ошибка выхода")
	}
	log.Info("выход выполнен")
	return nil
}
