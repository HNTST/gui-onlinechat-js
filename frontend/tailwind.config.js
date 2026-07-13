/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {},
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: [
            {
                dota: {
                    "primary":           "#a38144",
                    "primary-content":   "#ffffff",
                    "secondary":         "#3d332a",
                    "secondary-content": "#e8e4dd",
                    "accent":            "#801a1a",
                    "accent-content":    "#ffffff",
                    "neutral":           "#141517",
                    "neutral-content":   "#b0b5ba",
                    "base-100":          "#0b0c0d",
                    "base-200":          "#141517",
                    "base-300":          "#1c1d22",
                    "base-content":      "#b0b5ba",
                    "info":              "#3b82f6",
                    "success":           "#6cf06c",
                    "warning":           "#fbbd23",
                    "error":             "#ef4444",
                },
            },
        ],
    },
};
