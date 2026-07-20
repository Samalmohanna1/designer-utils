import { useMemo, useState } from 'react'
import Field from './Field'
import { colorUtils } from '../utils/colorUtils'
import {
	BORDER_LADDER,
	EASINGS,
	easingCss,
	elevationCss,
	generateBorders,
	generateElevation,
	generateRadii,
	type FoundationsConfig,
} from '../utils/foundations'

const sectionClass =
	'tracking-tight container p-xs mb-m bg-cream-50 rounded-lg border border-black-100'

const headingClass =
	'text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'

// The foundations section: state lives in DesignSystemApp. `palette` is the
// live color-section palette (de-duped slugs), so the shadow color can be
// picked from any shade of any scale.
const FoundationsSection: React.FC<{
	config: FoundationsConfig
	onChange: (next: FoundationsConfig) => void
	palette: { slug: string; color: string }[]
}> = ({ config, onChange, palette }) => {
	const set = <K extends keyof FoundationsConfig>(
		key: K,
		value: FoundationsConfig[K]
	) => onChange({ ...config, [key]: value })

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

	// Every shade of every live scale, one swatch row per scale.
	const shadowRows = useMemo(
		() =>
			palette.map(({ slug, color }) => ({
				slug,
				swatches: colorUtils.generateShades(color).map((hex, i) => ({
					label: `${slug}-${colorUtils.shadeNumbers[i]}`,
					hex,
				})),
			})),
		[palette]
	)

	// Which easing demos are in their "played" position.
	const [played, setPlayed] = useState<Record<string, boolean>>({})

	const swatchButton = (s: { label: string; hex: string }) => {
		const selected = config.shadowColor === s.hex
		return (
			<button
				key={s.label}
				type='button'
				onClick={() => set('shadowColor', s.hex)}
				aria-pressed={selected}
				aria-label={`Shadow color ${s.label}, ${s.hex}`}
				title={`${s.label} · ${s.hex}`}
				className={`w-6 h-6 rounded-sm border transition-transform hover:scale-110 focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
					selected
						? 'border-black-500 ring-2 ring-black-500 scale-110'
						: 'border-black-100'
				}`}
				style={{ backgroundColor: s.hex }}
			/>
		)
	}

	return (
		<>
			<h2 className={headingClass}>&#129521; Foundations</h2>
			<p className='text-step--1 mb-s max-w-prose'>
				The token layers beyond color, type, and space: corner radii,
				border widths, elevation, and motion. Grab everything from the{' '}
				<a href='#export' className='underline font-bold'>
					Export
				</a>{' '}
				section below.
			</p>

			{/* Radii */}
			<h3 className={headingClass}>&#11093; Corner radii</h3>
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
			<h3 className={headingClass}>&#12336;&#65039; Border widths</h3>
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
			<h3 className={headingClass}>&#128230; Elevation</h3>
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
							{swatchButton({ label: 'black', hex: '#000000' })}
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
				{/* Every shade of the live palette is a candidate tint. */}
				<div className='space-y-2xs mb-s'>
					{shadowRows.map((row) => (
						<div
							key={row.slug}
							className='flex flex-wrap items-center gap-2xs'
						>
							<span className='w-20 shrink-0 text-step--2 font-roboto-condensed font-bold uppercase tracking-tight'>
								{row.slug}
							</span>
							<div className='flex flex-wrap gap-3xs'>
								{row.swatches.map(swatchButton)}
							</div>
						</div>
					))}
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
			<h3 className={headingClass}>&#9201;&#65039; Motion</h3>
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

export default FoundationsSection
