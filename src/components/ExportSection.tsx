import { useMemo, useState } from 'react'
import ExportBlock from './ExportBlock'
import { type ColorValueFormat } from '../utils/colorUtils'
import {
	systemCss,
	systemMarkdown,
	systemTailwind,
	systemTokens,
	type SystemState,
} from '../utils/systemExport'

type ExportFormat = 'css' | 'tailwind4' | 'markdown' | 'tokens'

const FORMATS = [
	{ value: 'css', label: 'CSS + Dark Mode' },
	{ value: 'tailwind4', label: 'Tailwind 4.1' },
	{ value: 'markdown', label: 'Style Guide (Markdown)' },
	{ value: 'tokens', label: 'Design Tokens (JSON)' },
]

// The one export surface for the whole suite. `system` is the live state of
// every section above, so edits show up here instantly.
const ExportSection: React.FC<{ system: SystemState }> = ({ system }) => {
	const [format, setFormat] = useState<ExportFormat>('css')
	const [colorFormat, setColorFormat] = useState<ColorValueFormat>('hex')
	const [prefix, setPrefix] = useState('')

	// Value encoding only drives the color values in the code formats.
	const fixedColorFormat = format === 'markdown' || format === 'tokens'
	const language =
		format === 'markdown' ? 'markdown' : format === 'tokens' ? 'json' : 'css'

	const code = useMemo(() => {
		switch (format) {
			case 'tailwind4':
				return systemTailwind(system, colorFormat, prefix)
			case 'markdown':
				return systemMarkdown(system)
			case 'tokens':
				return systemTokens(system, prefix)
			default:
				return systemCss(system, colorFormat, prefix)
		}
	}, [system, format, colorFormat, prefix])

	return (
		<>
			<h2 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128230; Export
			</h2>
			<p className='text-step--1 mb-s max-w-prose'>
				Your whole design system in one file — color scales, type scale
				&amp; fonts, space &amp; grid, and foundations, live from the
				sections above. The Markdown style guide documents the color
				palette.
			</p>
			<ExportBlock
				id='system-format'
				formats={FORMATS}
				format={format}
				onFormatChange={(v) => setFormat(v as ExportFormat)}
				code={code}
				language={language}
				filename={`design-system-${format}.txt`}
				onPrefixChange={format === 'markdown' ? undefined : setPrefix}
			>
				{!fixedColorFormat && (
					<div className='space-y-3xs'>
						<label
							htmlFor='system-color-format'
							className='block text-step--2 font-roboto-condensed'
						>
							Color Format
						</label>
						<select
							id='system-color-format'
							value={colorFormat}
							onChange={(e) =>
								setColorFormat(
									e.target.value as ColorValueFormat
								)
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
		</>
	)
}

export default ExportSection
