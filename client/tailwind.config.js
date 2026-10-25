/**
 * S.M.I.T-Lite design tokens.
 *
 * Every colour, radius, shadow and font in the UI comes from this file or from
 * the CSS variables in src/index.css. Nothing is hard-coded in components.
 * The legacy semantic names (background, foreground, border, primary, ...) are
 * kept as aliases so screens that have not been migrated yet still resolve.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette
        ink: {
          DEFAULT: "#07111F",
          2: "#0E1B2E",
          3: "#162842",
        },
        blue: {
          DEFAULT: "#1C74EF",
          50: "#F2F7FF",
          100: "#E6F0FF",
          400: "#4B94FF",
          600: "#1763D6",
          700: "#0F4FC4",
        },
        lime: {
          DEFAULT: "#88C443",
          50: "#EFF8E2",
          700: "#46781A",
        },
        mist: "#F3F6FB",
        surface: "#FFFFFF",
        line: {
          DEFAULT: "#E3E9F3",
          soft: "#EEF2F8",
        },
        text: {
          DEFAULT: "#0B1626",
          2: "#3B4A60",
        },
        muted: "#5D6C82",
        "muted-foreground": "#5D6C82",

        // Status colours, always used as a pair: ink on tint
        status: {
          amber: "#B45309",
          "amber-bg": "#FFF3DC",
          rose: "#BE123C",
          "rose-bg": "#FFE8EE",
          violet: "#6D28D9",
          "violet-bg": "#F0EAFF",
          slate: "#475569",
          "slate-bg": "#EEF2F7",
        },

        // Legacy aliases, kept so unmigrated screens still render
        background: "#FFFFFF",
        foreground: "#0B1626",
        border: "#E3E9F3",
        primary: {
          DEFAULT: "#1C74EF",
          hover: "#1763D6",
          foreground: "#FFFFFF",
        },
        "surface-tint": "#F2F7FF",
        danger: "#BE123C",
        success: "#46781A",
        ring: "#1C74EF",
      },

      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Plus Jakarta Sans Variable",
          "Plus Jakarta Sans",
          "Inter Variable",
          "system-ui",
          "sans-serif",
        ],
      },

      fontSize: {
        xs: ["12.5px", { lineHeight: "1.45" }],
        sm: ["13.5px", { lineHeight: "1.5" }],
        base: ["15px", { lineHeight: "1.55" }],
        md: ["17px", { lineHeight: "1.5" }],
        lg: ["20px", { lineHeight: "1.4" }],
        xl: ["24px", { lineHeight: "1.3" }],
        "2xl": ["30px", { lineHeight: "1.2" }],
        "3xl": ["40px", { lineHeight: "1.1" }],
        "4xl": ["52px", { lineHeight: "1" }],
      },

      borderRadius: {
        small: "8px",
        control: "12px",
        card: "20px",
        modal: "24px",
        pill: "999px",
        // legacy scale, nudged onto the new radii
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },

      boxShadow: {
        e1: "0 1px 2px rgba(12, 38, 92, 0.06)",
        e2: "0 4px 14px -2px rgba(12, 38, 92, 0.08), 0 1px 3px rgba(12, 38, 92, 0.05)",
        e3: "0 14px 34px -8px rgba(12, 38, 92, 0.16), 0 3px 8px rgba(12, 38, 92, 0.06)",
        e4: "0 28px 64px -12px rgba(12, 38, 92, 0.28)",
        focus: "0 0 0 3px rgba(28, 116, 239, 0.35)",
      },

      backgroundImage: {
        "brand-gradient":
          "linear-gradient(180deg, #3A8BFF 0%, #1C74EF 52%, #1763D6 100%)",
        "ink-gradient":
          "linear-gradient(160deg, #0B1B33 0%, #07111F 60%)",
        "hero-gradient":
          "linear-gradient(120deg, #0F4FC4 0%, #1C74EF 55%, #2F8CFF 100%)",
        "lime-gradient": "linear-gradient(180deg, #9BD155 0%, #7AB637 100%)",
      },

      transitionTimingFunction: {
        brand: "cubic-bezier(.2,.8,.2,1)",
      },

      spacing: {
        18: "4.5rem",
      },

      keyframes: {
        "bars-loader": {
          "0%, 100%": { transform: "scaleX(0.4)" },
          "35%": { transform: "scaleX(1)" },
          "70%": { transform: "scaleX(0.4)" },
        },
        "bar-blink": {
          "0%, 80%, 100%": { opacity: "1" },
          "88%": { opacity: "0.35" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "dot-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.55)", opacity: "0.45" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        "ring-bell": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(12deg)" },
          "45%": { transform: "rotate(-9deg)" },
          "70%": { transform: "rotate(5deg)" },
        },
        "caret-blink": {
          "0%, 45%": { opacity: "1" },
          "55%, 100%": { opacity: "0" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },

      animation: {
        "bars-loader": "bars-loader 1.1s cubic-bezier(.2,.8,.2,1) infinite",
        "bar-blink": "bar-blink 1.1s steps(1, end) infinite",
        drift: "drift 14s ease-in-out infinite",
        "dot-pulse": "dot-pulse 2s ease-in-out infinite",
        shimmer: "shimmer 1.4s linear infinite",
        shake: "shake 300ms cubic-bezier(.2,.8,.2,1)",
        "ring-bell": "ring-bell 600ms cubic-bezier(.2,.8,.2,1)",
        "caret-blink": "caret-blink 1s steps(1, end) infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
    },
  },
  plugins: [],
};
