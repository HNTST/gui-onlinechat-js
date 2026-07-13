import { AVATAR_STUB } from "../../../core/constants.js";
import { isOnline, onStatusChange } from "../onlineUsers.js";

export function renderChatHeader() {
    const header = document.createElement("div");
    header.className =
        "px-5 py-3 bg-base-200/50 border-b border-secondary/30 flex justify-between items-center flex-shrink-0";

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

    const title = document.createElement("div");
    title.id = "chat-window-title";
    title.className = "text-primary uppercase tracking-wider font-bold flex items-center gap-1.5";
    title.textContent = "Канал";

    const onlineDot = document.createElement("span");
    onlineDot.id = "chat-header-online-dot";
    onlineDot.className = "inline-block w-2 h-2 rounded-full bg-success flex-shrink-0 hidden";
    title.appendChild(onlineDot);

    info.appendChild(avatar);
    info.appendChild(title);

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
        } else {
            dot.classList.add("hidden");
        }
    });

    return header;
}
