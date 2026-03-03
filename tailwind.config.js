/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 26px 70px -26px rgba(77, 36, 26, 0.32)',
        chip: '0 6px 0 0 rgba(77, 36, 26, 0.14)',
        'inner-soft': 'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      colors: {
        cocoa: '#4d241a',
        'cocoa-soft': '#633126',
        'cream-main': '#f5f1e7',
        'cream-soft': '#ebe6d8',
        'cream-card': '#fffaf0',
        mint: '#cdd8b6',
        'mint-strong': '#bdcba1',
        blush: '#f4c9bc',
        butter: '#f4d38d',
      },
      fontFamily: {
        sans: ['"ZCOOL KuaiLe"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
