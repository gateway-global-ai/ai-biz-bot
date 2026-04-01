import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem", /* 9px */
        md: ".375rem", /* 6px */
        sm: ".1875rem", /* 3px */
        sui: "24px", /* Sovereign UI Constant — Jason Standard */
        'os-sm': '8px',
        'os-md': '12px',
        'os-lg': '16px',
        'os-xl': '20px',
        'os-2xl': '24px',
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(to bottom right, rgba(255,255,255,0.05), rgba(255,255,255,0))",
        "sovereign-hero": "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(15,23,42,0) 60%)",
      },
      colors: {
        // ── Jason Standard: Sovereign OS Palette ───────────────────────────
        sovereign: {
          deep:    "#0F172A", /* Primary background depth */
          electric: "#6366F1", /* Indigo-Electric — primary action / accent */
          vivid:   "#10B981", /* Emerald-Vivid — success / verified */
          muted:   "#94A3B8", /* Slate-Muted — secondary text */
        },
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
        os: {
          shell: 'var(--os-bg-shell, #081120)',
          canvas: 'var(--os-bg-canvas, #F5F7F7)',
          panel: 'var(--os-bg-panel, #FFFFFF)',
          'panel-alt': 'var(--os-bg-panel-alt, #F8FAFC)',
          overlay: 'var(--os-bg-overlay, rgba(8,17,32,0.68))',
          'brand-50': '#ECFDF5',
          'brand-100': '#D1FAE5',
          'brand-200': '#A7F3D0',
          'brand-300': '#6EE7B7',
          'brand-400': '#34D399',
          'brand-500': '#10B981',
          'brand-600': '#059669',
          'brand-700': '#047857',
          'brand-800': '#065F46',
          'brand-900': '#064E3B',
          'text-strong': '#0F172A',
          'text-body': '#334155',
          'text-muted': '#64748B',
          'border-soft': '#E2E8F0',
          'border-strong': '#CBD5E1',
        },
      },
      boxShadow: {
        'os-sm': '0 1px 2px rgba(0,0,0,0.06)',
        'os-md': '0 8px 24px rgba(15,23,42,0.10)',
        'os-lg': '0 16px 40px rgba(15,23,42,0.14)',
        'os-glow': '0 0 0 1px rgba(16,185,129,0.18), 0 0 30px rgba(16,185,129,0.12)',
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-from-bottom": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // ── Jason Standard keyframes ────────────────────────────────────────
        "sovereign-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(99,102,241,0)" },
          "50%":       { boxShadow: "0 0 18px 4px rgba(99,102,241,0.35)" },
        },
        "sovereign-lift": {
          "0%":   { transform: "translateY(0) scale(1)" },
          "100%": { transform: "translateY(-3px) scale(1.015)" },
        },
        "glass-in": {
          "0%":   { opacity: "0", transform: "translateY(8px) scale(0.98)", backdropFilter: "blur(0px)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)",       backdropFilter: "blur(16px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in-from-bottom 0.3s ease-out",
        "scale-in": "scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        // Sovereign
        "sovereign-pulse": "sovereign-pulse 2.4s ease-in-out infinite",
        "glass-in":        "glass-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
