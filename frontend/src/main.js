import "./style.css";
import { Login, Register } from "../wailsjs/go/main/App";
import { initChats } from "./comps/chats.js";

if (window.__mainInitialized) {
    // HMR — ничего не делаем, старые обработчики живы
} else {
    window.__mainInitialized = true;

    const authScreen = document.getElementById("auth-screen");
    const chatLayout = document.getElementById("chat-layout");
    const loginInput = document.getElementById("login-input");
    const passwordInput = document.getElementById("password-input");
    const loginBtn = document.getElementById("login-btn");
    const registerBtn = document.getElementById("register-btn");
    const loginError = document.getElementById("login-error");

    async function enterChat(userData) {
        const userId = userData.id;
        const displayName = userData.username || loginInput.value.trim();
        authScreen.style.opacity = 0;
        setTimeout(() => {
            authScreen.classList.add("hidden");
            chatLayout.classList.remove("hidden");
            initChats("chat-layout", userId, displayName, userData);
        }, 300);
    }

    async function doLogin() {
        const username = loginInput.value.trim();
        const password = passwordInput.value;
        if (!username) return;
        loginBtn.disabled = true;
        registerBtn.disabled = true;
        loginError.classList.add("hidden");
        try {
            const userData = await Login(username, password);
            await enterChat(userData);
        } catch (err) {
            loginError.textContent = "Ошибка: " + (err.message || err);
            loginError.classList.remove("hidden");
        } finally {
            loginBtn.disabled = false;
            registerBtn.disabled = false;
        }
    }

    async function doRegister() {
        const username = loginInput.value.trim();
        const password = passwordInput.value;
        if (!username) return;
        loginBtn.disabled = true;
        registerBtn.disabled = true;
        loginError.classList.add("hidden");
        try {
            const userData = await Register(username, password);
            await enterChat(userData);
        } catch (err) {
            loginError.textContent = "Ошибка: " + (err.message || err);
            loginError.classList.remove("hidden");
        } finally {
            loginBtn.disabled = false;
            registerBtn.disabled = false;
        }
    }

    loginBtn.addEventListener("click", doLogin);
    registerBtn.addEventListener("click", doRegister);

    function onEnter(e) {
        if (e.key === "Enter") doLogin();
    }
    loginInput.addEventListener("keydown", onEnter);
    passwordInput.addEventListener("keydown", onEnter);
}
