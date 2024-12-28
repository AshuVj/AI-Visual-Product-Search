// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '300px', // Minimum breakpoint for extra-small screens
      },
    },
  },
  plugins: [],
};
