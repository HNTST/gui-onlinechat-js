export function renderInputBar() {
    const bar = document.createElement("div");
    bar.className =
        "px-5 py-3 bg-base-200 border-t border-secondary/30 flex gap-2 items-center flex-shrink-0";

    const input = document.createElement("input");
    input.type = "text";
    input.id = "msg-input";
    input.placeholder = "Введите сообщение...";
    input.autocomplete = "off";
    input.className =
        "input input-ghost flex-1 bg-transparent border-b border-secondary/40 text-base-content placeholder:text-base-content/25 focus:outline-none focus:border-b focus:border-primary";

    const btn = document.createElement("button");
    btn.id = "msg-send-btn";
    btn.className =
        "btn btn-ghost btn-square btn-sm border border-secondary/40 text-primary/70 hover:text-primary hover:border-primary/60 hover:bg-primary/10";
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;

    bar.appendChild(input);
    bar.appendChild(btn);

    return bar;
}
