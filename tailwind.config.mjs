/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			screens: {
				'3xl': '1920px',
			},
			fontFamily: {
				UbuntuMonoRegular: ['UbuntuMono-Regular', 'monospace'],
				UbuntuMonoBold: ['UbuntuMono-Bold', 'monospace'],
				robotoCondensed: ['RobotoCondensed', 'sans-serif'],
			},
		},
	},
	plugins: [],
}
