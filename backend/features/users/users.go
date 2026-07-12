package users

import (
	"gui-onlinechat/backend/core/httpclient"
)

// Users инкапсулирует методы работы с профилями пользователей.
type Users struct {
	core *httpclient.BaseApp
}

// New создаёт Users.
func New(core *httpclient.BaseApp) *Users {
	return &Users{core: core}
}
