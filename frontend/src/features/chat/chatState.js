let currentUserId = null;
let currentUsername = null;
let currentChatId = null;

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
}

export function getCurrentChatId() {
    return currentChatId;
}

export function clearCurrentChatId() {
    currentChatId = null;
    window.currentOpenChatId = null;
}
