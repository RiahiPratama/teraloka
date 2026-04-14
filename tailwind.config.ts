import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'col-span-12',
    'md:col-span-5',
    'md:col-span-7',
    'grid-cols-12',
    'grid-cols-2',
    'grid-cols-4',
    'md:grid-cols-4',
  ],
  theme: {
    extend: {
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        primary: '#3525cd',
        'primary-light': '#4f46e5',
        'primary-dim': '#c3c0ff',
        cyan: '#0891B2',
        orange: '#E8963A',
        green: '#1B6B4A',
      },
    },
  },
  plugins: [],
}

export default config
