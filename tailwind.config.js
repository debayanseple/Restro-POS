/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
        // Professional Warm Ivory & Terracotta Palette
        ivory: {
          DEFAULT: "#F7F5F0",
          light: "#FAF9F5",
          dark: "#EDE9E1",
        },
        charcoal: {
          DEFAULT: "#20252B",
          50: "#F6F7F9",
          100: "#ECEEF2",
          200: "#D5D9E2",
          300: "#A9B1C3",
          400: "#64748B",
          500: "#475569",
          600: "#334155",
          700: "#2B323B",
          800: "#20252B",
          900: "#181D22",
          950: "#121519",
        },
        terracotta: {
          DEFAULT: "#C46B4E",
          hover: "#B25C40",
          active: "#9E4F36",
          light: "#FDF4F0",
          subtle: "#F5ECE8",
          border: "#E8C2B5",
        },
        sand: {
          DEFAULT: "#E9E3D8",
          light: "#F3EFE7",
          dark: "#DDD5C7",
        },
        warmgrey: {
          DEFAULT: "#E5E1D9",
          light: "#EFECE6",
          dark: "#D4CEC3",
        },
        slate: {
          muted: "#64748B",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
