let currentUserId = null;
let currentUsername = null;
let currentChatId = null;
let windowActive = document.hasFocus();

const unreadCounts = new Map();
const unreadListeners = new Set();

export function setCurrentUser(userId, username) {
    currentUserId = userId;
    currentUsername = username;
}

export function getCurrentUserId() {
    return currentUserId;
}

export function getCurrentUsername() {
    return currentUsername;
}

export function setCurrentChatId(chatId) {
    currentChatId = chatId;
    window.currentOpenChatId = chatId;
    if (chatId !== null) {
        clearUnread(chatId);
    }
}

export function getCurrentChatId() {
    return currentChatId;
}

export function clearCurrentChatId() {
    currentChatId = null;
    window.currentOpenChatId = null;
}

export function setWindowActive(active) {
    windowActive = active;
    if (active && currentChatId !== null) {
        clearUnread(currentChatId);
    }
}

export function isWindowActive() {
    return windowActive;
}

export function incrementUnread(chatId) {
    const id = Number(chatId);
    unreadCounts.set(id, (unreadCounts.get(id) || 0) + 1);
    notifyUnread();
}

export function clearUnread(chatId) {
    const id = Number(chatId);
    if (unreadCounts.has(id)) {
        unreadCounts.delete(id);
        notifyUnread();
    }
}

export function getUnreadCount(chatId) {
    return unreadCounts.get(Number(chatId)) || 0;
}

export function onUnreadChange(cb) {
    unreadListeners.add(cb);
    return () => unreadListeners.delete(cb);
}

function notifyUnread() {
    unreadListeners.forEach((cb) => cb());
}
