import "./style.css";
import { initApp } from "./App.js";
import { setOnline, setOffline } from "./features/chat/onlineUsers.js";
import { updateLastMessage } from "./features/chat/components/ChatList.js";

if (!window.__mainInitialized) {
    window.__mainInitialized = true;

    document.addEventListener("contextmenu", (e) => e.preventDefault());

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

        if (window.__onWsMessage) {
            window.__onWsMessage(msg);
        }
    });

    initApp();
}
