import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'light-grey': '#BDC3CD',
        'purple-start': '#806cf5',
        'purple-mid': '#6d56f0',
        'purple-end': '#6858c6',
        'text-dark': '#2e3238',
        'text-light': '#757575',
        'text-black': '#121212',
        'red-accent': '#ff6161',
        'bg-light': '#eef0f6',
        'dark-bg': '#2f2f2f',
        'dark-header': '#424242',
        'news-bg': '#989898',
      },
      fontFamily: {
        paperlogy: ['Paperlogy', 'sans-serif'],
        pretendard: ['Pretendard', 'sans-serif'],
        righteous: ['Righteous', 'cursive'],
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
