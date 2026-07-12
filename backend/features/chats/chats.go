package chats

import (
	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/httpclient"
	"gui-onlinechat/backend/core/ws"
)

// UsersProvider — абстракция над users.Users для получения профилей.
type UsersProvider interface {
	GetUserData(userID int64) (*dto.GetUserResponse, error)
	GetSelfData() (*dto.GetUserResponse, error)
}

// UserIDResolver — функция для разрешения имени пользователя в ID.
type UserIDResolver func(username string) (int64, error)

// Chats инкапсулирует логику чатов и сообщений.
type Chats struct {
	core       *httpclient.BaseApp
	ws         *ws.Manager
	users      UsersProvider
	resolveUID UserIDResolver
}

// New создаёт Chats.
func New(core *httpclient.BaseApp, wsMgr *ws.Manager, users UsersProvider, resolver UserIDResolver) *Chats {
	return &Chats{
		core:       core,
		ws:         wsMgr,
		users:      users,
		resolveUID: resolver,
	}
}
