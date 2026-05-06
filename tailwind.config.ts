import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "var(--font-dm-sans)", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        coral: {
          DEFAULT: "#FF6B6B",
          muted: "rgba(255, 107, 107, 0.15)",
        },
      },
      screens: {
        'xs': '475px',
        // Mobile-first breakpoints
        'sm': '640px',   // Small devices (landscape phones)
        'md': '768px',   // Medium devices (tablets)
        'lg': '1024px',  // Large devices (desktops)
        'xl': '1280px',  // Extra large devices
        '2xl': '1536px', // 2X large devices
      },
    },
  },
  plugins: [],
};
export default config;

