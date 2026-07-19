import { useEffect, useMemo, useState } from 'react'
import { useHashSync } from '../hooks/useHashSync'
import ExportBlock from './ExportBlock'
import {
	DEFAULT_FOUNDATIONS,
	FONT_STACKS,
	EASINGS,
	durations,
	easingCss,
	elevationCss,
	encodeFoundations,
	decodeFoundations,
	generateBorders,
	generateElevation,
	generateRadii,
	toCss,
	toTailwind,
	toTokens,
	type FoundationsConfig,
} from '../utils/foundations'
import {
	STORAGE_KEYS,
	readSystemState,
	systemCss,
	systemTailwind,
	systemTokens,
	type SystemState,
} from '../utils/systemExport'

type ExportFormat = 'css' | 'tailwind4' | 'tokens'

const HASH_PREFIX = '#f='

const EXPORT_FORMATS = [
	{ value: 'css', label: 'CSS Variables' },
	{ value: 'tailwind4', label: 'Tailwind 4.1' },
	{ value: 'tokens', label: 'Design Tokens (JSON)' },
]

const Field: React.FC<{
	id: string
	label: string
	unit?: string
	value: number
	min?: number
	max?: number
	step?: number
	onChange: (v: number) => void
}> = ({ id, label, unit, value, min, max, step, onChange }) => (
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
				max={max}
				step={step}
				value={value}
				onChange={(e) => {
					const v = parseFloat(e.target.value)
					if (!Number.isNaN(v)) onChange(v)
				}}
				className='h-9 w-full bg-transparent text-step--1 tabular-nums focus:outline-hidden'
			/>
			{unit && <span className='text-step--2 text-black-300'>{unit}</span>}
		</div>
	</div>
)

const SectionHeading: React.FC<{
	id: string
	emoji: string
	children: React.ReactNode
}> = ({ id, emoji, children }) => (
	<h2
		id={id}
		className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase scroll-mt-m'
	>
		{emoji} {children}
	</h2>
)

const sectionClass =
	'tracking-tight container p-xs mb-m bg-cream-50 rounded-lg border border-black-100'

// One font-stack picker: preset select + free-text stack + live specimen.
const StackField: React.FC<{
	id: string
	label: string
	value: string
	onChange: (stack: string) => void
}> = ({ id, label, value, onChange }) => {
	const preset = FONT_STACKS.find((s) => s.value === value)
	return (
		<div className='space-y-3xs'>
			<label
				htmlFor={id}
				className='block text-step--2 font-roboto-condensed font-bold'
			>
				{label}
			</label>
			<div className='grid gap-2xs sm:grid-cols-[12rem_1fr]'>
				<select
					aria-label={`${label} preset`}
					value={preset ? preset.value : ''}
					onChange={(e) => {
						if (e.target.value) onChange(e.target.value)
					}}
					className='rounded-sm border border-black-100 bg-cream-50 px-2xs py-3xs text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
				>
					<option value=''>{preset ? preset.label : 'Custom'}</option>
					{FONT_STACKS.map((s) => (
						<option key={s.label} value={s.value}>
							{s.label}
						</option>
					))}
				</select>
				<input
					id={id}
					type='text'
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className='h-9 w-full rounded-sm border border-black-100 bg-cream-50 px-2xs text-step--2 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500'
				/>
			</div>
			<p
				className='text-step-0 text-black-500 truncate'
				style={{ fontFamily: value }}
			>
				The quick brown fox jumps over the lazy dog — 0123456789
			</p>
		</div>
	)
}

const Foundations = () => {
	const [config, setConfig] = useState<FoundationsConfig>(DEFAULT_FOUNDATIONS)
	const set = <K extends keyof FoundationsConfig>(
		key: K,
		value: FoundationsConfig[K]
	) => setConfig((c) => ({ ...c, [key]: value }))

	useHashSync({
		prefix: HASH_PREFIX,
		value: config,
		encode: encodeFoundations,
		decode: decodeFoundations,
		onLoad: setConfig,
		storageKey: STORAGE_KEYS.foundations,
	})

	const radii = useMemo(() => generateRadii(config), [config])
	const borders = useMemo(() => generateBorders(config), [config])
	const elevationLight = useMemo(
		() => generateElevation(config, 'light'),
		[config]
	)
	const elevationDark = useMemo(
		() => generateElevation(config, 'dark'),
		[config]
	)

	const [format, setFormat] = useState<ExportFormat>('css')
	const [prefix, setPrefix] = useState('')
	const code = useMemo(() => {
		switch (format) {
			case 'tailwind4':
				return toTailwind(config, prefix)
			case 'tokens':
				return toTokens(config, prefix)
			default:
				return toCss(config, prefix)
		}
	}, [config, format, prefix])

	// Which easing demos are in their "played" position.
	const [played, setPlayed] = useState<Record<string, boolean>>({})

	// The whole-system export reads every tool's autosave — client-only, and
	// re-read when this page's config changes (its autosave just updated).
	const [system, setSystem] = useState<SystemState | null>(null)
	useEffect(() => setSystem(readSystemState()), [config])
	const [systemFormat, setSystemFormat] = useState<ExportFormat>('tokens')
	const [systemPrefix, setSystemPrefix] = useState('')
	const systemCode = useMemo(() => {
		if (!system) return ''
		switch (systemFormat) {
			case 'css':
				return systemCss(system, systemPrefix)
			case 'tailwind4':
				return systemTailwind(system, systemPrefix)
			default:
				return systemTokens(system, systemPrefix)
		}
	}, [system, systemFormat, systemPrefix])

	const savedSummary = system
		? [
				system.saved.color ? 'your palette' : 'default palette',
				system.saved.type ? 'your type scale' : 'default type scale',
				system.saved.space ? 'your space & grid' : 'default space & grid',
				'these foundations',
		  ].join(', ')
		: ''

	return (
		<>
			<h1 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#129521; Foundations
			</h1>
			<p className='text-step--1 mb-s max-w-prose'>
				The token layers beyond color, type, and space: corner radii,
				border widths, elevation, font stacks, and motion — each with the
				same CSS, Tailwind 4, and Design Tokens exports.
			</p>

			{/* Radii */}
			<SectionHeading id='radii' emoji={'⭕'}>
				Corner radii
			</SectionHeading>
			<section className={sectionClass}>
				<div className='w-40 mb-s'>
					<Field
						id='radius-base'
						label='Base radius (md)'
						unit='px'
						min={0}
						value={config.radiusBase}
						onChange={(v) => set('radiusBase', v)}
					/>
				</div>
				<div className='flex flex-wrap gap-s items-end'>
					{radii.map((r) => (
						<div key={r.label} className='space-y-3xs text-center'>
							<span
								className='block w-20 h-20 bg-blue-500 border border-black-100'
								style={{ borderRadius: `${r.px}px` }}
							/>
							<span className='block text-step--2 font-roboto-condensed font-bold uppercase'>
								{r.label}
							</span>
							<span className='block text-step--2 text-black-300 tabular-nums'>
								{r.label === 'full' ? '9999px' : `${r.px}px`}
							</span>
						</div>
					))}
				</div>
			</section>

			{/* Borders */}
			<SectionHeading id='borders' emoji={'〰️'}>
				Border widths
			</SectionHeading>
			<section className={sectionClass}>
				<div className='w-40 mb-s'>
					<Field
						id='border-base'
						label='Base width (hairline)'
						unit='px'
						min={0.5}
						step={0.5}
						value={config.borderBase}
						onChange={(v) => set('borderBase', v)}
					/>
				</div>
				<ul className='space-y-s'>
					{borders.map((b) => (
						<li key={b.label} className='space-y-3xs'>
							<div className='flex items-baseline justify-between text-step--2'>
								<span className='font-roboto-condensed font-bold uppercase tracking-tight'>
									{b.label}
								</span>
								<span className='text-black-300 tabular-nums'>
									{b.px}px
								</span>
							</div>
							<div
								className='w-full border-black-500'
								style={{ borderTopWidth: `${b.px}px`, borderTopStyle: 'solid' }}
							/>
						</li>
					))}
				</ul>
			</section>

			{/* Elevation */}
			<SectionHeading id='elevation' emoji={'\u{1F4E6}'}>
				Elevation
			</SectionHeading>
			<section className={sectionClass}>
				<div className='flex flex-wrap gap-s mb-s'>
					<div className='space-y-3xs'>
						<label
							htmlFor='shadow-color'
							className='block text-step--2 font-roboto-condensed font-bold'
						>
							Shadow color
						</label>
						<input
							id='shadow-color'
							type='color'
							value={config.shadowColor}
							onChange={(e) => set('shadowColor', e.target.value.toUpperCase())}
							className='h-9 w-16 cursor-pointer rounded-sm border border-black-100 bg-cream-50'
						/>
					</div>
					<div className='w-40'>
						<Field
							id='shadow-intensity'
							label='Intensity'
							min={0.5}
							max={2}
							step={0.25}
							value={config.shadowIntensity}
							onChange={(v) =>
								set('shadowIntensity', Math.min(2, Math.max(0.5, v)))
							}
						/>
					</div>
				</div>
				{/* Fixed light/dark surfaces (preview-* tokens) so both shadow
				    variants read correctly whichever theme the site is in. */}
				<div className='grid gap-s sm:grid-cols-2'>
					<div className='p-s rounded-lg bg-preview-light border border-black-100 text-preview-light-ink'>
						<p className='text-step--2 font-roboto-condensed uppercase tracking-tight mb-s'>
							Light
						</p>
						<div className='flex flex-wrap gap-s'>
							{elevationLight.map((e, i) => (
								<div
									key={e.label}
									className='w-20 h-20 rounded-md bg-preview-light-card flex items-center justify-center text-step--2 font-bold'
									style={{ boxShadow: elevationCss(e) }}
								>
									{i + 1}
								</div>
							))}
						</div>
					</div>
					<div className='p-s rounded-lg bg-preview-dark border border-black-100 text-preview-dark-ink'>
						<p className='text-step--2 font-roboto-condensed uppercase tracking-tight mb-s'>
							Dark
						</p>
						<div className='flex flex-wrap gap-s'>
							{elevationDark.map((e, i) => (
								<div
									key={e.label}
									className='w-20 h-20 rounded-md bg-preview-dark-card flex items-center justify-center text-step--2 font-bold'
									style={{ boxShadow: elevationCss(e) }}
								>
									{i + 1}
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Fonts */}
			<SectionHeading id='fonts' emoji={'\u{1F524}'}>
				Font stacks
			</SectionHeading>
			<section className={`${sectionClass} space-y-s`}>
				<StackField
					id='stack-heading'
					label='Heading'
					value={config.headingStack}
					onChange={(v) => set('headingStack', v)}
				/>
				<StackField
					id='stack-body'
					label='Body'
					value={config.bodyStack}
					onChange={(v) => set('bodyStack', v)}
				/>
				<StackField
					id='stack-mono'
					label='Mono'
					value={config.monoStack}
					onChange={(v) => set('monoStack', v)}
				/>
				<p className='text-step--2 text-black-300 max-w-prose'>
					System stacks render instantly with zero font downloads. Pick a
					preset or type any CSS font-family list.
				</p>
			</section>

			{/* Motion */}
			<SectionHeading id='motion' emoji={'⏱️'}>
				Motion
			</SectionHeading>
			<section className={sectionClass}>
				<div className='grid gap-s sm:grid-cols-3 mb-s max-w-xl'>
					<Field
						id='dur-fast'
						label='Fast'
						unit='ms'
						min={0}
						step={25}
						value={config.durationFast}
						onChange={(v) => set('durationFast', v)}
					/>
					<Field
						id='dur-base'
						label='Base'
						unit='ms'
						min={0}
						step={25}
						value={config.durationBase}
						onChange={(v) => set('durationBase', v)}
					/>
					<Field
						id='dur-slow'
						label='Slow'
						unit='ms'
						min={0}
						step={25}
						value={config.durationSlow}
						onChange={(v) => set('durationSlow', v)}
					/>
				</div>
				<ul className='space-y-s max-w-xl'>
					{EASINGS.map((e) => (
						<li key={e.label} className='space-y-3xs'>
							<div className='flex items-baseline justify-between text-step--2'>
								<span className='font-roboto-condensed font-bold uppercase tracking-tight'>
									{e.label}
								</span>
								<span className='text-black-300 font-mono'>
									{easingCss(e.bezier)}
								</span>
							</div>
							<div className='flex items-center gap-s'>
								<button
									type='button'
									onClick={() =>
										setPlayed((p) => ({
											...p,
											[e.label]: !p[e.label],
										}))
									}
									className='px-xs py-3xs border border-black-100 rounded-sm text-step--2 font-roboto-condensed hover:bg-black-500 hover:text-cream-100'
								>
									Play
								</button>
								<div className='relative grow h-6 rounded-full bg-cream-200 border border-black-50'>
									<span
										className='absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500'
										style={{
											left: played[e.label]
												? 'calc(100% - 20px)'
												: '4px',
											transition: `left ${config.durationBase}ms ${easingCss(e.bezier)}`,
										}}
									/>
								</div>
							</div>
						</li>
					))}
				</ul>
			</section>

			{/* Code export */}
			<h3
				id='export'
				className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase scroll-mt-m'
			>
				&#128187; Code Snippet
			</h3>
			<div className='mb-xl'>
				<ExportBlock
					id='foundations-format'
					formats={EXPORT_FORMATS}
					format={format}
					onFormatChange={(v) => setFormat(v as ExportFormat)}
					code={code}
					language={format === 'tokens' ? 'json' : 'css'}
					filename={`foundations-${format}.txt`}
					onPrefixChange={setPrefix}
				/>
			</div>

			{/* Whole-system export */}
			<h3
				id='system'
				className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase scroll-mt-m'
			>
				&#128230; Export the whole system
			</h3>
			<p className='text-step--1 mb-s max-w-prose'>
				Every tool's tokens in one file — color, type, space &amp; grid,
				and these foundations. Uses each tool's latest saved settings
				(currently: {savedSummary}).
			</p>
			{system && (
				<ExportBlock
					id='system-format'
					formats={EXPORT_FORMATS}
					format={systemFormat}
					onFormatChange={(v) => setSystemFormat(v as ExportFormat)}
					code={systemCode}
					language={systemFormat === 'tokens' ? 'json' : 'css'}
					filename={`design-system-${systemFormat}.txt`}
					onPrefixChange={setSystemPrefix}
				/>
			)}
		</>
	)
}

export default Foundations
