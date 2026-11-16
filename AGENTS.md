# Технический паспорт проекта

GUI-клиент мессенджера (стиль Discord) на базе Wails v2. Go-бэкенд + Vanilla JS фронтенд с Tailwind CSS + DaisyUI.

---

## Архитектура

### Общая схема

```
┌─────────────────────────────────────────────┐
│                Wails v2 runtime              │
│  ┌──────────────┐    ┌────────────────────┐  │
│  │   Go backend  │◄──►│  JS frontend (Vite)│  │
│  │  (struct embed)│    │  (feature-based)   │  │
│  └──────┬───────┘    └────────┬───────────┘  │
│         │                     │              │
│         ▼                     ▼              │
│  ┌──────────────┐    ┌────────────────────┐  │
│  │  REST API     │    │  Wails runtime     │  │
│  │  + WebSocket  │    │  EventsEmit/On     │  │
│  └──────────────┘    └────────────────────┘  │
└─────────────────────────────────────────────┘
         │
         ▼
   External API Server
   https://hntgolang.duckdns.org
```

### Бэкенд — Feature-based architecture

Go-бэкенд является **клиентом** внешнего REST API + WebSocket сервера. Не хранит данные локально.

```
backend/
├── core/                         # Общая инфраструктура
│   ├── dto/                      # Разделяемые DTO (auth.go, chats.go, users.go, files.go)
│   ├── errs/                     # Единая ошибка Error{Code, Message, Op, Err}
│   ├── httpclient/               # BaseApp — HTTP-клиент с cookie jar
│   ├── logger/                   # slog JSON-логер (For(feature, method))
│   └── ws/                       # WebSocket manager (gorilla/websocket)
└── features/                     # Бизнес-модули
    ├── auth/                     # Login, Register, Logout, GetUserID
    ├── chats/                    # CRUD чатов, сообщения, участники, read-status
    ├── users/                    # GetUserData, GetSelfData
    └── files/                    # UploadAvatar, GetAvatar, GetAvatarBase64
```

**Связывание в `app.go`:** `App` embedит `*auth.Auth`, `*chats.Chats`, `*users.Users`, `*files.Files`. Wails видит промоутированные методы через reflection. Уникация имён полей обязательна.

**Циклические зависимости:** `chats.UsersProvider` interface + `chats.UserIDResolver` func инжектируются из `app.go`. Пакет `chats` не импортирует `auth` или `users` напрямую.

### Фронтенд — Feature-based architecture

Vanilla JS (без фреймворков), модули ES6.

```
frontend/src/
├── main.js                       # Точка входа, WS listener (EventsOn)
├── App.js                        # Диспетчер: auth screen → chat workspace
├── style.css                     # @tailwind + минимальный CSS (~100 строк)
├── core/
│   ├── wailsBridge.js            # Централизованный мост к Go API (AuthAPI, ChatAPI, UserAPI)
│   ├── constants.js              # AVATAR_STUB
│   └── components/Avatar.js      # createAvatar(), loadAvatarInto()
└── features/
    ├── auth/
    │   ├── authService.js        # login(), register(), logout()
    │   └── components/AuthScreen.js
    ├── chat/
    │   ├── chatState.js          # Глобальное состояние (userId, chatId)
    │   ├── chatService.js        # API-обёртки (sendMessage, getChatHistory, etc.)
    │   ├── profilesCache.js      # Кэш профилей (putProfile, loadProfile)
    │   ├── onlineUsers.js        # Set онлайн-пользователей + onStatusChange listener
    │   ├── ChatWorkspace.js      # Главный оркестратор (список, чат, WS, контекстное меню)
    │   └── components/
    │       ├── ChatList.js       # Список чатов (кэш + updateLastMessage)
    │       ├── ChatHeader.js     # Заголовок чата (имя, аватар, онлайн-точка)
    │       ├── MessageBubble.js  # Пузырь сообщения (галочки прочтения)
    │       └── InputBar.js       # Поле ввода + SVG-кнопка отправки
    └── profile/
        └── components/ProfileModal.js  # DaisyUI <dialog> модалка
```

---

## Стек технологий

| Компонент | Технология |
|-----------|-----------|
| Framework | Wails v2.12.0 (Go + WebView) |
| Язык бэкенда | Go 1.23 |
| WebSocket | gorilla/websocket v1.5.3 |
| HTTP-клиент | net/http + cookiejar (selenium/goose) |
| Логирование | log/slog (JSON handler) |
| Frontend | Vanilla JS (ES6 modules) |
| Бандлер | Vite 3.0.7 |
| CSS | Tailwind CSS 3.4.4 |
| UI-kit | DaisyUI 4.12.10 (тема "dota") |
| Платформа | Linux (webkit2gtk-4.0), Windows (WebView2) |

---

## Тема "dota" (DaisyUI)

| Переменная | Цвет | Назначение |
|-----------|------|-----------|
| primary | `#a38144` (золото) | Акцент, кнопки, заголовки |
| secondary | `#3d332a` (тёмно-коричневый) | Рамки, разделители |
| accent | `#801a1a` (тёмно-красный) | Опасные действия |
| base-100 | `#0b0c0d` (почти чёрный) | Фон приложения |
| base-200 | `#141517` | Панели (сайдбар, шапки) |
| base-300 | `#1c1d22` | Hover-состояния |
| success | `#6cf06c` (зелёный) | Онлайн-точка |

---

## WebSocket — Протокол

### Подключение

Go-бэкенд устанавливает WS-соединение с сервером при логине (`auth.Login()` → `go ws.Start()`). Куки извлекаются через `https://` URL (не `wss://`), добавляется `Origin: http://localhost:34115`.

### Исходящее (от сервера → Go readLoop → Wails EventsEmit)

**Сообщение в чате:**
```json
{"id":456, "message":"text", "chat_id":1, "sender_id":123, "sent_at":"...", "is_edited":false, "is_deleted":false, "is_read":false}
```

**Пользователь онлайн:**
```json
{"type":"online", "user_id":123}
```

**Пользователь оффлайн:**
```json
{"type":"offline", "user_id":123}
```

### Входящее (от клиента → Go Send → WS)

```json
{"message":"text", "chat_id":1, "sender_id":123}
```

`sender_id` **обязан** совпадать с `user_id` сессии — иначе сообщение молча отбрасывается сервером.

### Архитектура WS

- `Manager.readLoop()` — чтение, `EventsEmit("new_message", data)` в JS
- `Manager.writeLoop()` — запись из `sendCh chan []byte`
- `Manager.Stop()` — закрытие соединения (при logout)
- `Manager.SetEmitFn()` — инжекция `runtime.EventsEmit` из `app.go startup()`

### Обработка на фронте

`EventsOn("new_message")` зарегистрирован в `main.js` **до логина** (исправление гонки). Роутинг:
- `msg.type === "online"` → `setOnline(user_id)` в `onlineUsers.js`
- `msg.type === "offline"` → `setOffline(user_id)`
- Иначе → `window.__onWsMessage(msg)` → `ChatWorkspace` (appendMessageToUI)

---

## API — Карта методов (Go bindings → внешний сервер)

### Auth
| Go-метод | REST | Описание |
|-----------|------|----------|
| `Login(username, password)` | `POST /api/v2/auth/login` | Вход + запуск WS |
| `Register(username, password)` | `POST /api/v2/auth/register` | Регистрация + авто-логин |
| `Logout()` | `POST /api/v2/auth/logout` | Выход + закрытие WS |
| `GetUserID(username)` | `GET /api/v2/user_id?username=X` | Поиск ID по username |

### Chats
| Go-метод | REST | Описание |
|-----------|------|----------|
| `GetUserChats()` | `GET /api/v2/chats` | Список чатов |
| `GetChatsWithProfiles()` | (оркестрация) | Чаты + профили собеседников через members |
| `FindOrCreateChat(query)` | `POST /api/v2/chat` | Поиск/создание чата |
| `GetChatHistory(chatID)` | `GET /api/v2/chats/{id}/messages` | История + профили |
| `GetChatMembers(chatID)` | `GET /api/v2/chats/{id}/members` | Участники |
| `SendChatMessage(chatID, body)` | `POST /api/v2/chats/{id}/messages` | Отправка (через WS) |
| `EditChatMessage(chatID, msgID)` | `PUT /api/v2/chats/{id}/messages/{msgID}` | Редактирование |
| `DeleteChatMessage(chatID, msgID)` | `DELETE /api/v2/chats/{id}/messages/{msgID}` | Мягкое удаление |
| `MarkMessagesAsRead(chatID, body)` | `PATCH /api/v2/chats/{id}/messages/read-status` | Отметка прочтения |

### Users
| Go-метод | REST | Описание |
|-----------|------|----------|
| `GetUserData(userID)` | `GET /api/v2/users?id=X` | Профиль по ID |
| `GetSelfData()` | `GET /api/v2/user/profile` | Свой профиль |

### Files
| Go-метод | REST | Описание |
|-----------|------|----------|
| `UploadAvatar(userID, file)` | `POST /api/v2/user/avatar` | Загрузка аватарки |
| `GetAvatar(id)` | `GET /api/v2/user/avatar?id=X` | Стриминг изображения |
| `GetAvatarBase64(id)` | (оркестрация) | Base64 data URL для `<img>` |

---

## Ключевые паттерны

### Единая ошибка (`core/errs`)
```go
type Error struct {
    Code    Code   // HTTP-статус
    Message string // Для клиента
    Op      string // "auth.Login"
    Err     error  // Оригинал (не отдаётся клиенту)
}
```
Конструкторы: `New`, `Wrap`, `Wrapf`, `BadRequest`, `NotFound`, `Internal`, `FromHTTPStatus`.

### Контекстный логер (`core/logger`)
```go
log := logger.For("auth", "Login")
log.Info("вход выполнен", "userID", resp.ID)
```
Автоматически добавляет `feature` + `method` в JSON.

### DTO — прямой импорт
Все DTO в `backend/core/dto/`. Feature-пакеты импортируют `dto` напрямую. Локальные алиасы не используются.

### Онлайн-статус (`onlineUsers.js`)
```js
import { isOnline, onStatusChange } from "./onlineUsers.js";
// Глобальный Set + listener, обновляется через WS events
// UI: ChatList (точка рядом с именем), ChatHeader, ProfileModal
```

### Кэш списка чатов (`ChatList.js`)
```js
let cachedEntries = [];  // Единый источник правды
// updateLastMessage(chatId, text, sentAt) — обновляет кэш + сортирует + перерисовывает
// Без полного re-render: обновление <li> на месте + prepend с анимацией
```

### Галочки прочтения
- SVG-иконки: серая `✓` (unread) → золотая `✓✓` (read)
- `refreshReadChecks()` — обновляет DOM in-place без перерендера
- Вызов: при открытии чата, скролле вниз, WS-сообщении

---

## Wails — Struct embedding

`App` embedит feature-структы. Wails видит их методы через reflection:
```go
type App struct {
    ctx context.Context
    *httpclient.BaseApp
    *ws.Manager
    *auth.Auth
    *chats.Chats
    *users.Users
    *files.Files
}
```
**Правило:** имена полей не должны конфликтовать (все уникальные). Promoted methods автоматически доступны из JS через `window.go.main.App.MethodName()`.

---

## Правила для ИИ-агента

1. **Язык** — все ответы строго на русском языке.
2. **Изоляция изменений** — работать только с тем, что указано в запросе. Не модифицировать смежные файлы без прямой необходимости.
3. **Core не трогать без необходимости** — `backend/core/` содержит общую инфраструктуру. Изменять только если это напрямую требуется.
4. **Фронтенд без фреймворков** — Vanilla JS + ES6 модули. Не добавлять React/Vue/Svelte.
5. **Тестирование** — после изменений:
   - `go build ./...` и `go vet ./...` должны проходить чисто
   - Фронтенд: `npm run build` без ошибок
6. **Wails bindings** — при добавлении нового Go-метода нужно чтобы он был экспортным (capitalize) и доступен через struct embedding в `App`.
7. **WS-протокол** — `sender_id` в отправке обязан совпадать с ID сессии. Онлайн-события: `{"type":"online/offline","user_id":N}`.
8. **Конфиденциальность** — запрещено логировать пароли и секретные ключи.
9. **Cookie jar** — куки извлекаются через `https://` URL (не `wss://`). `Origin` заголовок обязателен: `http://localhost:34115`.
10. **Struct embedding** — уникальность имён полей обязательна. Циклические зависимости через интерфейсы/func injection.
11. **Фронтенд архитектура** — feature-based: `core/`, `features/auth/`, `features/chat/`, `features/profile/`. Каждый feature инкапсулирует state, service, components.
12. **CSS** — Tailwind CSS + DaisyUI. Кастомный CSS минимальный (только `style.css`, ~100 строк). Не писать длинные CSS-классы вручную.
13. **Онлайн/прочтение** — `onlineUsers.js` и `ChatList.js` кэш — единый источник правды. UI синхронизируется через `onStatusChange` listener, не через перерендер всего DOM.

---

## Команды

| Команда | Описание |
|---------|----------|
| `wails dev` | Запуск в dev-режиме (hot reload + DevTools) |
| `wails build` | Продакшн-сборка |
| `go build ./...` | Сборка Go-бэкенда |
| `go vet ./...` | Статический анализ Go |
| `npm run dev` | Vite dev server (фронтенд отдельно) |
| `npm run build` | Сборка фронтенда |

---

## Известные ограничения

1. Нет heartbeat/keepalive для WS — обрыв обнаруживается только при ошибке чтения/записи. Автопереподключение через 3 сек.
2. WS подключение запускается в горутине при логине — гонка с регистрацией `EventsOn` решена переносом в `main.js`.
3. `GetChatsWithProfiles` делает N+1 запрос (chats + members + profiles для каждого чата).
4. Нет пагинации сообщений на фронте (загружается лимит 50).
5. Browser context menu отключен глобально (`e.preventDefault()`).
