import { getCurrentUserId } from "../chatState.js";

export function renderMessage(text, isSystem, timestamp, senderId, messageId, isEdited, isDeleted) {
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

    const timeDiv = document.createElement("div");
    timeDiv.className = "text-[10px] text-base-content/25 mt-1 leading-none";
    timeDiv.textContent = timeStr;

    el.appendChild(textDiv);
    el.appendChild(timeDiv);

    return el;
}
