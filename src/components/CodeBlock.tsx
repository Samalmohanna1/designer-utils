import { useEffect, useMemo, useState } from 'react'
import { colorUtils, type ColorScale } from '../utils/colorUtils'
import { downloadText } from '../utils/download'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-json'

interface CodeBlockProps {
	colorScales: ColorScale[]
}

type ThemeFormat = 'tailwind4' | 'cssDark' | 'markdown' | 'tokens'
type ColorFormat = 'hex' | 'hsl' | 'rgb'

type ShadeNumber = (typeof colorUtils.shadeNumbers)[number]

interface Shade {
	shade: ShadeNumber
	hex: string
}

interface ColorData {
	name: string
	slug: string
	shades: Shade[]
}

const CodeBlock: React.FC<CodeBlockProps> = ({ colorScales }) => {
	const [isCopied, setIsCopied] = useState(false)
	const [isClient, setIsClient] = useState(false)
	const [themeFormat, setThemeFormat] = useState<ThemeFormat>('cssDark')
	const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')

	// Formats whose values are fixed (not driven by the color-format selector).
	const fixedColorFormat = themeFormat === 'markdown' || themeFormat === 'tokens'
	const language =
		themeFormat === 'markdown'
			? 'markdown'
			: themeFormat === 'tokens'
			? 'json'
			: 'css'

	const convertColor = (hex: string, format: ColorFormat): string => {
		switch (format) {
			case 'hsl':
				return colorUtils.hexToHSL(hex)
			case 'rgb':
				return `rgb(${colorUtils.hexToRgb(hex)})`
			default:
				return hex
		}
	}

	// Raw, deduped shade data in hex — the single source the formatters build on.
	const colorData = useMemo<ColorData[]>(() => {
		const seenColors = new Set<string>()
		const slugs = colorUtils.uniqueSlugs(colorScales.map((s) => s.name))

		return colorScales
			.map((scale, index): ColorData | null => {
				const shades: Shade[] = colorUtils
					.generateShades(scale.color)
					.map((hex, i) => ({
						shade: colorUtils.shadeNumbers[i],
						hex,
					}))
					.filter(({ hex }) => {
						if (seenColors.has(hex)) return false
						seenColors.add(hex)
						return true
					})

				if (shades.length === 0) return null
				return {
					name: scale.name.trim() || slugs[index],
					slug: slugs[index],
					shades,
				}
			})
			.filter((item): item is ColorData => item !== null)
	}, [colorScales])

	const formattedCode = useMemo(() => {
		switch (themeFormat) {
			case 'tailwind4': {
				const body = colorData
					.flatMap(({ slug, shades }) =>
						shades.map(
							({ shade, hex }) =>
								`  --color-${slug}-${shade}: ${convertColor(
									hex,
									colorFormat
								)};`
						)
					)
					.join('\n')

				// Dark mode overrides the same custom properties under .dark,
				// for Tailwind 4's class-based dark variant. Mirrored ramp.
				const dark = colorData
					.flatMap(({ slug, shades }) => {
						const mirrored = colorUtils.mirrorHexes(
							shades.map((s) => s.hex)
						)
						return shades.map(
							({ shade }, i) =>
								`  --color-${slug}-${shade}: ${convertColor(
									mirrored[i],
									colorFormat
								)};`
						)
					})
					.join('\n')

				return `@theme {\n${body}\n}\n\n.dark {\n${dark}\n}`
			}

			case 'cssDark': {
				const light = colorData
					.flatMap(({ slug, shades }) =>
						shades.map(
							({ shade, hex }) =>
								`  --${slug}-${shade}: ${convertColor(
									hex,
									colorFormat
								)};`
						)
					)
					.join('\n')

				// Dark mode mirrors the ramp (see colorUtils.mirrorHexes).
				const dark = colorData
					.flatMap(({ slug, shades }) => {
						const mirrored = colorUtils.mirrorHexes(
							shades.map((s) => s.hex)
						)
						return shades.map(
							({ shade }, i) =>
								`    --${slug}-${shade}: ${convertColor(
									mirrored[i],
									colorFormat
								)};`
						)
					})
					.join('\n')

				return [
					`:root {\n${light}\n}`,
					'',
					'@media (prefers-color-scheme: dark) {',
					'  :root {',
					dark,
					'  }',
					'}',
				].join('\n')
			}

			case 'markdown': {
				const capitalize = (s: string) =>
					s.charAt(0).toUpperCase() + s.slice(1)

				const sections = colorData.map(({ name, shades }) => {
					// Dark column: the value each shade maps to in dark mode.
					const dark = colorUtils.mirrorHexes(shades.map((s) => s.hex))
					const rows = shades
						.map(
							({ shade, hex }, i) =>
								`| ${shade} | \`${hex}\` | \`${colorUtils.hexToHSL(
									hex
								)}\` | \`${dark[i]}\` |`
						)
						.join('\n')

					const safe = colorUtils.textSafeShades(
						shades.map((s) => s.hex)
					)

					return [
						`## ${capitalize(name)}`,
						'',
						'| Shade | Hex | HSL | Dark |',
						'| ----: | --- | --- | --- |',
						rows,
						'',
						`- **Text on white** (AA): ${colorUtils.formatShadeRanges(
							safe.onWhite
						)}`,
						`- **Text on black** (AA): ${colorUtils.formatShadeRanges(
							safe.onBlack
						)}`,
					].join('\n')
				})

				return [
					'# Color Palette',
					'',
					'Generated color scales. The **Dark** column is the value each',
					'shade maps to in dark mode (the ramp mirrored). Accessibility',
					'notes list the shades that pass WCAG AA (≥4.5:1) as text on a',
					'white or black background.',
					'',
					...sections,
				].join('\n\n')
			}

			case 'tokens': {
				// W3C Design Tokens (DTCG 2025.10): top-level `light` and `dark`
				// groups, each keyed by slug -> shade -> { $type, $value }, where
				// $value is a color object (colorSpace/components/alpha/hex) —
				// the format Figma's native variables importer expects. Dark uses
				// the mirrored ramp.
				type ColorToken = {
					$type: 'color'
					$value: ReturnType<typeof colorUtils.hexToDtcgColor>
				}
				type Group = Record<string, Record<string, ColorToken>>
				const light: Group = {}
				const dark: Group = {}
				colorData.forEach(({ slug, shades }) => {
					light[slug] = {}
					dark[slug] = {}
					const mirrored = colorUtils.mirrorHexes(
						shades.map((s) => s.hex)
					)
					shades.forEach(({ shade, hex }, i) => {
						light[slug][shade] = {
							$type: 'color',
							$value: colorUtils.hexToDtcgColor(hex),
						}
						dark[slug][shade] = {
							$type: 'color',
							$value: colorUtils.hexToDtcgColor(mirrored[i]),
						}
					})
				})
				return JSON.stringify({ light, dark }, null, 2)
			}

			default:
				return ''
		}
	}, [colorData, themeFormat, colorFormat])

	useEffect(() => {
		setIsClient(true)
	}, [])

	useEffect(() => {
		if (isClient) {
			Prism.highlightAll()
		}
	}, [formattedCode, isClient, language])

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

	const download = () => {
		downloadText(`color-scales-${themeFormat}.txt`, formattedCode)
	}

	return (
		<div className='border border-black-100 bg-cream-50 rounded-lg overflow-hidden'>
			<div className='p-xs space-y-s'>
				<div className='flex gap-s flex-wrap'>
					<div className='space-y-3xs'>
						<label
							htmlFor='theme format'
							className='block text-step--2 font-roboto-condensed'
						>
							Format
						</label>
						<select
							id='theme format'
							value={themeFormat}
							onChange={(e) =>
								setThemeFormat(e.target.value as ThemeFormat)
							}
							className='px-xs py-2xs border border-black-100 rounded-sm bg-cream-50 text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
						>
							<option value='cssDark'>CSS + Dark Mode</option>
							<option value='tailwind4'>Tailwind 4.1</option>
							<option value='markdown'>Style Guide (Markdown)</option>
							<option value='tokens'>Design Tokens (JSON)</option>
						</select>
					</div>

					{!fixedColorFormat && (
						<div className='space-y-3xs'>
							<label
								htmlFor='color format'
								className='block text-step--2 font-roboto-condensed'
							>
								Color Format
							</label>
							<select
								id='color format'
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
					)}
				</div>
			</div>
			<div className='relative bg-[#2d2d2d] text-cream-100'>
				<div className='absolute top-6 right-6 z-10 flex flex-wrap justify-end gap-2xs'>
					<button
						onClick={copyToClipboard}
						className={`px-xs py-2xs rounded-sm font-roboto-condensed font-bold ${
							isCopied
								? 'bg-green-200 text-green-800'
								: 'bg-cream-200 text-black-400 hover:bg-yellow-500'
						}`}
					>
						{isCopied ? 'Code Copied!' : 'Copy Code'}
					</button>
					<button
						onClick={download}
						className='px-xs py-2xs rounded-sm font-roboto-condensed font-bold bg-cream-200 text-black-400 hover:bg-yellow-500'
					>
						Download .txt
					</button>
				</div>
				<pre className='p-s max-h-128 overflow-auto'>
					<code
						className={`text-sm sm:text-lg ${
							isClient ? `language-${language}` : ''
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
