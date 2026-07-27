import "./style.css";
import notifSoundUrl from "./assets/notification.mp3";
import { initApp } from "./App.js";
import { setOnline, setOffline } from "./features/chat/onlineUsers.js";
import { updateLastMessage } from "./features/chat/components/ChatList.js";
import { setWindowActive, isWindowActive, incrementUnread, getCurrentChatId } from "./features/chat/chatState.js";
import { getCachedProfile, loadProfile } from "./features/chat/profilesCache.js";

let notificationsReady = false;

function playNotifSound() {
    try {
        const audio = new Audio(notifSoundUrl);
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch {}
}

function sendDesktopNotification(title, body) {
    if (!notificationsReady) return;
    try {
        window.runtime.SendNotification({
            id: "chat-" + Date.now(),
            title: title,
            body: body,
        });
    } catch {}
}

if (!window.__mainInitialized) {
    window.__mainInitialized = true;

    window.runtime.InitializeNotifications().then(() => {
        notificationsReady = true;
    }).catch(() => {});

    window.addEventListener("focus", () => setWindowActive(true));
    window.addEventListener("blur", () => setWindowActive(false));

    document.addEventListener("contextmenu", (e) => e.preventDefault());

    const reconnectBanner = document.createElement("div");
    reconnectBanner.id = "ws-reconnect-banner";
    reconnectBanner.className =
        "fixed top-0 left-0 right-0 z-[9999] text-center text-xs py-1 bg-warning/80 text-base-content/80 font-medium transition-opacity duration-300 hidden";
    reconnectBanner.textContent = "Переподключение к серверу...";
    document.body.appendChild(reconnectBanner);

    window.runtime.EventsOn("ws_connected", () => {
        reconnectBanner.classList.add("hidden");
    });

    window.runtime.EventsOn("ws_closed", () => {
        reconnectBanner.classList.remove("hidden");
    });

    window.runtime.EventsOn("new_message", (data) => {
        let msg;
        try {
            msg = typeof data === "string" ? JSON.parse(data) : data;
        } catch { return; }

        if (msg.type === "online") {
            setOnline(msg.user_id);
            return;
        }
        if (msg.type === "offline") {
            setOffline(msg.user_id);
            return;
        }

        if (msg.chat_id) {
            updateLastMessage(msg.chat_id, msg.message, msg.sent_at);
        }

        const active = isWindowActive();
        const openChatId = getCurrentChatId();
        const msgChatId = msg.chat_id ? Number(msg.chat_id) : null;
        const isCurrentChat = msgChatId !== null && msgChatId === Number(openChatId);

        if (active && isCurrentChat) {
            if (window.__onWsMessage) {
                window.__onWsMessage(msg);
            }
        } else {
            if (msgChatId !== null) {
                incrementUnread(msgChatId);
            }
            const senderName = (() => {
                if (!msg.sender_id) return "Новое сообщение";
                const cached = getCachedProfile(msg.sender_id);
                if (cached?.username) return cached.username;
                loadProfile(msg.sender_id);
                return "Новое сообщение";
            })();
            const text = msg.message || "";
            sendDesktopNotification(senderName, text.length > 100 ? text.slice(0, 100) + "..." : text);
            playNotifSound();

            if (window.__onWsMessage) {
                window.__onWsMessage(msg);
            }
        }
    });

    initApp();
}
