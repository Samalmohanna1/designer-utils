import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import {
	generateTypeScale,
	toCss,
	toTailwind,
	toTokens,
	sizeAtViewport,
	encodeConfig,
	decodeConfig,
	NAMED_RATIOS,
	ratioName,
	type TypeScaleConfig,
} from '../utils/typeScale'

type ExportFormat = 'css' | 'tailwind4' | 'tokens'

const HASH_PREFIX = '#t='

const DEFAULT_CONFIG: TypeScaleConfig = {
	minViewport: 320,
	maxViewport: 1240,
	minFontSize: 18,
	maxFontSize: 20,
	minRatio: 1.2,
	maxRatio: 1.25,
	stepsUp: 5,
	stepsDown: 2,
}

// Reads a config from the URL hash, if present and valid. Client-only.
const readHashConfig = (): TypeScaleConfig | null => {
	if (typeof window === 'undefined') return null
	const hash = window.location.hash
	if (!hash.startsWith(HASH_PREFIX)) return null
	return decodeConfig(decodeURIComponent(hash.slice(HASH_PREFIX.length)))
}

// A labeled number input wired to one config field. Empty/NaN keeps the last
// valid value so the field stays editable mid-typing.
const Field: React.FC<{
	id: string
	label: string
	unit?: string
	value: number
	min?: number
	step?: number
	onChange: (v: number) => void
}> = ({ id, label, unit, value, min, step, onChange }) => (
	<div className='space-y-3xs'>
		<label
			htmlFor={id}
			className='block text-step--2 font-roboto-condensed font-bold'
		>
			{label}
		</label>
		<div className='flex items-center gap-3xs rounded-sm border border-black-100 bg-cream-50 px-2xs focus-within:ring-2 focus-within:ring-blue-500'>
			<input
				id={id}
				type='number'
				inputMode='decimal'
				min={min}
				step={step}
				value={value}
				onChange={(e) => {
					const v = parseFloat(e.target.value)
					if (!Number.isNaN(v)) onChange(v)
				}}
				className='h-9 w-full bg-transparent text-step--1 tabular-nums focus:outline-hidden'
			/>
			{unit && (
				<span className='text-step--2 text-black-300'>{unit}</span>
			)}
		</div>
	</div>
)

// Ratio input plus a select of named ratios; either drives the value.
const RatioField: React.FC<{
	id: string
	label: string
	value: number
	onChange: (v: number) => void
}> = ({ id, label, value, onChange }) => {
	const name = ratioName(value)
	return (
		<div className='space-y-3xs'>
			<label
				htmlFor={id}
				className='block text-step--2 font-roboto-condensed font-bold'
			>
				{label}
			</label>
			<input
				id={id}
				type='number'
				inputMode='decimal'
				min={1}
				step={0.001}
				value={value}
				onChange={(e) => {
					const v = parseFloat(e.target.value)
					if (!Number.isNaN(v)) onChange(v)
				}}
				className='h-9 w-full rounded-sm border border-black-100 bg-cream-50 px-2xs text-step--1 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-blue-500'
			/>
			<select
				aria-label={`${label} named ratio`}
				value={name ? value : ''}
				onChange={(e) => {
					const v = parseFloat(e.target.value)
					if (!Number.isNaN(v)) onChange(v)
				}}
				className='w-full rounded-sm border border-black-100 bg-cream-50 px-2xs py-3xs text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
			>
				<option value=''>{name || 'Custom'}</option>
				{NAMED_RATIOS.map((r) => (
					<option key={r.value} value={r.value}>
						{r.label} · {r.value}
					</option>
				))}
			</select>
		</div>
	)
}

const TypeScale = () => {
	const [config, setConfig] = useState<TypeScaleConfig>(DEFAULT_CONFIG)
	const set = useCallback(
		(key: keyof TypeScaleConfig, value: number) =>
			setConfig((c) => ({ ...c, [key]: value })),
		[]
	)

	// Gates the sync effect so it can't overwrite the hash before the initial
	// read on mount (same pattern as the color tool).
	const hydrated = useRef(false)

	const steps = useMemo(() => generateTypeScale(config), [config])

	const [format, setFormat] = useState<ExportFormat>('css')
	const code = useMemo(() => {
		switch (format) {
			case 'tailwind4':
				return toTailwind(steps)
			case 'tokens':
				return toTokens(steps)
			default:
				return toCss(steps)
		}
	}, [steps, format])
	const language = format === 'tokens' ? 'json' : 'css'

	// Preview viewport, defaulting to the midpoint between the anchors.
	const [preview, setPreview] = useState(
		Math.round((DEFAULT_CONFIG.minViewport + DEFAULT_CONFIG.maxViewport) / 2)
	)

	// On mount: a config in the URL wins; otherwise keep the default. Centers
	// the preview on the loaded anchors.
	useEffect(() => {
		const fromHash = readHashConfig()
		if (fromHash) {
			setConfig(fromHash)
			setPreview(
				Math.round((fromHash.minViewport + fromHash.maxViewport) / 2)
			)
		}
		hydrated.current = true
	}, [])

	// Live-sync the config to the URL hash (replaceState, so edits don't spam
	// history). Runs only after the initial load.
	useEffect(() => {
		if (!hydrated.current) return
		const url = `${window.location.pathname}${window.location.search}${HASH_PREFIX}${encodeConfig(config)}`
		window.history.replaceState(null, '', url)
	}, [config])

	const [isClient, setIsClient] = useState(false)
	useEffect(() => setIsClient(true), [])
	useEffect(() => {
		if (isClient) Prism.highlightAll()
	}, [code, language, isClient])

	const [copied, setCopied] = useState(false)
	useEffect(() => setCopied(false), [code])
	const copy = () => {
		navigator.clipboard.writeText(code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<>
			<h1 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128209; Type Scale Calculator
			</h1>
			<p className='text-step--1 mb-s max-w-prose'>
				Set a font size and modular-scale ratio at a minimum and maximum
				viewport. Each step fluidly interpolates between them with a CSS{' '}
				<code className='font-Ubuntu-mono-bold'>clamp()</code>.
			</p>

			{/* Controls: min / max anchors */}
			<section className='tracking-tight container p-xs mb-xl bg-cream-50 rounded-lg border border-black-100'>
				<div className='grid gap-s sm:grid-cols-2'>
					<fieldset className='space-y-2xs'>
						<legend className='text-step--2 font-roboto-condensed uppercase tracking-tight mb-3xs'>
							Min viewport
						</legend>
						<div className='grid grid-cols-3 gap-2xs'>
							<Field
								id='min-vw'
								label='Width'
								unit='px'
								min={0}
								value={config.minViewport}
								onChange={(v) => set('minViewport', v)}
							/>
							<Field
								id='min-size'
								label='Font size'
								unit='px'
								min={1}
								value={config.minFontSize}
								onChange={(v) => set('minFontSize', v)}
							/>
							<RatioField
								id='min-ratio'
								label='Type scale'
								value={config.minRatio}
								onChange={(v) => set('minRatio', v)}
							/>
						</div>
					</fieldset>

					<fieldset className='space-y-2xs'>
						<legend className='text-step--2 font-roboto-condensed uppercase tracking-tight mb-3xs'>
							Max viewport
						</legend>
						<div className='grid grid-cols-3 gap-2xs'>
							<Field
								id='max-vw'
								label='Width'
								unit='px'
								min={0}
								value={config.maxViewport}
								onChange={(v) => set('maxViewport', v)}
							/>
							<Field
								id='max-size'
								label='Font size'
								unit='px'
								min={1}
								value={config.maxFontSize}
								onChange={(v) => set('maxFontSize', v)}
							/>
							<RatioField
								id='max-ratio'
								label='Type scale'
								value={config.maxRatio}
								onChange={(v) => set('maxRatio', v)}
							/>
						</div>
					</fieldset>
				</div>

				<div className='flex flex-wrap gap-s mt-s'>
					<div className='w-28'>
						<Field
							id='steps-up'
							label='Steps up'
							min={0}
							step={1}
							value={config.stepsUp}
							onChange={(v) =>
								set('stepsUp', Math.max(0, Math.round(v)))
							}
						/>
					</div>
					<div className='w-28'>
						<Field
							id='steps-down'
							label='Steps down'
							min={0}
							step={1}
							value={config.stepsDown}
							onChange={(v) =>
								set('stepsDown', Math.max(0, Math.round(v)))
							}
						/>
					</div>
				</div>
			</section>

			{/* Live preview */}
			<h2 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128064; Preview
			</h2>
			<section className='tracking-tight container p-xs mb-xl bg-cream-50 rounded-lg border border-black-100'>
				<div className='flex flex-wrap items-center gap-2xs mb-s'>
					<label
						htmlFor='preview-vw'
						className='text-step--2 font-roboto-condensed'
					>
						Previewing at
					</label>
					<input
						id='preview-vw'
						type='range'
						min={config.minViewport}
						max={config.maxViewport}
						value={Math.min(
							Math.max(preview, config.minViewport),
							config.maxViewport
						)}
						onChange={(e) => setPreview(parseInt(e.target.value, 10))}
						className='flex-1 min-w-40 accent-yellow-500'
					/>
					<span className='text-step--1 font-bold tabular-nums'>
						{preview}px
					</span>
				</div>

				<ul className='space-y-2xs'>
					{steps.map((s) => {
						const px = sizeAtViewport(s, preview, config)
						return (
							<li
								key={s.step}
								className='flex items-baseline justify-between gap-s border-b border-black-50 pb-2xs'
							>
								<span
									className='font-roboto-condensed text-black-500 leading-none truncate'
									style={{ fontSize: `${px}px` }}
								>
									Step {s.step}
								</span>
								<span className='text-step--2 text-black-300 tabular-nums shrink-0'>
									{px.toFixed(2)}px
								</span>
							</li>
						)
					})}
				</ul>
			</section>

			{/* Code export */}
			<h3 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128187; Code Snippet
			</h3>
			<div className='border border-black-100 bg-cream-50 rounded-lg overflow-hidden'>
				<div className='p-xs'>
					<div className='space-y-3xs'>
						<label
							htmlFor='type-format'
							className='block text-step--2 font-roboto-condensed'
						>
							Format
						</label>
						<select
							id='type-format'
							value={format}
							onChange={(e) =>
								setFormat(e.target.value as ExportFormat)
							}
							className='px-xs py-2xs border border-black-100 rounded-sm bg-cream-50 text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
						>
							<option value='css'>CSS Variables</option>
							<option value='tailwind4'>Tailwind 4.1</option>
							<option value='tokens'>Design Tokens (JSON)</option>
						</select>
					</div>
				</div>
				<div className='relative bg-[#2d2d2d] text-cream-100'>
					<button
						onClick={copy}
						className={`absolute top-6 right-6 z-10 px-xs py-2xs rounded-sm font-roboto-condensed font-bold ${
							copied
								? 'bg-green-200 text-green-800'
								: 'bg-cream-200 text-black-400 hover:bg-yellow-500'
						}`}
					>
						{copied ? 'Code Copied!' : 'Copy Code'}
					</button>
					<pre className='p-s max-h-128 overflow-auto'>
						<code
							className={`text-sm sm:text-lg ${
								isClient ? `language-${language}` : ''
							}`}
						>
							{code}
						</code>
					</pre>
				</div>
			</div>
		</>
	)
}

export default TypeScale
