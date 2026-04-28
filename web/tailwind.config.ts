import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Times New Roman", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Excavation tokens
        paper:  "hsl(var(--paper))",
        ink:    "hsl(var(--ink))",
        rust:   "hsl(var(--rust))",
        lichen: "hsl(var(--lichen))",
        dust:   "hsl(var(--dust))",
        clay:   "hsl(var(--clay))",
        bg:     "hsl(var(--bg))",
        "bg-2": "hsl(var(--bg-2))",
        fg:     "hsl(var(--fg))",
        "fg-muted": "hsl(var(--fg-muted))",
        line:   "hsl(var(--line))",
        // Compatibility names so existing components still parse
        background:   "hsl(var(--bg))",
        foreground:   "hsl(var(--fg))",
        muted:        { DEFAULT: "hsl(var(--bg-2))", foreground: "hsl(var(--fg-muted))" },
        card:         { DEFAULT: "hsl(var(--bg-2))", foreground: "hsl(var(--fg))" },
        border:       "hsl(var(--line))",
        primary:      { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-fg))" },
        secondary:    { DEFAULT: "hsl(var(--bg-2))", foreground: "hsl(var(--fg))" },
        accent:       { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-fg))" },
        destructive:  { DEFAULT: "hsl(0 70% 50%)", foreground: "hsl(var(--paper))" },
        input:        "hsl(var(--line))",
        ring:         "hsl(var(--rust))",
        popover:      { DEFAULT: "hsl(var(--bg))", foreground: "hsl(var(--fg))" },
      },
      borderRadius: { lg: "0px", md: "0px", sm: "0px" },
    },
  },
  plugins: [],
};
export default config;
