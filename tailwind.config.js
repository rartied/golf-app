/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        golf: {
          green:   '#000000',   // ink/black — primary buttons, active states
          dark:    '#3f3f46',   // shade-70 — pressed state
          light:   '#c1fbd4',   // aloe mint — active fills, icon backgrounds
          gold:    '#d97706',
          fairway: '#4ade80',
        },
        // Design system tokens
        'canvas-night':  '#000000',
        'canvas-cream':  '#fbfbf5',
        'canvas-light':  '#ffffff',
        aloe:            '#c1fbd4',
        pistachio:       '#d4f9e0',
        ink:             '#000000',
        hairline:        '#e4e4e7',
        'shade-30':      '#d4d4d8',
        'shade-40':      '#a1a1aa',
        'shade-50':      '#71717a',
        'shade-60':      '#52525b',
        'shade-70':      '#3f3f46',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'display': '330',
      },
      borderRadius: {
        pill: '9999px',
      },
      boxShadow: {
        // Level 3 — stacked paper halo for cards on light surfaces
        card: '0 8px 8px rgba(0,0,0,0.05), 0 4px 4px rgba(0,0,0,0.05), 0 2px 2px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.06)',
        // Level 2 — elevated cards on dark surfaces
        'card-dark': '0 0 0 1px rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.3), 0 5px 10px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
};
