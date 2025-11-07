import daisyui from "daisyui";

export default {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}", // Add paths to all your content files
    "./*.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
};