import { useEffect, useMemo, useState } from 'react'
import { useHashSync } from '../hooks/useHashSync'
import { colorUtils } from '../utils/colorUtils'
import {
	BORDER_LADDER,
	DEFAULT_FOUNDATIONS,
	EASINGS,
	easingCss,
	elevationCss,
	encodeFoundations,
	decodeFoundations,
	generateBorders,
	generateElevation,
	generateRadii,
	type FoundationsConfig,
} from '../utils/foundations'
import { STORAGE_KEYS } from '../utils/systemExport'

const HASH_PREFIX = '#f='

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

const sectionClass =
	'tracking-tight container p-xs mb-m bg-cream-50 rounded-lg border border-black-100'

const headingClass =
	'text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'

// Shadow-color candidates drawn from the saved color palette: each scale's
// base (500) and its darkest shade (900) — the tones shadows are tinted with.
interface ShadowSwatch {
	label: string
	hex: string
}

const paletteShadowSwatches = (): ShadowSwatch[] => {
	let raw: string | null = null
	try {
		raw = window.localStorage.getItem(STORAGE_KEYS.palette)
	} catch {
		return []
	}
	if (!raw) return []
	const entries = colorUtils.decodePalette(raw)
	const slugs = colorUtils.uniqueSlugs(entries.map((e) => e.name))
	return entries.flatMap((entry, i) => {
		const shades = colorUtils.generateShades(entry.color)
		return [
			{ label: `${slugs[i]}-500`, hex: shades[5] },
			{ label: `${slugs[i]}-900`, hex: shades[9] },
		]
	})
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

	// Palette-derived shadow colors, read from the color tool's autosave
	// (client-only, once on mount).
	const [shadowSwatches, setShadowSwatches] = useState<ShadowSwatch[]>([])
	useEffect(() => setShadowSwatches(paletteShadowSwatches()), [])

	// Which easing demos are in their "played" position.
	const [played, setPlayed] = useState<Record<string, boolean>>({})

	return (
		<>
			<h1 className={headingClass}>&#129521; Foundations</h1>
			<p className='text-step--1 mb-s max-w-prose'>
				The token layers beyond color, type, and space: corner radii,
				border widths, elevation, and motion. Grab everything from the{' '}
				<a href='/export' className='underline font-bold'>
					Export
				</a>{' '}
				page.
			</p>

			{/* Radii */}
			<h2 className={headingClass}>&#11093; Corner radii</h2>
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
			<h2 className={headingClass}>&#12336;&#65039; Border widths</h2>
			<section className={sectionClass}>
				<div className='flex flex-wrap gap-s mb-s'>
					<div className='w-40'>
						<Field
							id='border-base'
							label='Base width (s)'
							unit='px'
							min={0.5}
							step={0.5}
							value={config.borderBase}
							onChange={(v) => set('borderBase', v)}
						/>
					</div>
					<div className='w-40'>
						<Field
							id='border-steps'
							label='Sizes'
							min={1}
							max={BORDER_LADDER.length}
							step={1}
							value={config.borderSteps}
							onChange={(v) =>
								set(
									'borderSteps',
									Math.min(
										BORDER_LADDER.length,
										Math.max(1, Math.round(v))
									)
								)
							}
						/>
					</div>
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
								style={{
									borderTopWidth: `${b.px}px`,
									borderTopStyle: 'solid',
								}}
							/>
						</li>
					))}
				</ul>
			</section>

			{/* Elevation */}
			<h2 className={headingClass}>&#128230; Elevation</h2>
			<section className={sectionClass}>
				<div className='flex flex-wrap gap-s mb-s items-end'>
					<div className='space-y-3xs'>
						<label
							htmlFor='shadow-color'
							className='block text-step--2 font-roboto-condensed font-bold'
						>
							Shadow color
						</label>
						<div className='flex items-center gap-2xs'>
							<input
								id='shadow-color'
								type='color'
								value={config.shadowColor}
								onChange={(e) =>
									set('shadowColor', e.target.value.toUpperCase())
								}
								className='h-9 w-16 cursor-pointer rounded-sm border border-black-100 bg-cream-50'
							/>
							{/* From your palette: the saved scales' 500/900 shades. */}
							{[
								{ label: 'black', hex: '#000000' },
								...shadowSwatches,
							].map((s) => {
								const selected = config.shadowColor === s.hex
								return (
									<button
										key={`${s.label}-${s.hex}`}
										type='button'
										onClick={() => set('shadowColor', s.hex)}
										aria-pressed={selected}
										aria-label={`Shadow color ${s.label}, ${s.hex}`}
										title={`${s.label} · ${s.hex}`}
										className={`w-7 h-7 rounded-sm border transition-transform hover:scale-110 focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
											selected
												? 'border-black-500 ring-2 ring-black-500 scale-110'
												: 'border-black-100'
										}`}
										style={{ backgroundColor: s.hex }}
									/>
								)
							})}
						</div>
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

			{/* Motion */}
			<h2 className={headingClass}>&#9201;&#65039; Motion</h2>
			<section className={sectionClass}>
				<div className='flex flex-wrap gap-s mb-s'>
					{(
						[
							['dur-fast', 'Fast', 'durationFast'],
							['dur-base', 'Base', 'durationBase'],
							['dur-slow', 'Slow', 'durationSlow'],
						] as const
					).map(([id, label, key]) => (
						<div key={id} className='w-36'>
							<Field
								id={id}
								label={label}
								unit='ms'
								min={0}
								step={25}
								value={config[key]}
								onChange={(v) => set(key, v)}
							/>
						</div>
					))}
				</div>
				<div className='grid gap-s md:grid-cols-3'>
					{EASINGS.map((e) => (
						<div
							key={e.label}
							className='p-xs rounded-lg border border-black-50 space-y-2xs'
						>
							<div className='flex items-baseline justify-between gap-2xs'>
								<span className='text-step--2 font-roboto-condensed font-bold uppercase tracking-tight'>
									{e.label}
								</span>
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
							</div>
							<div className='relative h-6 rounded-full bg-cream-200 border border-black-50'>
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
							<p className='text-step--2 text-black-300 font-mono whitespace-nowrap overflow-hidden text-ellipsis'>
								{easingCss(e.bezier)}
							</p>
						</div>
					))}
				</div>
			</section>
		</>
	)
}

export default Foundations
