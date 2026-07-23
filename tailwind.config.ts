import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef1ff",
          100: "#e0e3ff",
          200: "#c6caff",
          300: "#a3a8fd",
          400: "#8580f8",
          500: "#6c5cf0",
          600: "#5a3fe0",
          700: "#4b31c2",
          800: "#3d299b",
          900: "#33257b",
          950: "#1e1650",
        },
        ink: {
          50: "#f7f8fb",
          100: "#eef0f5",
          200: "#dfe2eb",
          300: "#c5cad9",
          400: "#9aa1b8",
          500: "#717892",
          600: "#545c76",
          700: "#3e455c",
          800: "#282d3f",
          900: "#171a26",
          950: "#0d0f18",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-korean)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(13, 15, 24, 0.04), 0 8px 24px -12px rgba(23, 26, 38, 0.12)",
        card: "0 1px 2px rgba(13, 15, 24, 0.04), 0 16px 40px -20px rgba(30, 22, 80, 0.22)",
        pop: "0 12px 32px -8px rgba(90, 63, 224, 0.35)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
