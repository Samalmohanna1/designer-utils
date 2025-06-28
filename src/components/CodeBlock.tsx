import { useEffect, useMemo, useState } from 'react'
import { colorUtils, type ColorScale } from '../utils/colorUtils'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-css'

interface CodeBlockProps {
	colorScales: ColorScale[]
}

type ThemeFormat = 'tailwind3' | 'tailwind4' | 'css'
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
	const [themeFormat, setThemeFormat] = useState<ThemeFormat>('css')
	const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')

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

			case 'tailwind4': {
				const tailwind4Colors = colorData
					.flatMap(({ index, shades }: ColorData) =>
						shades.map(
							({ shade, color }: Shade) =>
								`  --color-color${index}-${shade}: ${color};`
						)
					)
					.join('\n')

				return `@theme {\n${tailwind4Colors}\n}`
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
		<div className='border border-black-100 bg-cream-50 rounded-lg overflow-hidden'>
			<div className='p-xs space-y-s'>
				<div className='flex gap-s flex-wrap'>
					<div className='space-y-3xs'>
						<label className='block text-step--2 font-roboto-condensed'>
							Theme Format
						</label>
						<select
							value={themeFormat}
							onChange={(e) =>
								setThemeFormat(e.target.value as ThemeFormat)
							}
							className='px-xs py-2xs border border-black-100 rounded-sm bg-cream-50 text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
						>
							<option value='css'>CSS Variables</option>
							<option value='tailwind3'>Tailwind 3.4</option>
							<option value='tailwind4'>Tailwind 4.1</option>
						</select>
					</div>

					<div className='space-y-3xs'>
						<label className='block text-step--2 font-roboto-condensed'>
							Color Format
						</label>
						<select
							value={colorFormat}
							onChange={(e) =>
								setColorFormat(e.target.value as ColorFormat)
							}
							className='px-xs py-2xs border border-black-100 rounded-sm bg-cream-50 text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
						>
							<option value='hex'>Hex</option>
							<option value='hsl'>HSL</option>
							<option value='rgb'>RGB</option>
						</select>
					</div>
				</div>
			</div>
			<div className='relative p-s bg-[#2d2d2d] text-cream-100'>
				<button
					onClick={copyToClipboard}
					className={`absolute top-6 right-6 px-xs py-2xs rounded-sm font-roboto-condensed font-bold ${
						isCopied
							? 'bg-green-200 text-green-800'
							: 'bg-cream-200 text-black-400 hover:bg-yellow-500'
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
		</div>
	)
}

export default CodeBlock
