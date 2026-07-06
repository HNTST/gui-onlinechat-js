import {
    GetUserChats,
    GetChatMessages,
    CreateChat,
    GetUserID,
    GetUserData,
    SendChatMessage,
} from "../../wailsjs/go/main/App";
import { EventsOn } from "../../wailsjs/runtime";

let currentUserId = null;
let currentUsername = null;
let currentChatId = null;

const userCache = {};

function resolveUsername(userId) {
    if (userId === currentUserId) return Promise.resolve(currentUsername);
    if (userCache[userId]) return Promise.resolve(userCache[userId]);
    return GetUserData(userId)
        .then((data) => {
            userCache[userId] = data.username;
            return data.username;
        })
        .catch(() => "User #" + userId);
}

function openProfileModal() {
    document.getElementById("profile-modal").classList.remove("hidden");
}

function closeProfileModal() {
    document.getElementById("profile-modal").classList.add("hidden");
}

// Рендерит сообщение для истории / системных сообщений
function renderMessage(author, text, isSystem) {
    const el = document.createElement("div");
    el.className = "msg" + (isSystem ? " system" : "");
    if (isSystem) {
        el.textContent = text;
    } else {
        el.innerHTML =
            `<div class="msg-author">${author}</div>` +
            `<div class="msg-text">${text}</div>`;
    }
    return el;
}

// ============================================================
// AppendMessageToUI — рендер сообщения из WebSocket в DOM
// ============================================================

function appendMessageToUI(msg) {
    const container = document.getElementById("messages-container");
    if (!container) {
        console.error("[UI] #messages-container НЕ НАЙДЕН в DOM!");
        return;
    }
    console.log("[UI] appendMessageToUI вызван, msg:", msg);

    // Дедупликация по последнему DOM-элементу
    const lastMsgEl = container.lastElementChild;
    if (lastMsgEl && !lastMsgEl.classList.contains("system")) {
        const lastAuthor =
            lastMsgEl.querySelector(".msg-author")?.textContent || "";
        const lastText =
            lastMsgEl.querySelector(".msg-text")?.textContent || "";

        const authorForDedup =
            Number(msg.sender_id) === Number(currentUserId)
                ? currentUsername
                : userCache[msg.sender_id] || "User #" + msg.sender_id;

        if (lastText === (msg.message || "") && lastAuthor === authorForDedup) {
            console.log("[UI] Дубликат, пропускаем");
            return;
        }
    }

    // Определяем имя отправителя
    const author =
        Number(msg.sender_id) === Number(currentUserId)
            ? currentUsername
            : userCache[msg.sender_id] || "User #" + msg.sender_id;

    container.appendChild(renderMessage(author, msg.message || "", false));
    container.scrollTop = container.scrollHeight;
    console.log("[UI] Сообщение добавлено в DOM");
}

// ============================================================
// EventsOn — приём сообщений от Go WebSocket bridge
// ============================================================

export function initChatEvents() {
    console.log("[EventsOn] initChatEvents() вызван — регистрируем слушатель 'new_message'");

    EventsOn("new_message", (data) => {
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
    if (targetLi) targetLi.classList.add("active");

    currentChatId = chatId;
    window.currentOpenChatId = chatId;
    titleEl.textContent = chatName || "Чат #" + chatId;
    messagesContainer.innerHTML = "";

    messagesContainer.appendChild(
        renderMessage(
            null,
            `Вы вошли в текстовый канал "${chatName || "Чат #" + chatId}". Удачной игры!`,
            true,
        ),
    );

    try {
        const msgResp = await GetChatMessages(chatId, null, null);
        if (msgResp.messages) {
            const uniqueIds = msgResp.messages
                .map((m) => m.sender_id)
                .filter((id) => id !== currentUserId && !userCache[id]);
            await Promise.all(uniqueIds.map((id) => resolveUsername(id)));

            msgResp.messages.forEach((msg) => {
                const author =
                    Number(msg.sender_id) === Number(currentUserId)
                        ? currentUsername
                        : userCache[msg.sender_id] || "User #" + msg.sender_id;
                messagesContainer.appendChild(
                    renderMessage(author, msg.message || "(пусто)", false),
                );
            });
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
        console.error("Ошибка загрузки сообщений:", err);
    }

    chatWindow.classList.add("slide-up");
}

async function refreshChatList(
    listEl,
    chatWindow,
    titleEl,
    messagesContainer,
    afterChatId,
) {
    try {
        const resp = await GetUserChats(currentUserId);
        listEl.innerHTML = "";

        if (!resp.chats || resp.chats.length === 0) {
            listEl.innerHTML =
                '<li style="padding: 20px; text-align: center; color: #5d6266;">Нет доступных чатов</li>';
            return;
        }

        resp.chats.forEach((chat) => {
            const li = document.createElement("li");
            li.className = "chat-item";
            li.textContent = "# " + (chat.name || "Чат #" + chat.id);
            li.dataset.chatId = chat.id;

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
        });
    } catch (err) {
        console.error("Ошибка загрузки чатов:", err);
        listEl.innerHTML =
            '<li style="padding: 20px; text-align: center; color: #c0392b;">Ошибка загрузки чатов</li>';
    }
}

export function initChats(containerId, userId, username) {
    const container = document.getElementById(containerId);
    if (!container) return;

    currentUserId = userId;
    currentUsername = username;

    container.innerHTML = `
        <div id="sidebar">
            <div class="profile-card" id="profile-card">
                <div class="avatar-stub"></div>
                <div class="profile-info">
                    <div class="profile-name" id="display-name">${username}</div>
                    <div class="profile-status">В главном меню</div>
                </div>
            </div>

            <div class="search-container">
                <input
                    type="text"
                    class="search-input"
                    id="search-input"
                    placeholder="Найти человека или канал..."
                    autocomplete="off"
                />
            </div>

            <div class="sidebar-category-title">Ваши чаты</div>
            <ul class="chats-list" id="chats-list">
                <li style="padding: 20px; text-align: center; color: #5d6266;">Загрузка...</li>
            </ul>
        </div>

        <div id="main-content">
            <div id="chat-window">
                <div class="chat-header">
                    <div class="chat-title" id="chat-window-title">Канал</div>
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

    document
        .getElementById("profile-card")
        .addEventListener("click", openProfileModal);
    document
        .getElementById("modal-close-btn")
        .addEventListener("click", closeProfileModal);
    document.getElementById("profile-modal").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) closeProfileModal();
    });

    const listEl = document.getElementById("chats-list");
    const chatWindow = document.getElementById("chat-window");
    const titleEl = document.getElementById("chat-window-title");
    const messagesContainer = document.getElementById("messages-container");
    const closeBtn = document.getElementById("close-chat-btn");
    const msgInput = document.getElementById("msg-input");
    const sendBtn = document.getElementById("msg-send-btn");
    const searchInput = document.getElementById("search-input");

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

        // Оптимистичный рендеринг — показываем сразу, без ожидания WS echo
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
        searchInput.placeholder = "Поиск...";

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

        searchInput.placeholder = "Найти человека или канал...";
    });

    refreshChatList(listEl, chatWindow, titleEl, messagesContainer);
}
