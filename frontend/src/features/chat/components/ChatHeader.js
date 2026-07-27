import { AVATAR_STUB } from "../../../core/constants.js";
import { isOnline, onStatusChange } from "../onlineUsers.js";
import { formatLastSeen } from "../../../core/timeUtils.js";

let lastSeenText = null;

export function renderChatHeader() {
    const header = document.createElement("div");
    header.className =
        "px-5 py-3 bg-base-200 border-b border-secondary/30 flex justify-between items-center flex-shrink-0";

    const info = document.createElement("div");
    info.className = "flex items-center gap-2.5";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    const avatarInner = document.createElement("div");
    avatarInner.className = "w-9 rounded border border-secondary";
    const avatarImg = document.createElement("img");
    avatarImg.id = "chat-avatar";
    avatarImg.src = AVATAR_STUB;
    avatarImg.alt = "";
    avatarInner.appendChild(avatarImg);
    avatar.appendChild(avatarInner);

    const titleCol = document.createElement("div");
    titleCol.className = "flex flex-col";

    const title = document.createElement("div");
    title.id = "chat-window-title";
    title.className = "text-primary uppercase tracking-wider font-bold flex items-center gap-1.5";
    title.textContent = "Канал";

    const onlineDot = document.createElement("span");
    onlineDot.id = "chat-header-online-dot";
    onlineDot.className = "inline-block w-2 h-2 rounded-full bg-success flex-shrink-0 hidden";
    title.appendChild(onlineDot);

    lastSeenText = document.createElement("div");
    lastSeenText.id = "chat-header-last-seen";
    lastSeenText.className = "text-[10px] text-base-content/40 hidden";

    titleCol.appendChild(title);
    titleCol.appendChild(lastSeenText);

    info.appendChild(avatar);
    info.appendChild(titleCol);

    const closeBtn = document.createElement("button");
    closeBtn.id = "close-chat-btn";
    closeBtn.className =
        "btn btn-ghost btn-xs text-base-content/40 hover:text-white text-lg";
    closeBtn.innerHTML = "&times;";

    header.appendChild(info);
    header.appendChild(closeBtn);

    onStatusChange(() => {
        const dot = document.getElementById("chat-header-online-dot");
        if (!dot || !window.currentChatPartnerId) return;
        if (isOnline(window.currentChatPartnerId)) {
            dot.classList.remove("hidden");
            if (lastSeenText) lastSeenText.classList.add("hidden");
        } else {
            dot.classList.add("hidden");
            updateLastSeen();
        }
    });

    return header;
}

export function setPartnerLastSeen(isoString) {
    if (!lastSeenText) return;
    if (!isoString) {
        lastSeenText.classList.add("hidden");
        return;
    }
    lastSeenText.dataset.lastSeen = isoString;
    if (window.currentChatPartnerId && !isOnline(window.currentChatPartnerId)) {
        updateLastSeen();
    }
}

function updateLastSeen() {
    if (!lastSeenText) return;
    const iso = lastSeenText.dataset.lastSeen;
    if (!iso) {
        lastSeenText.classList.add("hidden");
        return;
    }
    const text = formatLastSeen(iso);
    if (text) {
        lastSeenText.textContent = text;
        lastSeenText.classList.remove("hidden");
    } else {
        lastSeenText.classList.add("hidden");
    }
}
