import { UserAPI } from "../../core/wailsBridge.js";
import { getCurrentUserId } from "./chatState.js";

const cache = {};

export function putProfile(userId, profile) {
    if (profile) cache[userId] = profile;
}

export function getCachedProfile(userId) {
    return cache[userId] || null;
}

export async function loadProfile(userId) {
    if (cache[userId]) return cache[userId];

    try {
        const fetcher =
            Number(userId) === Number(getCurrentUserId())
                ? UserAPI.getSelfData()
                : UserAPI.getUserData(userId);
        const data = await fetcher;
        cache[userId] = data;
        return data;
    } catch {
        const stub = {
            id: userId,
            username: "User #" + userId,
            avatar_id: null,
            reg: "",
        };
        cache[userId] = stub;
        return stub;
    }
}

export function initCurrentUserProfile(userId, username, userData) {
    cache[userId] = {
        id: userId,
        username: username,
        avatar_id: userData?.avatar_id || null,
        reg: userData?.reg || "",
    };
}
