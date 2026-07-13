import { getCurrentUserId } from "../chatState.js";

export function renderMessage(text, isSystem, timestamp, senderId, messageId, isEdited, isDeleted, isRead) {
    const el = document.createElement("div");

    if (isSystem) {
        el.className =
            "px-3 py-1 text-xs text-primary/60 italic text-center w-full max-w-full";
        el.textContent = text;
        return el;
    }

    const pid = Number(senderId);
    const own = pid === Number(getCurrentUserId());

    el.className = own
        ? "max-w-[75%] self-end px-3 py-2 border border-primary/40 bg-transparent relative text-[13px] leading-[1.35] rounded-sm"
        : "max-w-[75%] self-start px-3 py-2 border border-secondary/60 bg-transparent relative text-[13px] leading-[1.35] rounded-sm";

    el.dataset.senderId = pid;
    if (messageId != null) el.dataset.msgId = messageId;
    if (timestamp) el.dataset.sentAt = timestamp;

    const timeStr = timestamp
        ? new Date(timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    const displayText = isDeleted ? "Сообщение удалено" : text || "";
    const textDiv = document.createElement("div");
    textDiv.className = isDeleted ? "text-base-content/30 italic" : "text-base-content/80";
    textDiv.textContent = displayText;

    if (isEdited && !isDeleted) {
        const label = document.createElement("span");
        label.className = "text-[10px] text-base-content/25 italic ml-1";
        label.textContent = " (изменено)";
        textDiv.appendChild(label);
    }

    const metaDiv = document.createElement("div");
    metaDiv.className = "flex items-center gap-1 mt-1 leading-none";

    const timeSpan = document.createElement("span");
    timeSpan.className = "text-[10px] text-base-content/25";
    timeSpan.textContent = timeStr;
    metaDiv.appendChild(timeSpan);

    if (own && messageId != null) {
        const check = document.createElement("span");
        check.className = isRead
            ? "text-[10px] text-primary"
            : "text-[10px] text-base-content/25";
        check.dataset.readCheck = "";
        check.innerHTML = isRead
            ? `<svg width="12" height="8" viewBox="0 0 16 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 5l3 3 6-7"/><path d="M6 5l3 3 6-7"/></svg>`
            : `<svg width="10" height="8" viewBox="0 0 14 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 5l3 3 6-7"/></svg>`;
        metaDiv.appendChild(check);
    }

    el.appendChild(textDiv);
    el.appendChild(metaDiv);

    return el;
}
