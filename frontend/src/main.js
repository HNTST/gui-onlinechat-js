import "./style.css";
import { Login } from "../wailsjs/go/main/App";
import { initChats } from "./comps/chats.js";

if (window.__mainInitialized) {
    // HMR — ничего не делаем, старые обработчики живы
} else {
    window.__mainInitialized = true;

    const authScreen = document.getElementById("auth-screen");
    const chatLayout = document.getElementById("chat-layout");
    const loginInput = document.getElementById("login-input");
    const loginBtn = document.getElementById("login-btn");
    const loginError = document.getElementById("login-error");

    loginBtn.addEventListener("click", async () => {
        const username = loginInput.value.trim();
        if (!username) return;

        loginBtn.disabled = true;
        loginError.classList.add("hidden");

        try {
            const userData = await Login(username);
            const userId = userData.id;
            const displayName = userData.username || username;

            authScreen.style.opacity = 0;
            setTimeout(() => {
                authScreen.classList.add("hidden");
                chatLayout.classList.remove("hidden");
                initChats("chat-layout", userId, displayName, userData);
            }, 300);
        } catch (err) {
            loginError.textContent = "Ошибка: " + (err.message || err);
            loginError.classList.remove("hidden");
        } finally {
            loginBtn.disabled = false;
        }
    });

    loginInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") loginBtn.click();
    });
}
