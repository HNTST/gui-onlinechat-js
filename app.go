package main

import (
	"context"
	"log"

	"gui-onlinechat/backend/core/httpclient"
	"gui-onlinechat/backend/core/ws"
	"gui-onlinechat/backend/features/auth"
	"gui-onlinechat/backend/features/chats"
	"gui-onlinechat/backend/features/files"
	"gui-onlinechat/backend/features/users"
)

// App — минимальный «клей». Все методы промоутируются через embedded structs.
// При добавлении новых API-маршрутов работа идёт строго внутри backend/features/*.
type App struct {
	ctx context.Context
	*httpclient.BaseApp
	*ws.Manager
	*auth.Auth
	*chats.Chats
	*users.Users
	*files.Files
}

// NewApp создаёт App, компонуя все слои: core → features.
func NewApp() *App {
	core := httpclient.New("https://hntgolang.duckdns.org")
	wsMgr := ws.New(core.ServerAddr, core.HTTPClient)

	usersFeat := users.New(core)
	authFeat := auth.New(core, wsMgr)

	uidResolver := func(username string) (int64, error) {
		resp, err := authFeat.GetUserID(username)
		if err != nil {
			return 0, err
		}
		return int64(resp.UserID), nil
	}

	chatsFeat := chats.New(core, wsMgr, usersFeat, uidResolver)
	filesFeat := files.New(core)

	return &App{
		BaseApp: core,
		Manager: wsMgr,
		Auth:    authFeat,
		Chats:   chatsFeat,
		Users:   usersFeat,
		Files:   filesFeat,
	}
}

// startup вызывается Wails при запуске приложения.
func (a *App) startup(ctx context.Context) {
	a.BaseApp.Ctx = ctx
	log.Printf("[App] Запуск приложения, контекст сохранён")
}

// shutdown вызывается Wails при завершении приложения.
func (a *App) shutdown(ctx context.Context) {
	log.Printf("[App] Завершение приложения, закрытие WebSocket...")
	a.Manager.Close()
}

// Greet — заглушка (оставлена для совместимости).
func (a *App) Greet(name string) string {
	return "Hello " + name + ", It's show time!"
}
