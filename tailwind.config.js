/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#080b18',
        surface:  '#0e1326',
        surface2: '#141b30',
        border:   '#1a2540',
        physics:  '#60a5fa',
        biology:  '#34d399',
        chemistry:'#fb923c',
        math:     '#a78bfa',
        accent:   '#06b6d4',
      },
      fontFamily: {
        head: ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        body: ["'Inter'", 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
