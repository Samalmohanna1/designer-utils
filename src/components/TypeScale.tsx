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

// Specimen text shown at every step's size in the preview, so the same words
// are compared across the scale. Short so it doesn't truncate at large steps.
const SAMPLE_TEXT = '“Less, but better”'
const SAMPLE_AUTHOR = 'Dieter Rams'

// The preview slider's draggable handle is a device icon that reflects the
// previewed width: phone below 768px, tablet 768–1023, laptop at 1024+.
type Device = 'mobile' | 'tablet' | 'laptop'
const deviceForWidth = (px: number): Device =>
	px < 768 ? 'mobile' : px < 1024 ? 'tablet' : 'laptop'

// Device icons (FontAwesome 7). Phone and tablet share the portrait body —
// tablet is the wider version — so they read as one family at different sizes.
// `screen` is a filled rect drawn behind the path so the device's screen
// cutout shows blue; all three are tinted.
const SCREEN_BLUE = '#5799DB'
const DEVICE_ICON: Record<
	Device,
	{ viewBox: string; path: string; screen?: { x: number; y: number; w: number; h: number } }
> = {
	mobile: {
		// Portrait phone with a framed screen; screen tinted blue.
		viewBox: '0 0 640 640',
		path: 'M144 128C144 92.7 172.7 64 208 64L432 64C467.3 64 496 92.7 496 128L496 512C496 547.3 467.3 576 432 576L208 576C172.7 576 144 547.3 144 512L144 128zM208 128L208 432L432 432L432 128L208 128zM320 536C337.7 536 352 521.7 352 504C352 486.3 337.7 472 320 472C302.3 472 288 486.3 288 504C288 521.7 302.3 536 320 536z',
		screen: { x: 208, y: 128, w: 224, h: 304 },
	},
	tablet: {
		// Wider portrait tablet with a framed screen; screen tinted blue.
		viewBox: '0 0 640 640',
		path: 'M96 128C96 92.7 124.7 64 160 64L480 64C515.3 64 544 92.7 544 128L544 512C544 547.3 515.3 576 480 576L160 576C124.7 576 96 547.3 96 512L96 128zM352 496C352 478.3 337.7 464 320 464C302.3 464 288 478.3 288 496C288 513.7 302.3 528 320 528C337.7 528 352 513.7 352 496zM480 128L160 128L160 416L480 416L480 128z',
		screen: { x: 160, y: 128, w: 320, h: 288 },
	},
	laptop: {
		// Current laptop, with the lid interior tinted blue behind the outline.
		viewBox: '0 0 640 512',
		path: 'M128 96l384 0 0 256 64 0 0-256c0-35.3-28.7-64-64-64L128 32C92.7 32 64 60.7 64 96l0 256 64 0 0-256zM19.2 384C8.6 384 0 392.6 0 403.2C0 445.6 34.4 480 76.8 480l486.4 0c42.4 0 76.8-34.4 76.8-76.8c0-10.6-8.6-19.2-19.2-19.2L19.2 384z',
		screen: { x: 128, y: 96, w: 384, h: 256 },
	},
}

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
					{(() => {
						const clamped = Math.min(
							Math.max(preview, config.minViewport),
							config.maxViewport
						)
						const span = config.maxViewport - config.minViewport
						const pct =
							span > 0
								? ((clamped - config.minViewport) / span) * 100
								: 0
						const device = deviceForWidth(clamped)
						const icon = DEVICE_ICON[device]
						return (
							<div className='relative flex-1 min-w-40 h-10'>
								{/* thick track */}
								<div className='pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-black-100'>
									<div
										className='h-full rounded-full bg-yellow-500'
										style={{ width: `${pct}%` }}
									/>
								</div>
								{/* device-icon handle, tracks the value. Sized in em
								    off text-step-2 at 1.2em — emoji glyphs render
								    ~1.2x their font-size, so this matches the heading
								    emoji glyph height. `width:max-content` so the
								    absolutely-positioned box sizes to its icon
								    regardless of how close `left` is to the
								    container's right edge — otherwise the available
								    width collapses there and the wide laptop icon
								    gets squished. Travel inset ~18px each side keeps
								    the icon center on the bar. */}
								<div
									className='pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center text-step-2 text-black-500'
									style={{
										left: `calc(18px + ${pct}% - ${pct / 100} * 36px)`,
										width: 'max-content',
									}}
									aria-hidden='true'
								>
									<svg
										xmlns='http://www.w3.org/2000/svg'
										viewBox={icon.viewBox}
										className='h-[1.2em] w-auto shrink-0 fill-current'
									>
										{icon.screen && (
											<rect
												x={icon.screen.x}
												y={icon.screen.y}
												width={icon.screen.w}
												height={icon.screen.h}
												fill={SCREEN_BLUE}
											/>
										)}
										<path d={icon.path} />
									</svg>
								</div>
								{/* the real, accessible input — transparent, sits on top */}
								<input
									id='preview-vw'
									type='range'
									min={config.minViewport}
									max={config.maxViewport}
									value={clamped}
									onChange={(e) =>
										setPreview(parseInt(e.target.value, 10))
									}
									aria-label={`Preview viewport width, ${clamped} pixels (${device})`}
									className='device-range absolute inset-0 w-full h-full cursor-pointer opacity-0'
								/>
							</div>
						)
					})()}
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
								<span className='flex items-baseline gap-2xs min-w-0'>
									<span className='text-step--2 text-black-300 font-roboto-condensed uppercase tracking-tight shrink-0'>
										Step {s.step}
									</span>
									<span
										className='font-roboto-condensed font-bold text-black-500 leading-tight truncate pr-[0.15em]'
										style={{ fontSize: `${px}px` }}
									>
										{SAMPLE_TEXT}{' '}
										<span className='font-normal italic'>
											— {SAMPLE_AUTHOR}
										</span>
									</span>
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
