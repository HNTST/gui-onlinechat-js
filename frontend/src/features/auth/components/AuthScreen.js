import { login, register } from "../authService.js";

let isRegisterMode = false;

function setMode(register) {
    isRegisterMode = register;
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const confirmInput = document.getElementById("password-confirm-input");
    const submitBtn = document.getElementById("submit-btn");

    if (register) {
        tabRegister.className = "btn btn-sm btn-outline border-dashed border-base-content/30 text-base-content/60 uppercase tracking-widest text-xs px-6";
        tabLogin.className = "btn btn-sm btn-ghost text-base-content/40 uppercase tracking-widest text-xs px-6";
        confirmInput.classList.remove("hidden");
        submitBtn.textContent = "Зарегистрироваться";
    } else {
        tabLogin.className = "btn btn-sm btn-outline border-dashed border-base-content/30 text-base-content/60 uppercase tracking-widest text-xs px-6";
        tabRegister.className = "btn btn-sm btn-ghost text-base-content/40 uppercase tracking-widest text-xs px-6";
        confirmInput.classList.add("hidden");
        submitBtn.textContent = "Войти";
    }
}

function setLoading(loading) {
    const btn = document.getElementById("submit-btn");
    if (loading) {
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span>';
        btn.disabled = true;
        btn.classList.add("opacity-50");
    } else {
        btn.textContent = btn.dataset.originalText || "Войти";
        btn.disabled = false;
        btn.classList.remove("opacity-50");
    }
}

export function initAuthScreen(onLoginSuccess) {
    const authScreen = document.getElementById("auth-screen");
    const loginInput = document.getElementById("login-input");
    const passwordInput = document.getElementById("password-input");
    const confirmInput = document.getElementById("password-confirm-input");
    const submitBtn = document.getElementById("submit-btn");
    const loginError = document.getElementById("login-error");
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");

    setMode(false);

    tabLogin.addEventListener("click", () => setMode(false));
    tabRegister.addEventListener("click", () => setMode(true));

    async function doSubmit() {
        const username = loginInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) return;

        if (isRegisterMode) {
            const confirm = confirmInput.value;
            if (password !== confirm) {
                loginError.textContent = "Пароли не совпадают";
                loginError.classList.remove("hidden");
                return;
            }
        }

        loginError.classList.add("hidden");
        setLoading(true);

        try {
            const userData = isRegisterMode
                ? await register(username, password)
                : await login(username, password);
            authScreen.style.opacity = 0;
            setTimeout(() => {
                authScreen.classList.add("hidden");
                onLoginSuccess(userData);
            }, 300);
        } catch (err) {
            loginError.textContent = err.message || "Ошибка";
            loginError.classList.remove("hidden");
        } finally {
            setLoading(false);
        }
    }

    submitBtn.addEventListener("click", doSubmit);

    function onEnter(e) {
        if (e.key === "Enter") doSubmit();
    }
    loginInput.addEventListener("keydown", onEnter);
    passwordInput.addEventListener("keydown", onEnter);
    confirmInput.addEventListener("keydown", onEnter);
}
