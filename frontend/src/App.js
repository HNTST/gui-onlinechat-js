import { initAuthScreen } from "./features/auth/components/AuthScreen.js";
import { initChatWorkspace } from "./features/chat/ChatWorkspace.js";

export function initApp() {
    const chatLayout = document.getElementById("chat-layout");

    initAuthScreen((userData) => {
        const userId = userData.id;
        const displayName = userData.username || "User";
        chatLayout.classList.remove("hidden");
        initChatWorkspace("chat-layout", userId, displayName, userData);
    });
}
