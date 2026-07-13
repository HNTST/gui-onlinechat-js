import { AuthAPI } from "../../core/wailsBridge.js";

export async function login(username, password) {
    return AuthAPI.login(username, password);
}

export async function register(username, password) {
    return AuthAPI.register(username, password);
}

export async function logout() {
    return AuthAPI.logout();
}
