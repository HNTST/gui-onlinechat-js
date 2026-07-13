import { ChatAPI, UserAPI } from "../../core/wailsBridge.js";

export async function getChatsWithProfiles() {
    return ChatAPI.getChatsWithProfiles();
}

export async function getChatHistory(chatId) {
    return ChatAPI.getChatHistory(chatId, null, null);
}

export async function findOrCreateChat(query) {
    return ChatAPI.findOrCreateChat(query);
}

export async function getChatMembers(chatId) {
    return ChatAPI.getChatMembers(chatId);
}

export async function sendMessage(chatId, text) {
    return ChatAPI.sendMessage(Number(chatId), { message: text });
}

export async function editMessage(chatId, msgId, newText) {
    return ChatAPI.editMessage(Number(chatId), Number(msgId), { text: newText });
}

export async function deleteMessage(chatId, msgId) {
    return ChatAPI.deleteMessage(Number(chatId), Number(msgId));
}
