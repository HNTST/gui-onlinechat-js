import {
    GetChatsWithProfiles,
    GetChatHistory,
    FindOrCreateChat,
    GetUserData,
    GetSelfData,
    GetChatMembers,
    SendChatMessage,
    EditChatMessage,
    DeleteChatMessage,
    GetAvatarBase64,
} from "../../wailsjs/go/main/App";

let currentUserId = null;
let currentUsername = null;
let currentChatId = null;

// Кэш профилей — заполняется из ответов Go-методов
window.userProfilesCache = {};

const AVATAR_STUB =
    "data:image/svg+xml," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
        '<rect width="32" height="32" fill="#2a2c30"/>' +
        '<circle cx="16" cy="11" r="6" fill="#555"/>' +
        '<path d="M5 32c0-6 4.9-11 11-11s11 5 11 11" fill="#555"/>' +
        "</svg>",
    );

// ============================================================
// Утилиты для работы с кэшем профилей
// ============================================================

// putProfile — сохранить профиль в кэш из ответа Go-метода
function putProfile(userId, profile) {
    if (profile) window.userProfilesCache[userId] = profile;
}

// getCachedProfile — вернуть профиль из кэша (без сетевых вызовов)
function getCachedProfile(userId) {
    return window.userProfilesCache[userId] || null;
}

// loadProfile — загрузить профиль через Go-биндинг, если его нет в кэше
// Используется только для модального окна профиля (когда нужен произвольный userId)
function loadProfile(userId) {
    if (window.userProfilesCache[userId]) {
        return Promise.resolve(window.userProfilesCache[userId]);
    }
    const fetcher = Number(userId) === Number(currentUserId)
        ? GetSelfData()
        : GetUserData(userId);

    return fetcher
        .then((data) => {
            window.userProfilesCache[userId] = data;
            return data;
        })
        .catch(() => {
            const stub = {
                id: userId,
                username: "User #" + userId,
                avatar_id: null,
                reg: "",
            };
            window.userProfilesCache[userId] = stub;
            return stub;
        });
}

// ============================================================
// Загрузка аватаров через Go-биндинг (без прямых URL)
// ============================================================

function loadAvatar(imgEl, avatarId) {
    if (!imgEl || !avatarId) return;
    GetAvatarBase64(String(avatarId))
        .then((b64) => {
            imgEl.src = "data:image/png;base64," + b64;
        })
        .catch(() => {
            imgEl.src = AVATAR_STUB;
        });
}

// ============================================================
// Модальное окно профиля
// ============================================================

function openUserProfile(userId) {
    const modal = document.getElementById("profile-modal");
    const box = modal.querySelector(".modal-box");

    box.innerHTML = `
        <div class="profile-modal-avatar">
            <img src="${AVATAR_STUB}" class="profile-modal-img" id="modal-avatar" alt="avatar">
        </div>
        <h3 id="modal-nickname">Загрузка...</h3>
        <div class="profile-modal-id">ID: ${userId}</div>
        <div class="profile-modal-reg" id="modal-reg"></div>
        <button class="dota-btn modal-close-btn" id="modal-close-btn">ЗАКРЫТЬ</button>
    `;
    modal.classList.remove("hidden");

    // Для модалки грузим профиль через Go (может быть не в кэше)
    loadProfile(userId).then((profile) => {
        const nickEl = document.getElementById("modal-nickname");
        const regEl = document.getElementById("modal-reg");
        const avatarEl = document.getElementById("modal-avatar");
        if (nickEl) nickEl.textContent = profile.username || "User #" + userId;
        if (regEl && profile.reg) {
            regEl.textContent =
                "Регистрация: " +
                new Date(profile.reg).toLocaleDateString("ru-RU");
        }
        if (avatarEl && profile.avatar_id) {
            loadAvatar(avatarEl, profile.avatar_id);
        }
    });
}

function closeProfileModal() {
    document.getElementById("profile-modal").classList.add("hidden");
}

// ============================================================
// Рендер сообщений
// ============================================================

function renderMessage(text, isSystem, timestamp, senderId, messageId, isEdited, isDeleted) {
    const el = document.createElement("div");
    el.className = "msg" + (isSystem ? " system" : "");

    if (isSystem) {
        el.textContent = text;
        return el;
    }

    const pid = Number(senderId);
    const own = pid === Number(currentUserId);

    if (own) {
        el.classList.add("msg-own");
    }

    el.dataset.senderId = pid;
    if (messageId != null) el.dataset.msgId = messageId;
    if (timestamp) el.dataset.sentAt = timestamp;

    const timeStr = timestamp
        ? new Date(timestamp).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
          })
        : new Date().toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
          });

    const displayText = isDeleted ? "Сообщение удалено" : (text || "");
    const textDiv = document.createElement("div");
    textDiv.className = "msg-text";
    textDiv.textContent = displayText;

    if (isDeleted) {
        el.classList.add("msg-deleted");
    }

    if (isEdited && !isDeleted) {
        const editedLabel = document.createElement("span");
        editedLabel.className = "msg-edited-label";
        editedLabel.textContent = " (изменено)";
        textDiv.appendChild(editedLabel);
    }

    const timeDiv = document.createElement("div");
    timeDiv.className = "msg-time";
    timeDiv.textContent = timeStr;

    el.appendChild(textDiv);
    el.appendChild(timeDiv);

    if (own && messageId != null) {
        const actions = document.createElement("div");
        actions.className = "msg-actions";
        actions.innerHTML =
            `<button class="msg-action-btn msg-edit-btn" title="Редактировать">✎</button>` +
            `<button class="msg-action-btn msg-del-btn" title="Удалить">✕</button>`;
        el.appendChild(actions);
    }

    return el;
}

// ============================================================
// AppendMessageToUI — рендер сообщения из WS в DOM
// ============================================================

function appendMessageToUI(msg) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    if (msg.id != null) {
        const exists = container.querySelector(
            `.msg[data-msg-id="${msg.id}"][data-sent-at="${msg.sent_at}"][data-sender-id="${msg.sender_id}"]`,
        );
        if (exists) return;
    }

    const senderId = Number(msg.sender_id);

    const el = renderMessage(
        msg.message || "",
        false,
        msg.sent_at || null,
        senderId,
        msg.id,
        msg.is_edited,
        msg.is_deleted,
    );

    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
}

// ============================================================
// EventsOn — приём сообщений от Go через Wails EventsEmit
// ============================================================

export function initChatEvents() {
    window.runtime.EventsOn("new_message", (data) => {
        let msg;
        try {
            msg = typeof data === "string" ? JSON.parse(data) : data;
        } catch {
            return;
        }

        if (Number(msg.chat_id) === Number(window.currentOpenChatId)) {
            appendMessageToUI(msg);
        }
    });
}

// ============================================================
// Открытие чата — один Go-вызов GetChatHistory вместо каскада
// ============================================================

async function openChatById(
    chatId,
    chatName,
    listEl,
    chatWindow,
    titleEl,
    messagesContainer,
) {
    listEl
        .querySelectorAll(".chat-item")
        .forEach((el) => el.classList.remove("active"));
    const targetLi = listEl.querySelector(`[data-chat-id="${chatId}"]`);
    if (targetLi) {
        targetLi.classList.add("active");
        const badge = targetLi.querySelector(".unread-badge");
        if (badge) badge.remove();
    }

    currentChatId = chatId;
    window.currentOpenChatId = chatId;

    const chatAvatar = document.getElementById("chat-avatar");
    if (chatAvatar) chatAvatar.src = AVATAR_STUB;

    titleEl.textContent = chatName || "Чат #" + chatId;
    messagesContainer.innerHTML = "";

    messagesContainer.appendChild(
        renderMessage(
            `Вы вошли в текстовой канал "${chatName || "Чат #" + chatId}". Удачной игры!`,
            true,
        ),
    );

    // Один Go-вызов: загружает сообщения + профили отправителей + помечает прочитанным
    try {
        const history = await GetChatHistory(chatId, null, null);

        // Сохраняем профили в кэш
        if (history.profiles) {
            for (const [sid, profile] of Object.entries(history.profiles)) {
                putProfile(sid, profile);
            }
        }

        if (history.messages) {
            history.messages.forEach((msg) => {
                messagesContainer.appendChild(
                    renderMessage(
                        msg.message || "(пусто)",
                        false,
                        msg.sent_at,
                        msg.sender_id,
                        msg.id,
                        msg.is_edited,
                        msg.is_deleted,
                    ),
                );
            });
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
        console.error("Ошибка загрузки истории чата:", err);
    }

    // Аватар собеседника в шапке чата
    try {
        const membersResp = await GetChatMembers(chatId);
        const otherId = (membersResp.members || []).find(
            (m) => Number(m) !== Number(currentUserId),
        );
        if (otherId) {
            const profile = getCachedProfile(otherId) || await loadProfile(Number(otherId));
            if (chatAvatar && profile && profile.avatar_id) {
                loadAvatar(chatAvatar, profile.avatar_id);
            }
        }
    } catch (_e) {
        // Не показываем аватар, если не удалось получить участников
    }

    chatWindow.classList.add("slide-up");
}

// ============================================================
// Список чатов — один Go-вызов GetChatsWithProfiles
// ============================================================

async function refreshChatList(
    listEl,
    chatWindow,
    titleEl,
    messagesContainer,
) {
    try {
        // Один Go-возврат: чаты + профили собеседников
        const resp = await GetChatsWithProfiles();
        listEl.innerHTML = "";

        const chatList = resp.chats || [];
        if (chatList.length === 0) {
            listEl.innerHTML =
                '<li style="padding: 20px; text-align: center; color: #5d6266;">Нет доступных чатов</li>';
            return;
        }

        chatList.forEach((entry) => {
            const chat = entry.chat;

            const li = document.createElement("li");
            li.className = "chat-item";
            li.dataset.chatId = chat.id;

            const avatarImg = document.createElement("img");
            avatarImg.className = "chat-item-avatar";
            avatarImg.src = AVATAR_STUB;
            avatarImg.alt = "";

            const infoDiv = document.createElement("div");
            infoDiv.className = "chat-item-info";

            const nameSpan = document.createElement("div");
            nameSpan.className = "chat-item-name";
            nameSpan.textContent = chat.name || "Чат #" + chat.id;

            infoDiv.appendChild(nameSpan);

            if (chat.last_message && chat.last_message.text) {
                const previewDiv = document.createElement("div");
                previewDiv.className = "chat-item-preview";
                let previewText = chat.last_message.text;
                if (previewText.length > 40) {
                    previewText = previewText.slice(0, 40) + "...";
                }
                previewDiv.textContent = previewText;
                infoDiv.appendChild(previewDiv);
            }

            li.appendChild(avatarImg);
            li.appendChild(infoDiv);

            if (chat.unread_count > 0) {
                const badge = document.createElement("div");
                badge.className = "unread-badge";
                badge.textContent = chat.unread_count > 99 ? "99+" : chat.unread_count;
                li.appendChild(badge);
            }

            li.addEventListener("click", () => {
                openChatById(
                    chat.id,
                    chat.name,
                    listEl,
                    chatWindow,
                    titleEl,
                    messagesContainer,
                );
            });

            listEl.appendChild(li);

            // Аватар собеседника — профиль уже пришёл от Go
            if (entry.profile && entry.profile.avatar_id) {
                putProfile(entry.profile.id, entry.profile);
                loadAvatar(avatarImg, entry.profile.avatar_id);
            }
        });
    } catch (err) {
        console.error("Ошибка загрузки чатов:", err);
        listEl.innerHTML =
            '<li style="padding: 20px; text-align: center; color: #c0392b;">Ошибка загрузки чатов</li>';
    }
}

// ============================================================
// Основная функция инициализации
// ============================================================

export function initChats(containerId, userId, username, userData) {
    initChatEvents();

    window.userProfilesCache[userId] = {
        id: userId,
        username: username,
        avatar_id: userData && userData.avatar_id ? userData.avatar_id : null,
        reg: (userData && userData.reg) || "",
    };

    const container = document.getElementById(containerId);
    if (!container) return;

    currentUserId = userId;
    currentUsername = username;

    container.innerHTML = `
        <div id="sidebar">
            <div class="user-panel" id="profile-card">
                <img class="user-avatar" id="sidebar-avatar" src="${AVATAR_STUB}" alt="avatar">
                <div class="user-info">
                    <div class="user-nickname" id="display-name">${username}</div>
                    <div class="user-status">В сети</div>
                </div>
            </div>

            <div class="search-container">
                <input type="text" id="search-input" placeholder="Найти человека или канал..." autocomplete="off" />
            </div>

            <div class="sidebar-divider">ЧАТЫ</div>

            <ul class="chats-list" id="chats-list">
                <li style="padding: 20px; text-align: center; color: #5d6266;">Загрузка...</li>
            </ul>
        </div>

        <div id="main-content">
            <div id="chat-window">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <img class="chat-avatar" id="chat-avatar" src="${AVATAR_STUB}" alt="">
                        <div class="chat-title" id="chat-window-title">Канал</div>
                    </div>
                    <button class="close-chat-btn" id="close-chat-btn">&times;</button>
                </div>

                <div class="messages-box" id="messages-container"></div>

                <div class="input-container">
                    <input
                        type="text"
                        id="msg-input"
                        placeholder="Введите сообщение и нажмите Enter..."
                        autocomplete="off"
                    />
                    <button class="dota-btn" id="msg-send-btn" style="padding: 8px 20px; font-size: 11px">
                        ОТПРАВИТЬ
                    </button>
                </div>
            </div>
        </div>
    `;

    // Аватар текущего пользователя в сайдбаре
    const profile = window.userProfilesCache[userId];
    if (profile && profile.avatar_id) {
        const sidebarImg = document.getElementById("sidebar-avatar");
        if (sidebarImg) {
            loadAvatar(sidebarImg, profile.avatar_id);
        }
    }

    document
        .getElementById("profile-card")
        .addEventListener("click", () => openUserProfile(currentUserId));

    function closeProfileModalHandler(e) {
        if (e.target === e.currentTarget || e.target.id === "modal-close-btn") {
            closeProfileModal();
        }
    }
    const profileModal = document.getElementById("profile-modal");
    profileModal.addEventListener("click", closeProfileModalHandler);

    const listEl = document.getElementById("chats-list");
    const chatWindow = document.getElementById("chat-window");
    const titleEl = document.getElementById("chat-window-title");
    const messagesContainer = document.getElementById("messages-container");
    const closeBtn = document.getElementById("close-chat-btn");
    const msgInput = document.getElementById("msg-input");
    const sendBtn = document.getElementById("msg-send-btn");
    const searchInput = document.getElementById("search-input");

    // Клик по сообщению — открыть профиль автора
    messagesContainer.addEventListener("click", (e) => {
        const msgEl = e.target.closest(".msg");
        if (!msgEl || msgEl.classList.contains("system") || msgEl.classList.contains("msg-deleted")) return;
        if (e.target.closest(".msg-action-btn") || e.target.closest(".msg-edit-input")) return;
        if (e.target.closest(".msg") && msgEl.dataset.senderId) {
            openUserProfile(Number(msgEl.dataset.senderId));
            return;
        }
    });

    // Действия над сообщениями (edit/delete/save/cancel)
    messagesContainer.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".msg-edit-btn");
        if (editBtn) {
            const msgEl = editBtn.closest(".msg");
            if (!msgEl || msgEl.classList.contains("msg-editing")) return;
            startEdit(msgEl);
            return;
        }

        const delBtn = e.target.closest(".msg-del-btn");
        if (delBtn) {
            const msgEl = delBtn.closest(".msg");
            if (!msgEl) return;
            deleteMessage(msgEl);
            return;
        }

        const saveBtn = e.target.closest(".msg-save-btn");
        if (saveBtn) {
            const msgEl = saveBtn.closest(".msg");
            if (!msgEl) return;
            saveEdit(msgEl);
            return;
        }

        const cancelBtn = e.target.closest(".msg-cancel-btn");
        if (cancelBtn) {
            const msgEl = cancelBtn.closest(".msg");
            if (!msgEl) return;
            cancelEdit(msgEl);
            return;
        }
    });

    messagesContainer.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== "Escape") return;
        const input = e.target.closest(".msg-edit-input");
        if (!input) return;
        const msgEl = input.closest(".msg");
        if (!msgEl) return;

        e.preventDefault();
        if (e.key === "Enter") {
            saveEdit(msgEl);
        } else {
            cancelEdit(msgEl);
        }
    });

    function startEdit(msgEl) {
        const textEl = msgEl.querySelector(".msg-text");
        if (!textEl) return;
        const originalText = textEl.textContent;
        msgEl.dataset.originalText = originalText;

        msgEl.classList.add("msg-editing");

        const input = document.createElement("input");
        input.type = "text";
        input.className = "msg-edit-input";
        input.value = originalText;

        textEl.replaceWith(input);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);

        const actions = msgEl.querySelector(".msg-actions");
        if (actions) {
            actions.innerHTML =
                `<button class="msg-action-btn msg-save-btn" title="Сохранить">✓</button>` +
                `<button class="msg-action-btn msg-cancel-btn" title="Отмена">✕</button>`;
        }
    }

    function saveEdit(msgEl) {
        const input = msgEl.querySelector(".msg-edit-input");
        if (!input) return;
        const newText = input.value.trim();
        const msgId = msgEl.dataset.msgId;
        if (!msgId || currentChatId === null) return;

        if (!newText) {
            cancelEdit(msgEl);
            return;
        }

        EditChatMessage(Number(currentChatId), Number(msgId), { text: newText })
            .then(() => {
                finishEdit(msgEl, newText);
            })
            .catch((err) => {
                console.error("[Edit] Ошибка:", err);
                cancelEdit(msgEl);
            });
    }

    function cancelEdit(msgEl) {
        const input = msgEl.querySelector(".msg-edit-input");
        if (!input) return;
        const originalText = msgEl.dataset.originalText || "";
        finishEdit(msgEl, originalText);
    }

    function finishEdit(msgEl, text) {
        msgEl.classList.remove("msg-editing");

        const input = msgEl.querySelector(".msg-edit-input");
        if (!input) return;

        const textDiv = document.createElement("div");
        textDiv.className = "msg-text";
        textDiv.textContent = text;

        input.replaceWith(textDiv);

        const actions = msgEl.querySelector(".msg-actions");
        if (actions) {
            actions.innerHTML =
                `<button class="msg-action-btn msg-edit-btn" title="Редактировать">✎</button>` +
                `<button class="msg-action-btn msg-del-btn" title="Удалить">✕</button>`;
        }
    }

    function deleteMessage(msgEl) {
        const msgId = msgEl.dataset.msgId;
        if (!msgId || currentChatId === null) return;

        DeleteChatMessage(Number(currentChatId), Number(msgId))
            .then(() => {
                const textEl = msgEl.querySelector(".msg-text");
                if (textEl) textEl.textContent = "Сообщение удалено";
                msgEl.classList.add("msg-deleted");
                const actions = msgEl.querySelector(".msg-actions");
                if (actions) actions.remove();
            })
            .catch((err) => {
                console.error("[Delete] Ошибка:", err);
            });
    }

    function closeChat() {
        chatWindow.classList.remove("slide-up");
        listEl
            .querySelectorAll(".chat-item")
            .forEach((el) => el.classList.remove("active"));
        currentChatId = null;
        window.currentOpenChatId = null;
    }

    closeBtn.addEventListener("click", closeChat);

    // Отправка сообщения — только через WS, рендер по эху от сервера
    function sendMessage() {
        const text = msgInput.value.trim();
        if (!text || currentChatId === null) return;

        SendChatMessage(Number(currentChatId), { message: text });
        msgInput.value = "";
    }

    sendBtn.addEventListener("click", sendMessage);
    msgInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // Поиск/создание чата — один Go-вызов FindOrCreateChat вместо каскада
    searchInput.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter") return;
        const query = searchInput.value.trim();
        if (!query) return;

        searchInput.value = "";

        try {
            const chatResp = await FindOrCreateChat(query);
            await refreshChatList(
                listEl,
                chatWindow,
                titleEl,
                messagesContainer,
            );
            await openChatById(
                chatResp.chat_id,
                query,
                listEl,
                chatWindow,
                titleEl,
                messagesContainer,
            );
        } catch (err) {
            console.error("Ошибка поиска/создания чата:", err);
        }
    });

    refreshChatList(listEl, chatWindow, titleEl, messagesContainer);
}
