import { useEffect, useMemo, useState } from 'react'
import { colorUtils, type ColorScale } from '../utils/colorUtils'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-css'

interface CodeBlockProps {
	colorScales: ColorScale[]
}

type ThemeFormat = 'tailwind3' | 'css'
type ColorFormat = 'hex' | 'hsl' | 'rgb'

type ShadeNumber = (typeof colorUtils.shadeNumbers)[number]

interface Shade {
	shade: ShadeNumber
	color: string
}

interface ColorData {
	index: number
	shades: Shade[]
}

const CodeBlock: React.FC<CodeBlockProps> = ({ colorScales }) => {
	const [isCopied, setIsCopied] = useState(false)
	const [isClient, setIsClient] = useState(false)
	const [themeFormat, setThemeFormat] = useState<ThemeFormat>('tailwind3')
	const [colorFormat, setColorFormat] = useState<ColorFormat>('hsl')

	const convertColor = (hex: string, format: ColorFormat): string => {
		switch (format) {
			case 'hex':
				return hex
			case 'hsl':
				return colorUtils.hexToHSL(hex)
			case 'rgb':
				return `rgb(${colorUtils.hexToRgb(hex)})`
			default:
				return hex
		}
	}

	const formattedCode = useMemo(() => {
		const seenColors = new Set<string>()

		const colorData: ColorData[] = colorScales
			.map((scale: ColorScale, index: number): ColorData | null => {
				const shades: Shade[] = colorUtils
					.generateShades(scale.color)
					.map(
						(shade: string, i: number): Shade => ({
							shade: colorUtils.shadeNumbers[i],
							color: convertColor(shade, colorFormat),
						})
					)
					.filter(({ color }: Shade) => {
						if (seenColors.has(color)) {
							return false
						}
						seenColors.add(color)
						return true
					})

				if (shades.length === 0) {
					return null
				}

				return {
					index: index + 1,
					shades,
				}
			})
			.filter((item): item is ColorData => item !== null)

		switch (themeFormat) {
			case 'tailwind3': {
				const tailwindColors = colorData
					.map(({ index, shades }: ColorData) => {
						return `  color${index}: {\n${shades
							.map(
								({ shade, color }: Shade) =>
									`    ${shade}: "${color}"`
							)
							.join(',\n')}\n  }`
					})
					.join(',\n')

				return `colors: {\n${tailwindColors}\n}`
			}

			case 'css': {
				const cssVars = colorData
					.flatMap(({ index, shades }: ColorData) =>
						shades.map(
							({ shade, color }: Shade) =>
								`  --color${index}-${shade}: ${color};`
						)
					)
					.join('\n')

				return `:root {\n${cssVars}\n}`
			}

			default:
				return ''
		}
	}, [colorScales, themeFormat, colorFormat])

	useEffect(() => {
		setIsClient(true)
	}, [])

	useEffect(() => {
		if (isClient) {
			Prism.highlightAll()
		}
	}, [formattedCode, isClient])

	useEffect(() => {
		setIsCopied(false)
	}, [formattedCode])

	const copyToClipboard = () => {
		navigator.clipboard.writeText(formattedCode)
		setIsCopied(true)
		setTimeout(() => {
			setIsCopied(false)
		}, 2000)
	}

	return (
		<>
			<div className='space-y-4'>
				<div className='flex gap-4 flex-wrap'>
					<div className='space-y-1'>
						<label className='block text-sm font-medium text-gray-700'>
							Theme Format
						</label>
						<select
							value={themeFormat}
							onChange={(e) =>
								setThemeFormat(e.target.value as ThemeFormat)
							}
							className='px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value='tailwind3'>Tailwind 3.4</option>
							<option value='css'>CSS Variables</option>
						</select>
					</div>

					<div className='space-y-1'>
						<label className='block text-sm font-medium text-gray-700'>
							Color Format
						</label>
						<select
							value={colorFormat}
							onChange={(e) =>
								setColorFormat(e.target.value as ColorFormat)
							}
							className='px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
						>
							<option value='hex'>Hex</option>
							<option value='hsl'>HSL</option>
							<option value='rgb'>RGB</option>
						</select>
					</div>
				</div>
			</div>
			<div className='relative mt-4 p-8 rounded-md font-mono bg-[#2d2d2d] text-white'>
				<button
					onClick={copyToClipboard}
					className={`absolute top-6 right-6 px-4 py-2 rounded text-sm font-bold transition-colors ${
						isCopied
							? 'bg-[#DCFCE7] text-[#0D5026]'
							: 'bg-gray-200 text-black hover:bg-gray-300'
					}`}
				>
					{isCopied ? 'Code Copied!' : 'Copy Code'}
				</button>
				<pre>
					<code
						className={`text-sm sm:text-lg ${
							isClient ? 'language-css' : ''
						}`}
					>
						{formattedCode}
					</code>
				</pre>
			</div>
		</>
	)
}

export default CodeBlock
