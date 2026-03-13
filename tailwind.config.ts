import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			// Black & white only
  			white: '#FAF9F6',
  			brand: {
  				black: '#000000',
  				white: '#FAF9F6',
  				whiteBase: '#F5F5F5',
  			},
  			primary: {
  				DEFAULT: '#000000',
  				500: '#000000',
  				600: '#000000',
  				100: '#F5F5F5',
  				foreground: '#FFFFFF',
  			},
  			canvas: {
  				DEFAULT: '#FFFFFF',
  				soft: '#F5F5F5',
  			},
  			neutral: {
  				0: '#FFFFFF',
  				50: '#FFFFFF',
  				200: '#E5E5E5',
  				500: '#525252',
  				900: '#000000',
  			},
  			success: { 500: '#000000' },
  			warning: { 500: '#525252' },
  			error: { 500: '#000000' },
  			info: { 500: '#000000' },
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			destructive: {
  				DEFAULT: '#000000',
  				foreground: '#FFFFFF'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			card: {
  				DEFAULT: '#FFFFFF',
  				foreground: '#000000'
  			}
  		},
  		borderRadius: {
  			sm: '12px',
  			md: '16px',
  			lg: '24px',
  			xl: '32px',
  		},
  		boxShadow: {
  			card: '0 10px 30px rgba(20,21,21,0.08)',
  			'card-hover': '0 14px 38px rgba(20,21,21,0.12)',
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-geist)',
  				'system-ui',
  				'-apple-system',
  				'Segoe UI',
  				'Roboto',
  				'Arial',
  				'sans-serif',
  			],
  			geist: ['var(--font-geist)', 'sans-serif'],
  		},
  		fontSize: {
  			'caption': ['11px', { lineHeight: '16px', fontWeight: '400' }],
  			'body-s': ['12px', { lineHeight: '18px', fontWeight: '400' }],
  			'body-m': ['14px', { lineHeight: '22px', fontWeight: '400' }],
  			'body-l': ['16px', { lineHeight: '26px', fontWeight: '400' }],
  			'h2': ['20px', { lineHeight: '28px', fontWeight: '600' }],
  			'h1': ['24px', { lineHeight: '32px', fontWeight: '600' }],
  			'display': ['32px', { lineHeight: '40px', fontWeight: '600' }],
  			xs: ['0.75rem', { lineHeight: '1.5' }],
  			sm: ['0.8125rem', { lineHeight: '1.5' }],
  			base: ['0.875rem', { lineHeight: '1.5' }],
  			lg: ['1rem', { lineHeight: '1.5' }],
  			xl: ['1.125rem', { lineHeight: '1.4' }],
  			'2xl': ['1.25rem', { lineHeight: '1.35' }],
  			'3xl': ['1.5rem', { lineHeight: '1.3' }],
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'shimmer-slide': {
  				to: { transform: 'translate(calc(100cqw - 100%), 0)' }
  			},
  			'spin-around': {
  				'0%': { transform: 'translateZ(0) rotate(0)' },
  				'15%, 35%': { transform: 'translateZ(0) rotate(90deg)' },
  				'65%, 85%': { transform: 'translateZ(0) rotate(270deg)' },
  				'100%': { transform: 'translateZ(0) rotate(360deg)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
  			'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
