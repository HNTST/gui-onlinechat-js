import { AVATAR_STUB } from "../constants.js";
import { UserAPI } from "../wailsBridge.js";

export function createAvatar(avatarId, size = "w-10") {
    const wrapper = document.createElement("div");
    wrapper.className = "avatar";

    const inner = document.createElement("div");
    inner.className = `${size} rounded border border-secondary`;

    const img = document.createElement("img");
    img.src = AVATAR_STUB;
    img.alt = "avatar";
    img.className = "object-cover";

    inner.appendChild(img);
    wrapper.appendChild(inner);

    if (avatarId) {
        UserAPI.getAvatarBase64(String(avatarId))
            .then((b64) => {
                img.src = "data:image/png;base64," + b64;
            })
            .catch(() => {
                img.src = AVATAR_STUB;
            });
    }

    return { wrapper, img };
}

export function loadAvatarInto(imgEl, avatarId) {
    if (!imgEl || !avatarId) return;
    UserAPI.getAvatarBase64(String(avatarId))
        .then((b64) => {
            imgEl.src = "data:image/png;base64," + b64;
        })
        .catch(() => {
            imgEl.src = AVATAR_STUB;
        });
}
