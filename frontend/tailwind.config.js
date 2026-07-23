/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F7F6",
        panel: "#FFFFFF",
        ink: "#14231F",
        inkSoft: "#4B5D59",
        inkFaint: "#8A9A96",
        pine: "#1F5C50",
        pineDark: "#143F37",
        pineSoft: "#DCEAE6",
        amber: "#C08A2E",
        amberSoft: "#F3E7CC",
        slate: "#55697A",
        slateSoft: "#E2E7EC",
        violet: "#6B5B95",
        violetSoft: "#E7E2F1",
        brick: "#A6503F",
        brickSoft: "#F1DFDA",
        line: "#DCE3DF",
        lineStrong: "#C3CDC8",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
