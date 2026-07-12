package auth

import "net/http"

// Logout — выход из аккаунта.
func (f *Auth) Logout() error {
	return f.core.DoRequest(http.MethodPost, "/api/v2/auth/logout", nil, nil, nil)
}
