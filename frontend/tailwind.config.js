/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2933',
        line: '#d8dee9',
        panel: '#f7f9fc',
        brand: '#0f766e',
        danger: '#b91c1c'
      }
    }
  },
  plugins: []
};
