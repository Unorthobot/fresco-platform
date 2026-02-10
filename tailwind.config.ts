// FRESCO Platform - Tailwind Configuration
// Design system matching frescolab.io

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colors matching frescolab.io
      colors: {
        fresco: {
          // Primary palette
          black: '#1a1a1a',
          graphite: '#2d2d2d',
          'graphite-soft': '#4a4a4a',
          'graphite-mid': '#6b6b6b',
          'graphite-light': '#8a8a8a',
          
          // Backgrounds
          white: '#ffffff',
          'off-white': '#fafafa',
          'light-gray': '#f5f5f5',
          'warm-gray': '#f0f0f0',
          
          // Borders
          border: '#e5e5e5',
          'border-light': '#ebebeb',
          'border-dark': '#d4d4d4',
          
          // Accents (minimal)
          accent: '#1a1a1a',
          
          // Phase colors (subtle)
          investigate: '#1a1a1a',
          innovate: '#1a1a1a', 
          validate: '#1a1a1a',
          
          // States
          hover: 'rgba(0, 0, 0, 0.03)',
          active: 'rgba(0, 0, 0, 0.06)',
          focus: '#1a1a1a',
          
          // Text
          placeholder: '#a3a3a3',
        },
      },
      
      // Typography
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      
      fontSize: {
        'fresco-xs': ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        'fresco-sm': ['13px', { lineHeight: '20px', letterSpacing: '0' }],
        'fresco-base': ['15px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
        'fresco-lg': ['17px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        'fresco-xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
        'fresco-2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        'fresco-3xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.03em' }],
        'fresco-4xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.03em' }],
        'fresco-5xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.03em' }],
      },
      
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
      },
      
      // Spacing (8px grid)
      spacing: {
        'fresco-xs': '4px',
        'fresco-sm': '8px',
        'fresco-md': '16px',
        'fresco-lg': '24px',
        'fresco-xl': '32px',
        'fresco-2xl': '48px',
        'fresco-3xl': '64px',
        'fresco-4xl': '96px',
      },
      
      // Layout
      width: {
        'fresco-nav': '220px',
        'fresco-output': '340px',
      },
      
      maxWidth: {
        'fresco-main': '720px',
        'fresco-content': '1200px',
      },
      
      margin: {
        'fresco-nav': '220px',
      },
      
      // Border radius (more rounded to match site)
      borderRadius: {
        'fresco-sm': '6px',
        'fresco': '8px',
        'fresco-lg': '12px',
        'fresco-xl': '16px',
        'fresco-full': '9999px',
      },
      
      // Box shadow (very subtle)
      boxShadow: {
        'fresco-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'fresco': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'fresco-lg': '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
      
      // Transitions
      transitionDuration: {
        'fresco': '200ms',
      },
      
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
