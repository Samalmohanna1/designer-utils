import { useMemo } from 'react'

interface ColorScaleProps {
	baseColor: string
}

const ColorScale: React.FC<ColorScaleProps> = ({ baseColor }) => {
	const shadeNumbers = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

	function calculateMixPercentage(shade: number): number {
		if (shade <= 500) {
			return 90 - ((shade - 50) / 450) * 90
		} else {
			return ((shade - 500) / 400) * 40
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

	const shades = useMemo(() => {
		const baseRgb = hexToRgb(baseColor)
		return shadeNumbers.map((shade) => {
			const mixPercentage = calculateMixPercentage(shade) / 100
			const mixColor: [number, number, number] =
				shade < 500 ? [255, 255, 255] : [0, 0, 0]
			const mixedRgb = mixColors(baseRgb, mixColor, mixPercentage)
			return rgbToHex(...mixedRgb)
		})
	}, [baseColor])

	return (
		<div className='flex flex-wrap gap-4 w-full'>
			{shades.map((hexCode, index) => (
				<div
					key={index}
					className='flex flex-col items-center min-w-[110px]'
				>
					<div
						className='w-full h-20 rounded color-scale-item border-2 border-slate-600 min-w-20'
						style={{ backgroundColor: hexCode }}
					/>
					<span className='flex justify-between px-[1px] w-full'>
						<div className='text-md text-zinc-600'>
							{shadeNumbers[index]}
						</div>
						<div className='text-lg hex-code'>{hexCode}</div>
					</span>
				</div>
			))}
		</div>
	)
}

export default ColorScale
