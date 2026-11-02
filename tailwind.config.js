/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./web/index.html", "./web/src/**/*.{js,jsx}"],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          dark: "rgb(var(--color-primary-dark) / <alpha-value>)",
          light: "rgb(var(--color-primary-light) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          dark: "rgb(var(--color-accent-dark) / <alpha-value>)",
        },
        danger: "rgb(var(--color-danger) / <alpha-value>)",
      },
      fontFamily: {
        serif: ["Newsreader", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(30 36 33 / 0.04), 0 4px 16px rgb(30 36 33 / 0.05)",
        lift: "0 10px 30px rgb(30 36 33 / 0.12), 0 2px 6px rgb(30 36 33 / 0.06)",
      },
      keyframes: {
        pop: {
          "0%": { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: {
        pop: "pop 140ms ease-out",
        "fade-up": "fade-up 260ms ease-out both",
      },
    },
  },
  plugins: [],
};
