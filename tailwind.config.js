/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--color-app)",
        surface: "var(--color-surface)",
        fg: "var(--color-fg)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
      },
      boxShadow: {
        smv: "var(--shadow-sm)",
        mdv: "var(--shadow-md)",
        lgv: "var(--shadow-lg)",
      },
      borderRadius: {
        smv: "var(--radius-sm)",
        mdv: "var(--radius-md)",
        lgv: "var(--radius-lg)",
        xlv: "var(--radius-xl)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
      },
    },
  },
  plugins: [],
};
