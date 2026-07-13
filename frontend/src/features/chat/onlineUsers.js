const onlineUsers = new Set();
const listeners = new Set();

export function isOnline(userId) {
    return onlineUsers.has(Number(userId));
}

export function setOnline(userId) {
    onlineUsers.add(Number(userId));
    notify();
}

export function setOffline(userId) {
    onlineUsers.delete(Number(userId));
    notify();
}

export function onStatusChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

function notify() {
    listeners.forEach((cb) => cb());
}
