module.exports = {
  content: ["./public/event-profile.html"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "Twemoji Country Flags", "sans-serif"] },
      colors: {
        brand: {
          50: "hsla(var(--primary-h), 80%, 96%, 1)",
          100: "hsla(var(--primary-h), 75%, 90%, 1)",
          200: "hsla(var(--primary-h), 70%, 80%, 1)",
          300: "hsla(var(--primary-h), 65%, 70%, 1)",
          400: "hsla(var(--primary-h), 65%, 60%, 1)",
          500: "var(--primary)",
          600: "var(--primary-hover)",
          700: "hsla(var(--primary-h), 65%, 35%, 1)",
          800: "hsla(var(--primary-h), 65%, 25%, 1)",
          900: "hsla(var(--primary-h), 65%, 15%, 1)"
        },
        clay: {
          50: "hsla(var(--primary-h), 80%, 96%, 1)",
          100: "hsla(var(--primary-h), 75%, 90%, 1)",
          200: "hsla(var(--primary-h), 70%, 80%, 1)",
          500: "var(--primary)",
          600: "var(--primary-hover)",
          700: "var(--primary)"
        },
        gold: { 500: "var(--gold)", 600: "var(--gold)", 700: "var(--gold)" }
      },
      animation: {
        blob: "blob 7s infinite",
        shimmer: "shimmer 2.5s infinite linear",
        float: "float 6s ease-in-out infinite"
      },
      keyframes: {
        blob: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        }
      }
    }
  },
  plugins: []
};
