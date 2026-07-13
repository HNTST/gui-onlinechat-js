import { AVATAR_STUB } from "../../core/constants.js";
import { loadAvatarInto } from "../../core/components/Avatar.js";
import { setCurrentUser, setCurrentChatId, getCurrentChatId, getCurrentUserId, clearCurrentChatId } from "./chatState.js";
import { initCurrentUserProfile, putProfile, getCachedProfile, loadProfile } from "./profilesCache.js";
import { sendMessage, getChatHistory, getChatMembers, editMessage, deleteMessage, findOrCreateChat, markMessagesAsRead } from "./chatService.js";
import { logout } from "../auth/authService.js";
import { isOnline } from "./onlineUsers.js";
import { renderChatList, refreshChatList } from "./components/ChatList.js";
import { renderMessage } from "./components/MessageBubble.js";
import { renderChatHeader } from "./components/ChatHeader.js";
import { renderInputBar } from "./components/InputBar.js";
import { openProfileModal } from "../profile/components/ProfileModal.js";

let sidebar, chatWindow, titleEl, messagesContainer, listEl, searchInput;
let chatPartnerId = null;

export function initChatWorkspace(containerId, userId, username, userData) {
    initCurrentUserProfile(userId, username, userData);
    setCurrentUser(userId, username);

    const container = document.getElementById(containerId);
    if (!container) return;
    container.classList.remove("hidden");

    buildLayout(container, userId, username);
    bindEvents();
    initWsListener();

    refreshChatList(listEl, (chatId, chatName) => {
        openChatById(chatId, chatName);
    });
}

function buildLayout(container, userId, username) {
    container.innerHTML = "";

    // Sidebar
    sidebar = document.createElement("div");
    sidebar.id = "sidebar";
    sidebar.className = "bg-base-200/80 border border-secondary/50 flex flex-col overflow-hidden rounded";

    // User panel
    const userPanel = document.createElement("div");
    userPanel.id = "profile-card";
    userPanel.className =
        "flex items-center gap-3 px-4 py-3.5 cursor-pointer bg-gradient-to-b from-secondary/50 to-transparent border-b border-secondary/40 hover:from-secondary/60 transition-colors flex-shrink-0";

    const avatarWrap = document.createElement("div");
    avatarWrap.className = "avatar";
    const avatarInner = document.createElement("div");
    avatarInner.className = "w-10 rounded border border-secondary";
    const avatarImg = document.createElement("img");
    avatarImg.id = "sidebar-avatar";
    avatarImg.src = AVATAR_STUB;
    avatarImg.alt = "avatar";
    avatarInner.appendChild(avatarImg);
    avatarWrap.appendChild(avatarInner);

    const userInfo = document.createElement("div");
    userInfo.className = "flex flex-col min-w-0";
    const displayName = document.createElement("div");
    displayName.id = "display-name";
    displayName.className = "text-sm font-bold text-base-content truncate";
    displayName.textContent = username;
    const status = document.createElement("div");
    status.className = "text-[10px] text-success uppercase tracking-widest mt-0.5";
    status.textContent = "В сети";
    userInfo.appendChild(displayName);
    userInfo.appendChild(status);

    userPanel.appendChild(avatarWrap);
    userPanel.appendChild(userInfo);

    // Logout button
    const logoutBtn = document.createElement("button");
    logoutBtn.className = "ml-auto btn btn-ghost btn-xs text-base-content/30 hover:text-error shrink-0";
    logoutBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
    logoutBtn.title = "Выйти";
    logoutBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        doLogout();
    });
    userPanel.appendChild(logoutBtn);

    // Load avatar
    const profile = getCachedProfile(userId);
    if (profile?.avatar_id) loadAvatarInto(avatarImg, profile.avatar_id);

    // Search
    const searchContainer = document.createElement("div");
    searchContainer.className = "px-4 py-2 flex-shrink-0";
    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.id = "search-input";
    searchInput.placeholder = "Найти человека или канал...";
    searchInput.autocomplete = "off";
    searchInput.className =
        "input input-bordered input-sm w-full bg-base-100 border-secondary text-primary placeholder:text-base-content/30 focus:border-primary";
    searchContainer.appendChild(searchInput);

    // Divider
    const divider = document.createElement("div");
    divider.className = "px-4 pt-2.5 pb-1.5 text-[11px] text-base-content/40 uppercase tracking-[2px] font-bold flex-shrink-0";
    divider.textContent = "Чаты";

    // Chat list
    listEl = renderChatList();

    sidebar.appendChild(userPanel);
    sidebar.appendChild(searchContainer);
    sidebar.appendChild(divider);
    sidebar.appendChild(listEl);

    // Main content
    const mainContent = document.createElement("div");
    mainContent.id = "main-content";

    chatWindow = document.createElement("div");
    chatWindow.id = "chat-window";
    chatWindow.className =
        "absolute left-4 right-4 bottom-4 h-[calc(75%-16px)] bg-base-200/80 border border-secondary/50 shadow-2xl flex flex-col z-10 rounded";

    const header = renderChatHeader();
    titleEl = header.querySelector("#chat-window-title");

    messagesContainer = document.createElement("div");
    messagesContainer.id = "messages-container";
    messagesContainer.className = "flex-1 p-5 overflow-y-auto flex flex-col gap-3";

    const inputBar = renderInputBar();

    chatWindow.appendChild(header);
    chatWindow.appendChild(messagesContainer);
    chatWindow.appendChild(inputBar);
    mainContent.appendChild(chatWindow);

    container.appendChild(sidebar);
    container.appendChild(mainContent);
}

function bindEvents() {
    // Profile card click — open own profile
    document.getElementById("profile-card")?.addEventListener("click", () => {
        openProfileModal(getCurrentUserId());
    });

    // Chat header title click — open partner profile
    titleEl?.addEventListener("click", () => {
        if (chatPartnerId != null) openProfileModal(chatPartnerId);
    });
    if (titleEl) titleEl.style.cursor = "pointer";

    // Close chat
    document.getElementById("close-chat-btn")?.addEventListener("click", closeChat);

    // Send message
    const msgInput = document.getElementById("msg-input");
    const sendBtn = document.getElementById("msg-send-btn");

    sendBtn?.addEventListener("click", doSendMessage);
    msgInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doSendMessage();
    });

    // Search
    searchInput?.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter") return;
        const query = searchInput.value.trim();
        if (!query) return;
        searchInput.value = "";

        try {
            const chatResp = await findOrCreateChat(query);
            await refreshChatList(listEl, (chatId, chatName) => {
                openChatById(chatId, chatName);
            });
            await openChatById(chatResp.chat_id, query);
        } catch (err) {
            console.error("Ошибка поиска/создания чата:", err);
        }
    });

    // Save/cancel inline edit (delegation)
    messagesContainer?.addEventListener("click", handleMsgClick);
    messagesContainer?.addEventListener("keydown", handleMsgKeydown);

    // Right-click context menu on messages
    messagesContainer?.addEventListener("contextmenu", handleContextMenu);

    // Close context menu on any left click
    document.addEventListener("click", hideContextMenu);

    // Profile modal backdrop
    const modal = document.getElementById("profile-modal");
    modal?.addEventListener("click", (e) => {
        if (e.target === modal) modal.close();
    });

    // Scroll to bottom → mark as read
    let scrollReadTimeout = null;
    messagesContainer?.addEventListener("scroll", () => {
        if (!isScrolledToBottom()) return;
        if (scrollReadTimeout) return;
        scrollReadTimeout = setTimeout(() => {
            scrollReadTimeout = null;
            markVisibleAsRead();
        }, 500);
    });
}

// ============================================================
// Context menu (right-click)
// ============================================================

let ctxMenu = null;

function createContextMenu() {
    if (ctxMenu) return ctxMenu;
    ctxMenu = document.createElement("div");
    ctxMenu.id = "msg-context-menu";
    ctxMenu.className = "fixed z-[999] hidden";
    ctxMenu.innerHTML = `
        <ul class="menu p-1 shadow bg-base-200 border border-secondary rounded-sm w-40 text-xs">
            <li><a class="ctx-edit">Изменить</a></li>
            <li><a class="ctx-delete text-error">Удалить</a></li>
        </ul>
    `;
    document.body.appendChild(ctxMenu);

    ctxMenu.querySelector(".ctx-edit")?.addEventListener("click", () => {
        const msgId = ctxMenu.dataset.targetMsgId;
        if (msgId) {
            const msgEl = messagesContainer.querySelector(`[data-msg-id="${msgId}"]`);
            if (msgEl && msgEl.dataset.editing !== "true") startEdit(msgEl);
        }
        hideContextMenu();
    });

    ctxMenu.querySelector(".ctx-delete")?.addEventListener("click", () => {
        const msgId = ctxMenu.dataset.targetMsgId;
        if (msgId) {
            const msgEl = messagesContainer.querySelector(`[data-msg-id="${msgId}"]`);
            if (msgEl) doDeleteMessage(msgEl);
        }
        hideContextMenu();
    });

    return ctxMenu;
}

function handleContextMenu(e) {
    const msgEl = e.target.closest("[data-msg-id]");
    if (!msgEl) return;

    const pid = Number(msgEl.dataset.senderId);
    const isOwn = pid === Number(getCurrentUserId());
    const isDeleted = msgEl.dataset.editing === "true" || msgEl.querySelector(".text-base-content\\/30.italic");

    if (!isOwn || isDeleted || msgEl.dataset.msgId == null) return;

    e.preventDefault();

    const menu = createContextMenu();
    menu.dataset.targetMsgId = msgEl.dataset.msgId;
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    menu.classList.remove("hidden");
}

function hideContextMenu() {
    if (ctxMenu) ctxMenu.classList.add("hidden");
}

function handleMsgClick(e) {
    const saveBtn = e.target.closest(".msg-save-btn");
    if (saveBtn) {
        const msgEl = saveBtn.closest("[data-msg-id]");
        if (msgEl) doSaveEdit(msgEl);
        return;
    }

    const cancelBtn = e.target.closest(".msg-cancel-btn");
    if (cancelBtn) {
        const msgEl = cancelBtn.closest("[data-msg-id]");
        if (msgEl) doCancelEdit(msgEl);
        return;
    }
}

function handleMsgKeydown(e) {
    if (e.key !== "Enter" && e.key !== "Escape") return;
    const input = e.target.closest("input");
    if (!input) return;
    const msgEl = input.closest("[data-msg-id]");
    if (!msgEl) return;
    e.preventDefault();
    if (e.key === "Enter") doSaveEdit(msgEl);
    else doCancelEdit(msgEl);
}

// ============================================================
// Chat open / close
// ============================================================

async function openChatById(chatId, chatName) {
    listEl.querySelectorAll("[data-chat-id]").forEach((el) => {
        el.classList.remove("bg-primary/10", "border-l-primary");
    });
    const targetLi = listEl.querySelector(`[data-chat-id="${chatId}"]`);
    if (targetLi) {
        targetLi.classList.add("bg-primary/10", "border-l-primary");
        const badge = targetLi.querySelector(".badge");
        if (badge) badge.remove();
    }

    setCurrentChatId(chatId);

    const chatAvatar = document.getElementById("chat-avatar");
    if (chatAvatar) chatAvatar.src = AVATAR_STUB;

    titleEl.textContent = chatName || "Чат #" + chatId;
    messagesContainer.innerHTML = "";

    messagesContainer.appendChild(
        renderMessage(`Вы вошли в текстовой канал "${chatName || "Чат #" + chatId}". Удачной игры!`, true)
    );

    try {
        const history = await getChatHistory(chatId);
        if (history.profiles) {
            for (const [sid, profile] of Object.entries(history.profiles)) {
                putProfile(sid, profile);
            }
        }
        if (history.messages) {
            history.messages.forEach((msg) => {
                messagesContainer.appendChild(
                    renderMessage(msg.message || "(пусто)", false, msg.sent_at, msg.sender_id, msg.id, msg.is_edited, msg.is_deleted, msg.is_read)
                );
            });
            const lastMsg = history.messages[history.messages.length - 1];
            if (lastMsg?.id) {
                markMessagesAsRead(chatId, lastMsg.id)
                    .then(() => refreshReadChecks())
                    .catch(() => {});
            }
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
        console.error("Ошибка загрузки истории чата:", err);
    }

    try {
        const membersResp = await getChatMembers(chatId);
        const otherMemberId = (membersResp.members || []).find((m) => Number(m) !== Number(getCurrentUserId()));
        chatPartnerId = otherMemberId ? Number(otherMemberId) : null;
        window.currentChatPartnerId = chatPartnerId;
        if (otherMemberId) {
            const profile = getCachedProfile(otherMemberId) || (await loadProfile(Number(otherMemberId)));
            if (chatAvatar && profile?.avatar_id) {
                loadAvatarInto(chatAvatar, profile.avatar_id);
            }
            if (titleEl && profile?.username) {
                titleEl.textContent = profile.username;
            }
            const dot = document.getElementById("chat-header-online-dot");
            if (dot) {
                if (isOnline(otherMemberId)) {
                    dot.classList.remove("hidden");
                } else {
                    dot.classList.add("hidden");
                }
            }
        }
    } catch (_e) { chatPartnerId = null; window.currentChatPartnerId = null; }

    chatWindow.classList.add("slide-up");
    document.getElementById("msg-input")?.focus();
}

function closeChat() {
    chatWindow.classList.remove("slide-up");
    listEl.querySelectorAll("[data-chat-id]").forEach((el) => {
        el.classList.remove("bg-primary/10", "border-l-primary");
    });
    chatPartnerId = null;
    window.currentChatPartnerId = null;
    const dot = document.getElementById("chat-header-online-dot");
    if (dot) dot.classList.add("hidden");
    clearCurrentChatId();
}

async function doLogout() {
    try {
        await logout();
    } catch (_e) {}
    closeChat();
    const chatLayout = document.getElementById("chat-layout");
    const authScreen = document.getElementById("auth-screen");
    chatLayout.classList.add("hidden");
    authScreen.classList.remove("hidden");
    authScreen.style.opacity = 1;
}

// ============================================================
// Message CRUD
// ============================================================

function doSendMessage() {
    const input = document.getElementById("msg-input");
    const text = input?.value.trim();
    const chatId = getCurrentChatId();
    if (!text || chatId === null) return;
    sendMessage(chatId, text);
    input.value = "";
}

function startEdit(msgEl) {
    const textEl = msgEl.querySelector("div:first-child");
    if (!textEl) return;
    const originalText = textEl.textContent;
    msgEl.dataset.originalText = originalText;
    msgEl.dataset.editing = "true";
    msgEl.style.borderColor = "rgb(163, 129, 68)";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "input input-ghost w-full bg-transparent border-b border-primary text-base-content text-[13px] focus:outline-none p-0";
    input.value = originalText;

    textEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    const dropdown = msgEl.querySelector(".dropdown");
    if (dropdown) {
        dropdown.className = "absolute -top-1 right-0 flex gap-0";
        dropdown.innerHTML =
            `<button class="msg-save-btn btn btn-ghost btn-xs text-success/70 hover:text-success" title="Сохранить">✓</button>` +
            `<button class="msg-cancel-btn btn btn-ghost btn-xs text-error/70 hover:text-error" title="Отмена">✕</button>`;
    }
}

function finishEdit(msgEl, text) {
    msgEl.dataset.editing = "false";
    msgEl.style.borderColor = "";
    const input = msgEl.querySelector("input");
    if (!input) return;

    const textDiv = document.createElement("div");
    textDiv.className = "text-base-content/80";
    textDiv.textContent = text;
    input.replaceWith(textDiv);

    const actions = msgEl.querySelector("div:last-child");
    if (actions) {
        actions.className = "absolute -top-1 right-0 dropdown dropdown-end";
        actions.innerHTML =
            `<button tabindex="0" class="msg-menu-btn btn btn-ghost btn-xs text-base-content/30 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">▾</button>` +
            `<ul tabindex="0" class="dropdown-content menu p-1 shadow bg-base-200 border border-secondary rounded-sm w-36 text-xs z-20">` +
            `<li><a class="msg-edit-action">Изменить</a></li>` +
            `<li><a class="msg-delete-action text-error">Удалить</a></li>` +
            `</ul>`;
    }
}

function doDeleteMessage(msgEl) {
    const msgId = msgEl.dataset.msgId;
    const chatId = getCurrentChatId();
    if (!msgId || chatId === null) return;

    deleteMessage(chatId, msgId)
        .then(() => {
            const textEl = msgEl.querySelector("div:first-child");
            if (textEl) {
                textEl.textContent = "Сообщение удалено";
                textEl.className = "text-base-content/30 italic";
            }
            msgEl.style.opacity = "0.4";
            const actions = msgEl.querySelector("div:last-child");
            if (actions) actions.remove();
        })
        .catch((err) => console.error("[Delete] Ошибка:", err));
}

// ============================================================
// WS listener
// ============================================================

function initWsListener() {
    window.__onWsMessage = (msg) => {
        if (Number(msg.chat_id) === Number(window.currentOpenChatId)) {
            appendMessageToUI(msg);
            if (msg.id && isScrolledToBottom()) {
                markMessagesAsRead(msg.chat_id, msg.id)
                    .then(() => refreshReadChecks())
                    .catch(() => {});
            }
        }
    };
}

function isScrolledToBottom() {
    if (!messagesContainer) return false;
    return messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 50;
}

function markVisibleAsRead() {
    if (!messagesContainer || !window.currentOpenChatId) return;
    const allMsgs = messagesContainer.querySelectorAll("[data-msg-id]");
    if (allMsgs.length === 0) return;
    const lastEl = allMsgs[allMsgs.length - 1];
    const lastId = Number(lastEl.dataset.msgId);
    if (!lastId) return;
    markMessagesAsRead(window.currentOpenChatId, lastId)
        .then(() => refreshReadChecks())
        .catch(() => {});
}

const READ_SVG = `<svg width="12" height="8" viewBox="0 0 16 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 5l3 3 6-7"/><path d="M6 5l3 3 6-7"/></svg>`;

function refreshReadChecks() {
    if (!messagesContainer) return;
    const myId = Number(getCurrentUserId());
    messagesContainer.querySelectorAll("[data-msg-id]").forEach((el) => {
        if (Number(el.dataset.senderId) !== myId) return;
        const check = el.querySelector("[data-read-check]");
        if (!check) return;
        if (check.dataset.read === "true") return;
        check.dataset.read = "true";
        check.className = "text-[10px] text-primary";
        check.innerHTML = READ_SVG;
    });
}

function appendMessageToUI(msg) {
    if (!messagesContainer) return;

    if (msg.id != null) {
        const exists = messagesContainer.querySelector(
            `[data-msg-id="${msg.id}"][data-sent-at="${msg.sent_at}"][data-sender-id="${msg.sender_id}"]`
        );
        if (exists) return;
    }

    const el = renderMessage(msg.message || "", false, msg.sent_at || null, Number(msg.sender_id), msg.id, msg.is_edited, msg.is_deleted, msg.is_read);
    messagesContainer.appendChild(el);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
