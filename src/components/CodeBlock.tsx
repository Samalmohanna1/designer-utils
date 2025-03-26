import { useMemo } from 'react'

interface ColorScale {
	id: number
	color: string
}

interface CodeBlockProps {
	colorScales: ColorScale[]
}

const CodeBlock: React.FC<CodeBlockProps> = ({ colorScales }) => {
	const shadeNumbers = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

	function calculateMixPercentage(shade: number): number {
		if (shade <= 500) {
			return 95 - ((shade - 50) / 450) * 95
		} else {
			return ((shade - 500) / 400) * 50
		}
	}

	function hexToRgb(hex: string): [number, number, number] {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		return result
			? [
					parseInt(result[1], 16),
					parseInt(result[2], 16),
					parseInt(result[3], 16),
			  ]
			: [0, 0, 0]
	}

	function rgbToHex(r: number, g: number, b: number): string {
		return (
			'#' +
			[r, g, b]
				.map((x) => {
					const hex = Math.round(x).toString(16)
					return hex.length === 1 ? '0' + hex : hex
				})
				.join('')
				.toUpperCase()
		)
	}

	function mixColors(
		color1: [number, number, number],
		color2: [number, number, number],
		weight: number
	): [number, number, number] {
		return color1.map((c, i) =>
			Math.round(c * (1 - weight) + color2[i] * weight)
		) as [number, number, number]
	}

	function hexToHSL(hex: string): string {
		let [r, g, b] = hexToRgb(hex).map((x) => x / 255)

		const max = Math.max(r, g, b)
		const min = Math.min(r, g, b)
		let h = (max + min) / 2
		let s = (max + min) / 2
		let l = (max + min) / 2

		if (max === min) {
			h = s = 0 // achromatic
		} else {
			const d = max - min
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0)
					break
				case g:
					h = (b - r) / d + 2
					break
				case b:
					h = (r - g) / d + 4
					break
			}
			h /= 6
		}

		return `hsla(${Math.round(h * 360)}, ${Math.round(
			s * 100
		)}%, ${Math.round(l * 100)}%, 1)`
	}

	const generateShades = (baseColor: string) => {
		const baseRgb = hexToRgb(baseColor)
		return shadeNumbers.map((shade) => {
			const mixPercentage = calculateMixPercentage(shade) / 100
			const mixColor: [number, number, number] =
				shade < 500 ? [255, 255, 255] : [0, 0, 0]
			const mixedRgb = mixColors(baseRgb, mixColor, mixPercentage)
			return rgbToHex(...mixedRgb)
		})
	}

	const tailwindCode = useMemo(() => {
		return colorScales
			.map((scale, index) => {
				const shades = generateShades(scale.color)
				return `  color${index + 1}: {
${shades
	.map((shade, i) => `    ${shadeNumbers[i]}: "${hexToHSL(shade)}"`)
	.join(',\n')}
  }`
			})
			.join(',\n')
	}, [colorScales])

	const fullTailwindConfig = useMemo(() => {
		return `colors: {
${tailwindCode}
      }`
	}, [tailwindCode])

	const copyToClipboard = () => {
		navigator.clipboard.writeText(fullTailwindConfig)
	}

	return (
		<div className='relative mt-4 p-8 rounded-md font-mono bg-zinc-900  text-white/80'>
			<button
				onClick={copyToClipboard}
				className='absolute top-6 right-6 bg-gray-200 text-black px-4 py-2 rounded text-sm'
			>
				Copy Code Snippet
			</button>
			<pre>
				<code className='text-sm sm:text-lg'>{fullTailwindConfig}</code>
			</pre>
		</div>
	)
}

export default CodeBlock
