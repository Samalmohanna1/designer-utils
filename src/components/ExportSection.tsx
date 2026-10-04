import { useMemo, useState } from 'react'
import ExportBlock from './ExportBlock'
import { type ColorValueFormat } from '../utils/colorUtils'
import { foundationsToSvg } from '../utils/foundations'
import { copySvg } from '../utils/clipboard'
import { useCopied } from '../hooks/useCopied'
import {
	FIGMA_UNSUPPORTED,
	systemCss,
	systemMarkdown,
	systemTailwind,
	systemTokenFiles,
	systemTokensBundle,
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
	const isTokens = format === 'tokens'
	const language =
		format === 'markdown' ? 'markdown' : isTokens ? 'json' : 'css'

	const tokenFiles = useMemo(
		() => (isTokens ? systemTokenFiles(system, prefix) : []),
		[system, prefix, isTokens]
	)

	const code = useMemo(() => {
		switch (format) {
			case 'tailwind4':
				return systemTailwind(system, colorFormat, prefix)
			case 'markdown':
				return systemMarkdown(system)
			case 'tokens':
				return systemTokensBundle(system, prefix)
			default:
				return systemCss(system, colorFormat, prefix)
		}
	}, [system, format, colorFormat, prefix])

	const files = useMemo(
		() =>
			isTokens
				? tokenFiles.map((f) => ({
						filename: f.filename,
						contents: f.json,
				  }))
				: [{ filename: `design-system-${format}.txt`, contents: code }],
		[isTokens, tokenFiles, format, code]
	)

	const { copied: svgCopied, trigger: triggerSvg } = useCopied()
	const copyFoundationsSvg = () =>
		copySvg(foundationsToSvg(system.foundations), triggerSvg)

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
				files={files}
				onPrefixChange={format === 'markdown' ? undefined : setPrefix}
				notice={
					isTokens ? (
						<div className='text-step--2 space-y-2xs rounded-sm border border-black-100 bg-cream-200 p-xs'>
							<p>
								<span className='font-roboto-condensed font-bold uppercase tracking-tight'>
									Built for Figma.
								</span>{' '}
								Figma imports one file per variable mode, so this
								saves {tokenFiles.length} files. In the Variables
								panel, right-click a mode column and choose
								&ldquo;Import mode&rdquo;:
							</p>
							<ul className='space-y-3xs'>
								{tokenFiles.map((f) => (
									<li key={f.filename}>
										<code className='font-mono'>
											{f.filename}
										</code>{' '}
										&rarr; {f.collection}, mode{' '}
										<span className='font-bold'>{f.mode}</span>
									</li>
								))}
							</ul>
							<p>
								Values are shaped for the importer: dimensions in
								px, durations in seconds, one font family per
								token. The CSS and Tailwind formats keep the rem,
								ms, and full font stacks.
							</p>
							<p>
								Figma has no variable type for{' '}
								{FIGMA_UNSUPPORTED.map((u, i) => (
									<span key={u.type}>
										{i > 0 && ' or '}
										<span className='font-bold'>
											{u.label.toLowerCase()}
										</span>
									</span>
								))}
								, so they are left out of the files above.{' '}
								<span className='font-bold'>Copy for Figma</span>{' '}
								puts them on your clipboard as named layers
								instead — paste, select a card, and
								&ldquo;Create style from selection&rdquo; turns it
								into a matching effect style.
							</p>
						</div>
					) : undefined
				}
				actions={
					isTokens ? (
						<button
							onClick={copyFoundationsSvg}
							aria-live='polite'
							title='Copy elevation and easings as an SVG to paste into Figma'
							className={`px-xs py-2xs rounded-sm font-roboto-condensed font-bold ${
								svgCopied
									? 'bg-green-200 text-green-800'
									: 'bg-cream-200 text-black-400 hover:bg-yellow-500 hover:text-black-500'
							}`}
						>
							{svgCopied ? 'Copied for Figma!' : 'Copy for Figma'}
						</button>
					) : undefined
				}
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
							className='h-9 px-xs border border-black-100 rounded-sm bg-cream-50 text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
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
