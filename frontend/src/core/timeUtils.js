const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

const DIVISIONS = [
    { amount: 60, unit: "seconds" },
    { amount: 60, unit: "minutes" },
    { amount: 24, unit: "hours" },
    { amount: 7, unit: "days" },
    { amount: 4.34524, unit: "weeks" },
    { amount: 12, unit: "months" },
    { amount: Infinity, unit: "years" },
];

export function formatRelativeTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    let duration = (date.getTime() - Date.now()) / 1000;

    for (const { amount, unit } of DIVISIONS) {
        if (Math.abs(duration) < amount) {
            return rtf.format(Math.round(duration), unit);
        }
        duration /= amount;
    }
    return "";
}

export function formatLastSeen(isoString) {
    if (!isoString) return "";
    const relative = formatRelativeTime(isoString);
    if (!relative) return "";
    return "был(а) в сети " + relative;
}
