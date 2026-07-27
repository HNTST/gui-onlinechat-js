import { AVATAR_STUB } from "../../../core/constants.js";
import { loadAvatarInto } from "../../../core/components/Avatar.js";
import { loadProfile } from "../../chat/profilesCache.js";
import { isOnline, onStatusChange } from "../../chat/onlineUsers.js";
import { formatLastSeen } from "../../../core/timeUtils.js";

let currentModalUserId = null;
let statusUnsub = null;

export function openProfileModal(userId) {
    if (statusUnsub) statusUnsub();
    currentModalUserId = userId;

    const modal = document.getElementById("profile-modal");
    const content = document.getElementById("profile-modal-content");

    content.innerHTML = `
        <div class="flex flex-col items-center gap-3">
            <div class="avatar">
                <div class="w-24 rounded border-2 border-primary shadow-[0_0_20px_rgba(163,129,68,0.3)]">
                    <img src="${AVATAR_STUB}" id="modal-avatar" alt="avatar" />
                </div>
            </div>
            <div class="flex items-center gap-2">
                <h3 id="modal-nickname" class="card-title text-primary uppercase tracking-widest">Загрузка...</h3>
                <span id="modal-online-dot" class="inline-block w-3 h-3 rounded-full bg-success flex-shrink-0 hidden"></span>
            </div>
            <div id="modal-last-seen" class="text-xs text-base-content/40 hidden"></div>
            <div class="text-xs text-base-content/40 tracking-wider">ID: ${userId}</div>
            <div id="modal-reg" class="text-xs text-base-content/40 mb-2"></div>
            <button class="btn btn-error btn-sm uppercase tracking-widest font-bold text-white" id="modal-close-btn-inner">Закрыть</button>
        </div>
    `;
    modal.showModal();

    updateModalDot(userId);

    statusUnsub = onStatusChange(() => updateModalDot(currentModalUserId));

    document.getElementById("modal-close-btn-inner")?.addEventListener("click", () => {
        modal.close();
        if (statusUnsub) { statusUnsub(); statusUnsub = null; }
    });

    modal.addEventListener("close", () => {
        if (statusUnsub) { statusUnsub(); statusUnsub = null; }
        currentModalUserId = null;
    }, { once: true });

    loadProfile(userId).then((profile) => {
        const nickEl = document.getElementById("modal-nickname");
        const regEl = document.getElementById("modal-reg");
        const avatarEl = document.getElementById("modal-avatar");
        const lastSeenEl = document.getElementById("modal-last-seen");
        if (nickEl) nickEl.textContent = profile.username || "User #" + userId;
        if (regEl && profile.reg) {
            regEl.textContent = "Регистрация: " + new Date(profile.reg).toLocaleDateString("ru-RU");
        }
        if (avatarEl && profile.avatar_id) {
            loadAvatarInto(avatarEl, profile.avatar_id);
        }
        if (lastSeenEl) {
            lastSeenEl.dataset.lastSeen = profile.last_seen || "";
            updateModalLastSeen(userId);
        }
    });
}

function updateModalDot(userId) {
    const dot = document.getElementById("modal-online-dot");
    if (!dot || !userId) return;
    if (isOnline(userId)) {
        dot.classList.remove("hidden");
    } else {
        dot.classList.add("hidden");
    }
    updateModalLastSeen(userId);
}

function updateModalLastSeen(userId) {
    const el = document.getElementById("modal-last-seen");
    if (!el) return;
    const iso = el.dataset.lastSeen;
    if (!iso || isOnline(userId)) {
        el.classList.add("hidden");
        return;
    }
    const text = formatLastSeen(iso);
    if (text) {
        el.textContent = text;
        el.classList.remove("hidden");
    } else {
        el.classList.add("hidden");
    }
}
