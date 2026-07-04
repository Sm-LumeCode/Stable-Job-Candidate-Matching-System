/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#1e293b", background: "#070b14", foreground: "#e2e8f0",
        card: "#0d1422", primary: "#3b82f6", emerald: "#10b981", muted: "#111827"
      },
      boxShadow: { glow: "0 0 30px rgba(59,130,246,.08)" }
    }
  },
  plugins: []
};

