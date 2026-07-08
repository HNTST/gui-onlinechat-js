import {
    GetUserChats,
    GetChatMessages,
    CreateChat,
    GetUserID,
    GetUserData,
    GetChatMembers,
    SendChatMessage,
    MarkMessagesAsRead,
    EditChatMessage,
    DeleteChatMessage,
} from "../../wailsjs/go/main/App";

let currentUserId = null;
let currentUsername = null;
let currentChatId = null;

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

function ensureProfile(userId) {
    if (window.userProfilesCache[userId]) {
        return Promise.resolve(window.userProfilesCache[userId]);
    }
    return GetUserData(userId)
        .then((data) => {
            window.userProfilesCache[userId] = data;
            return data;
        })
        .catch(() => {
            window.userProfilesCache[userId] = {
                id: userId,
                username: "User #" + userId,
                avatar_id: null,
                reg: "",
            };
            return window.userProfilesCache[userId];
        });
}

function resolveUsername(userId) {
    if (userId === currentUserId) return Promise.resolve(currentUsername);
    if (window.userProfilesCache[userId]) {
        return Promise.resolve(window.userProfilesCache[userId].username);
    }
    return ensureProfile(userId).then((p) => p.username);
}

function resolveAuthor(senderId, msg) {
    if (msg && msg.username) return msg.username;
    if (Number(senderId) === Number(currentUserId)) return currentUsername;
    const cached = window.userProfilesCache[senderId];
    if (cached && cached.username) return cached.username;
    return "Игрок " + senderId;
}

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

    ensureProfile(userId).then((profile) => {
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
            avatarEl.src =
                "https://hntgolang.duckdns.org/api/v2/user/avatar?id=" +
                profile.avatar_id;
        }
    });
}

function closeProfileModal() {
    document.getElementById("profile-modal").classList.add("hidden");
}

function renderMessage(text, isSystem, timestamp, senderId, messageId, isEdited, isDeleted) {
    const el = document.createElement("div");
    el.className = "msg" + (isSystem ? " system" : "");

    if (isSystem) {
        el.textContent = text;
        return el;
    }

    const pid = Number(senderId);

    if (pid === Number(currentUserId)) {
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

    if (pid === Number(currentUserId) && messageId != null) {
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
// AppendMessageToUI — рендер сообщения из WS/оптимизма в DOM
// ============================================================

function appendMessageToUI(msg) {
    const container = document.getElementById("messages-container");
    if (!container) {
        console.error("[UI] #messages-container НЕ НАЙДЕН в DOM!");
        return;
    }

    const isOptimistic = msg.id == null;
    const senderId = Number(msg.sender_id);
    const newText = msg.message || "";

    if (!isOptimistic) {
        const pendingEls = container.querySelectorAll(".msg[data-pending]");
        for (const pel of pendingEls) {
            const pt = pel.querySelector(".msg-text")?.textContent || "";
            const ps = pel.dataset.senderId;
            if (String(ps) === String(senderId) && pt === newText) {
                delete pel.dataset.pending;
                return;
            }
        }
    }

    const el = renderMessage(newText, false, null, senderId, msg.id);
    if (isOptimistic) el.dataset.pending = "true";

    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
}

// ============================================================
// EventsOn — приём сообщений от Go через Wails EventsEmit
// ============================================================

export function initChatEvents() {
    console.log(
        "[EventsOn] initChatEvents() — регистрируем слушатель 'new_message'",
    );

    window.runtime.EventsOn("new_message", (data) => {
        console.log("[EventsOn] Событие 'new_message' получено!");

        let msg;
        if (typeof data === "string") {
            try {
                msg = JSON.parse(data);
            } catch (e) {
                console.error("[EventsOn] JSON.parse ошибка:", e.toString());
                return;
            }
        } else {
            msg = data;
        }

        if (Number(msg.chat_id) === Number(window.currentOpenChatId)) {
            appendMessageToUI(msg);
        }
    });
}

// ============================================================
// Чат
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

    try {
        const msgResp = await GetChatMessages(chatId, null, null);
        if (msgResp.messages) {
            const uniqueIds = [
                ...new Set(msgResp.messages.map((m) => m.sender_id)),
            ];
            await Promise.all(uniqueIds.map((id) => ensureProfile(id)));

            let maxMsgId = 0;
            msgResp.messages.forEach((msg) => {
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
                if (Number(msg.id) > maxMsgId) maxMsgId = Number(msg.id);
            });

            if (maxMsgId > 0) {
                MarkMessagesAsRead(
                    Number(chatId),
                    Number(currentUserId),
                    { last_read_message_id: maxMsgId },
                ).catch(() => {});
            }
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
        console.error("Ошибка загрузки сообщений:", err);
    }

    try {
        const membersResp = await GetChatMembers(chatId);
        const otherId = (membersResp.members || []).find(
            (m) => Number(m) !== Number(currentUserId),
        );
        if (otherId) {
            const profile = await ensureProfile(Number(otherId));
            if (chatAvatar && profile && profile.avatar_id) {
                chatAvatar.src =
                    "https://hntgolang.duckdns.org/api/v2/user/avatar?id=" +
                    profile.avatar_id;
            }
        }
    } catch (_e) {
        // Не показываем аватар, если не удалось получить участников
    }

    chatWindow.classList.add("slide-up");
}

async function refreshChatList(
    listEl,
    chatWindow,
    titleEl,
    messagesContainer,
) {
    try {
        const resp = await GetUserChats(currentUserId);
        listEl.innerHTML = "";

        const chats = resp.chats || resp;
        const chatList = Array.isArray(chats) ? chats : [];
        if (chatList.length === 0) {
            listEl.innerHTML =
                '<li style="padding: 20px; text-align: center; color: #5d6266;">Нет доступных чатов</li>';
            return;
        }

        chatList.forEach((chat) => {
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

            // Асинхронно подгружаем аватар собеседника
            if (chat.name) {
                GetUserID(chat.name)
                    .then((resp) => ensureProfile(resp.user_id))
                    .then((profile) => {
                        if (profile && profile.avatar_id) {
                            const img = listEl.querySelector(
                                `[data-chat-id="${chat.id}"] .chat-item-avatar`,
                            );
                            if (img) {
                                img.src =
                                    "https://hntgolang.duckdns.org/api/v2/user/avatar?id=" +
                                    profile.avatar_id;
                            }
                        }
                    })
                    .catch(() => {});
            }
        });
    } catch (err) {
        console.error("Ошибка загрузки чатов:", err);
        listEl.innerHTML =
            '<li style="padding: 20px; text-align: center; color: #c0392b;">Ошибка загрузки чатов</li>';
    }
}

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

    // Подставляем аватар текущего пользователя в сайдбар
    const profile = window.userProfilesCache[userId];
    if (profile && profile.avatar_id) {
        const sidebarImg = document.getElementById("sidebar-avatar");
        if (sidebarImg) {
            sidebarImg.src =
                "https://hntgolang.duckdns.org/api/v2/user/avatar?id=" +
                profile.avatar_id;
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

    messagesContainer.addEventListener("click", (e) => {
        const msgEl = e.target.closest(".msg");
        if (!msgEl || msgEl.classList.contains("system") || msgEl.classList.contains("msg-deleted")) return;

        if (e.target.closest(".msg-action-btn") || e.target.closest(".msg-edit-input")) return;

        if (e.target.closest(".msg") && msgEl.dataset.senderId) {
            openUserProfile(Number(msgEl.dataset.senderId));
            return;
        }
    });

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

    // ============================================================
    // Отправка сообщения через HTTP POST (Go → внешнее API)
    // ============================================================

    function sendMessage() {
        const text = msgInput.value.trim();
        if (!text || currentChatId === null) return;

        const payload = {
            message: text,
            sender_id: Number(currentUserId),
            chat_id: Number(currentChatId),
        };

        appendMessageToUI(payload);

        SendChatMessage(Number(currentChatId), payload)
            .then(() => {
                console.log("[Send] Сообщение отправлено:", payload);
            })
            .catch((err) => {
                console.error("[Send] Ошибка:", err);
            });

        msgInput.value = "";
    }

    sendBtn.addEventListener("click", sendMessage);
    msgInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    searchInput.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter") return;
        const query = searchInput.value.trim();
        if (!query) return;

        searchInput.value = "";

        try {
            const targetUser = await GetUserID(query);
            const targetUserId = targetUser.user_id;

            const chatResp = await CreateChat({
                author: currentUserId,
                chat_name: query,
                target_user: targetUserId,
            });
            const newChatId = chatResp.chat_id;

            await refreshChatList(
                listEl,
                chatWindow,
                titleEl,
                messagesContainer,
            );
            await openChatById(
                newChatId,
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
