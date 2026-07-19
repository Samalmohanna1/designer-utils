import { useMemo, useState } from 'react'
import {
	colorUtils,
	type ColorScale,
	type ColorValueFormat,
} from '../utils/colorUtils'
import ExportBlock from './ExportBlock'

interface CodeBlockProps {
	colorScales: ColorScale[]
}

type ThemeFormat = 'tailwind4' | 'cssDark' | 'markdown' | 'tokens'

const FORMATS = [
	{ value: 'cssDark', label: 'CSS + Dark Mode' },
	{ value: 'tailwind4', label: 'Tailwind 4.1' },
	{ value: 'markdown', label: 'Style Guide (Markdown)' },
	{ value: 'tokens', label: 'Design Tokens (JSON)' },
]

const CodeBlock: React.FC<CodeBlockProps> = ({ colorScales }) => {
	const [themeFormat, setThemeFormat] = useState<ThemeFormat>('cssDark')
	const [colorFormat, setColorFormat] = useState<ColorValueFormat>('hex')
	const [prefix, setPrefix] = useState('')

	// Formats whose values are fixed (not driven by the color-format selector).
	const fixedColorFormat = themeFormat === 'markdown' || themeFormat === 'tokens'
	const language =
		themeFormat === 'markdown'
			? 'markdown'
			: themeFormat === 'tokens'
			? 'json'
			: 'css'

	const colorData = useMemo(
		() => colorUtils.paletteShadeData(colorScales),
		[colorScales]
	)

	const formattedCode = useMemo(() => {
		switch (themeFormat) {
			case 'tailwind4':
				return colorUtils.paletteTailwind(colorData, colorFormat, prefix)
			case 'markdown':
				return colorUtils.paletteMarkdown(colorData)
			case 'tokens':
				return colorUtils.paletteTokens(colorData, prefix)
			default:
				return colorUtils.paletteCss(colorData, colorFormat, prefix)
		}
	}, [colorData, themeFormat, colorFormat, prefix])

	return (
		<ExportBlock
			id='color-format-select'
			formats={FORMATS}
			format={themeFormat}
			onFormatChange={(v) => setThemeFormat(v as ThemeFormat)}
			code={formattedCode}
			language={language}
			filename={`color-scales-${themeFormat}.txt`}
			onPrefixChange={themeFormat === 'markdown' ? undefined : setPrefix}
		>
			{!fixedColorFormat && (
				<div className='space-y-3xs'>
					<label
						htmlFor='color value format'
						className='block text-step--2 font-roboto-condensed'
					>
						Color Format
					</label>
					<select
						id='color value format'
						value={colorFormat}
						onChange={(e) =>
							setColorFormat(e.target.value as ColorValueFormat)
						}
						className='px-xs py-2xs border border-black-100 rounded-sm bg-cream-50 text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
					>
						<option value='hex'>Hex</option>
						<option value='hsl'>HSL</option>
						<option value='rgb'>RGB</option>
					</select>
				</div>
			)}
		</ExportBlock>
	)
}

export default CodeBlock
