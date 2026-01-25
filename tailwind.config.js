/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-dark': '#0f0f13',
                'brand-neon': '#00ff9d',
                'brand-accent': '#7928ca',
            }
        },
    },
    plugins: [],
}
