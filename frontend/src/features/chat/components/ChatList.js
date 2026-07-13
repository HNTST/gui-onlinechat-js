import { AVATAR_STUB } from "../../../core/constants.js";
import { loadAvatarInto } from "../../../core/components/Avatar.js";
import { putProfile } from "../profilesCache.js";
import { getChatsWithProfiles } from "../chatService.js";
import { isOnline, onStatusChange } from "../onlineUsers.js";

let cachedEntries = [];
let cachedListEl = null;
let cachedOnChatClick = null;

export function renderChatList() {
    const ul = document.createElement("ul");
    ul.id = "chats-list";
    ul.className = "flex-1 overflow-y-auto list-none p-0 pb-2";
    ul.innerHTML = '<li class="p-5 text-center text-base-content/30 text-sm">Загрузка...</li>';
    return ul;
}

function createChatItem(entry, onChatClick) {
    const chat = entry.chat;

    const li = document.createElement("li");
    li.className =
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-primary/10 border-l-3 border-l-transparent hover:border-l-primary group";
    li.dataset.chatId = chat.id;

    const avatarImg = document.createElement("img");
    avatarImg.className =
        "w-9 h-9 rounded object-cover bg-base-300 border border-secondary flex-shrink-0";
    avatarImg.src = AVATAR_STUB;
    avatarImg.alt = "";

    const infoDiv = document.createElement("div");
    infoDiv.className = "flex flex-col min-w-0 flex-1";

    const nameDiv = document.createElement("div");
    nameDiv.className = "text-sm font-bold text-base-content truncate flex items-center gap-1.5";
    nameDiv.textContent = entry.profile?.username || chat.name || "Чат #" + chat.id;

    const onlineDot = document.createElement("span");
    onlineDot.className = "inline-block w-2 h-2 rounded-full bg-success flex-shrink-0 hidden";
    onlineDot.dataset.onlineDot = "";
    nameDiv.appendChild(onlineDot);

    infoDiv.appendChild(nameDiv);

    if (chat.last_message?.text) {
        const previewDiv = document.createElement("div");
        previewDiv.className = "text-xs text-base-content/40 truncate mt-0.5";
        let t = chat.last_message.text;
        previewDiv.textContent = t.length > 40 ? t.slice(0, 40) + "..." : t;
        infoDiv.appendChild(previewDiv);
    }

    li.appendChild(avatarImg);
    li.appendChild(infoDiv);

    if (chat.unread_count > 0) {
        const badge = document.createElement("div");
        badge.className =
            "badge badge-primary badge-sm text-base-100 font-bold min-w-[18px] h-[18px] flex-shrink-0";
        badge.textContent = chat.unread_count > 99 ? "99+" : chat.unread_count;
        li.appendChild(badge);
    }

    li.addEventListener("click", () => onChatClick(chat.id, entry.profile?.username || chat.name));

    if (entry.profile?.id) {
        li.dataset.partnerId = entry.profile.id;
        putProfile(entry.profile.id, entry.profile);
        loadAvatarInto(avatarImg, entry.profile.avatar_id);
        if (isOnline(entry.profile.id)) {
            onlineDot.classList.remove("hidden");
        }
    }

    return li;
}

function renderFromCache() {
    if (!cachedListEl || !cachedOnChatClick) return;

    const activeId = cachedListEl.querySelector(".bg-primary\\/10")?.dataset.chatId;

    const fragment = document.createDocumentFragment();

    if (cachedEntries.length === 0) {
        const empty = document.createElement("li");
        empty.className = "p-5 text-center text-base-content/30 text-sm";
        empty.textContent = "Нет доступных чатов";
        fragment.appendChild(empty);
    } else {
        cachedEntries.forEach((entry) => {
            const li = createChatItem(entry, cachedOnChatClick);
            if (activeId && li.dataset.chatId === activeId) {
                li.classList.add("bg-primary/10", "border-l-primary");
            }
            fragment.appendChild(li);
        });
    }

    cachedListEl.replaceChildren(fragment);
}

export async function refreshChatList(listEl, onChatClick) {
    cachedListEl = listEl;
    cachedOnChatClick = onChatClick;

    try {
        const resp = await getChatsWithProfiles();
        cachedEntries = resp.chats || [];

        renderFromCache();

        if (!listEl._statusListener) {
            listEl._statusListener = onStatusChange(() => {
                listEl.querySelectorAll("[data-partner-id]").forEach((li) => {
                    const dot = li.querySelector("[data-online-dot]");
                    if (!dot) return;
                    if (isOnline(li.dataset.partnerId)) {
                        dot.classList.remove("hidden");
                    } else {
                        dot.classList.add("hidden");
                    }
                });
            });
        }
    } catch (err) {
        console.error("Ошибка загрузки чатов:", err);
        listEl.innerHTML =
            '<li class="p-5 text-center text-error text-sm">Ошибка загрузки чатов</li>';
    }
}

export function updateLastMessage(chatId, text, sentAt) {
    const entry = cachedEntries.find((e) => Number(e.chat.id) === Number(chatId));
    if (!entry) return;

    entry.chat.last_message = {
        id: entry.chat.last_message?.id ?? 0,
        text: text,
        sender_id: 0,
        sent_at: sentAt || new Date().toISOString(),
        is_read: false,
    };

    cachedEntries.sort((a, b) => {
        const ta = a.chat.last_message?.sent_at || "";
        const tb = b.chat.last_message?.sent_at || "";
        return tb.localeCompare(ta);
    });

    if (!cachedListEl) return;

    const existingLi = cachedListEl.querySelector(`[data-chat-id="${chatId}"]`);
    if (existingLi) {
        const previewDiv = existingLi.querySelector(".text-xs.truncate");
        if (previewDiv) {
            let t = text || "";
            previewDiv.textContent = t.length > 40 ? t.slice(0, 40) + "..." : t;
        }

        const firstItem = cachedListEl.querySelector("li");
        if (firstItem && firstItem !== existingLi) {
            existingLi.style.transition = "opacity 0.15s";
            existingLi.style.opacity = "0.5";
            cachedListEl.prepend(existingLi);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    existingLi.style.opacity = "1";
                });
            });
        }
    } else {
        renderFromCache();
    }
}
