package auth

import (
	"gui-onlinechat/backend/core/httpclient"
	"gui-onlinechat/backend/core/ws"
)

// Auth инкапсулирует логику авторизации.
type Auth struct {
	core *httpclient.BaseApp
	ws   *ws.Manager
}

// New создаёт Auth.
func New(core *httpclient.BaseApp, wsMgr *ws.Manager) *Auth {
	return &Auth{core: core, ws: wsMgr}
}
