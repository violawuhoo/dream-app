/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'veil-background':     '#0A0A0F',
        'veil-surface':        '#12121A',
        'veil-surfaceElevated':'#1A1A26',
        'veil-accent':         '#7B6EF6',
        'veil-accentSoft':     '#2D2847',
        'veil-gold':           '#C9A84C',
        'veil-primary':        '#E8E8F0',
        'veil-secondary':      '#8888AA',
        'veil-muted':          '#55556A',
        'veil-error':          '#E57373',
        'veil-success':        '#81C784',
      },
    },
  },
  plugins: [],
};
