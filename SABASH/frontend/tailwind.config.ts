import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: { primary: '#0F3B66', accent: '#FF5722' }
    },
  },
  plugins: [],
};
export default config;
