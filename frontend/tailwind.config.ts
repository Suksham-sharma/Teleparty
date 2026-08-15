import type { Config } from "tailwindcss";

// "Bulb" — see docs/DESIGN.md.
// Single committed dark theme; no light variant.
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Named palette — prefer these in new code.
        black: "hsl(var(--black))",
        coal: "hsl(var(--coal))",
        "card-2": "hsl(var(--card-2))",
        hair: {
          DEFAULT: "hsl(var(--hair))",
          strong: "hsl(var(--hair-strong))",
        },
        butter: {
          DEFAULT: "hsl(var(--butter))",
          deep: "hsl(var(--butter-deep))",
          mute: "hsl(var(--butter-mute))",
        },
        white: "hsl(var(--white))",
        ash: "hsl(var(--ash))",
        grey: {
          DEFAULT: "hsl(var(--grey))",
          dim: "hsl(var(--grey-dim))",
        },

        // Semantic aliases for components/ui/*.
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // Hard steps only — nothing between these. docs/DESIGN.md §3.
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12
        sm: ["0.84375rem", { lineHeight: "1.25rem" }], // 13.5
        base: ["0.90625rem", { lineHeight: "1.35rem" }], // 14.5
        md: ["1rem", { lineHeight: "1.55rem" }], // 16
        lg: ["1.25rem", { lineHeight: "1.6rem" }], // 20
        xl: ["1.625rem", { lineHeight: "1.9rem" }], // 26
        "2xl": ["2.5rem", { lineHeight: "2.6rem" }], // 40
        "3xl": ["4.125rem", { lineHeight: "4.2rem" }], // 66
      },
      maxWidth: {
        shell: "1320px",
      },
      borderRadius: {
        // Pills for actions, 16px cards, 20px on the video frame.
        sm: "0.5rem",
        md: "var(--radius)",
        lg: "1rem",
        frame: "1.25rem",
      },
      // Opacity and small translate only. No spring, no scale-on-hover.
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // The live dot: a filament warming and cooling, not a blink.
        filament: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        // Reaction chips drifting up off the frame.
        "react-rise": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "18%": { opacity: "1", transform: "translateY(0)" },
          "78%": { opacity: "1", transform: "translateY(-10px)" },
          "100%": { opacity: "0", transform: "translateY(-18px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 150ms ease-out",
        filament: "filament 2.4s ease-in-out infinite",
        "react-rise": "react-rise 3.2s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
