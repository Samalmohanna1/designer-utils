import { useMemo } from 'react'
import Field from './Field'
import { pxToRem } from '../utils/typeScale'
import {
	generateSpaceSizes,
	generateSpacePairs,
	computeGrid,
	px,
	type SpaceConfig,
	type GridConfig,
} from '../utils/spaceScale'

// The preview swatch/bar fill — the project blue token (not Utopia's pink).
// The pair-bar taper uses color-mix since a var() can't take a hex alpha
// suffix.
const SWATCH = 'var(--color-blue-500)'
const SWATCH_FADED = 'color-mix(in srgb, var(--color-blue-500) 40%, transparent)'

// The space & grid section: state lives in DesignSystemApp; viewport anchors
// come from the shared viewport control.
const SpaceSection: React.FC<{
	space: SpaceConfig
	grid: GridConfig
	onSpaceChange: (next: SpaceConfig) => void
	onGridChange: (next: GridConfig) => void
}> = ({ space, grid, onSpaceChange, onGridChange }) => {
	const setSpaceField = (key: keyof SpaceConfig, value: number) =>
		onSpaceChange({ ...space, [key]: value })
	const setGridField = <K extends keyof GridConfig>(
		key: K,
		value: GridConfig[K]
	) => onGridChange({ ...grid, [key]: value })

	const sizes = useMemo(() => generateSpaceSizes(space), [space])
	const pairs = useMemo(() => generateSpacePairs(space), [space])
	const gridResult = useMemo(() => computeGrid(grid), [grid])

	// Largest size's max, to scale the preview swatches proportionally.
	const maxPreview = sizes[sizes.length - 1].maxSize

	return (
		<>
			<h2 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128208; Space &amp; Grid
			</h2>
			<p className='text-step--1 mb-s max-w-prose'>
				A fluid spacing scale (T-shirt sizes on an 8pt grid by default)
				and a matching layout grid, each interpolating between the shared
				viewport anchors with a CSS{' '}
				<code className='font-Ubuntu-mono-bold'>clamp()</code>.
			</p>

			{/* Space inputs */}
			<section className='tracking-tight container p-xs mb-m bg-cream-50 rounded-lg border border-black-100'>
				<div className='grid grid-cols-2 gap-s max-w-md'>
					<Field
						id='space-min-base'
						label={`Base size @min (${space.minViewport}px)`}
						unit='px'
						min={1}
						value={space.minBase}
						onChange={(v) => setSpaceField('minBase', v)}
					/>
					<Field
						id='space-max-base'
						label={`Base size @max (${space.maxViewport}px)`}
						unit='px'
						min={1}
						value={space.maxBase}
						onChange={(v) => setSpaceField('maxBase', v)}
					/>
				</div>
			</section>

			{/* Size scale */}
			<h3 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128207; Space scale
			</h3>
			<section className='tracking-tight container p-xs mb-m bg-cream-50 rounded-lg border border-black-100'>
				<div className='grid grid-cols-[auto_1fr_1fr] gap-x-s gap-y-2xs items-center'>
					<span className='text-step--2 font-roboto-condensed uppercase tracking-tight text-black-300'>
						Size
					</span>
					<span className='text-step--2 font-roboto-condensed uppercase tracking-tight text-black-300'>
						@min
					</span>
					<span className='text-step--2 font-roboto-condensed uppercase tracking-tight text-black-300'>
						@max
					</span>
					{sizes.map((s) => (
						<SizeRow key={s.label} size={s} maxPreview={maxPreview} />
					))}
				</div>
			</section>

			{/* Pairs */}
			<h3 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#11020; Space pairs
			</h3>
			<section className='tracking-tight container p-xs mb-m bg-cream-50 rounded-lg border border-black-100'>
				<ul className='space-y-s'>
					{pairs.map((p) => (
						<li key={p.label} className='space-y-3xs'>
							<div className='flex items-baseline justify-between text-step--2'>
								<span className='font-roboto-condensed font-bold uppercase tracking-tight'>
									{p.from} → {p.to}
								</span>
								<span className='text-black-300 tabular-nums'>
									{px(p.minSize)} → {px(p.maxSize)}
								</span>
							</div>
							{/* gradient bar: min block, taper, max block. End-block
							    widths are capped so the bar can't overflow on narrow
							    screens or with large bases. */}
							<div className='flex items-center overflow-hidden'>
								<span
									className='h-6 rounded-xs shrink-0'
									style={{
										width: `${Math.min(p.minSize, 96)}px`,
										backgroundColor: SWATCH,
									}}
								/>
								<span
									className='h-3 grow min-w-[12px]'
									style={{
										backgroundColor: SWATCH_FADED,
									}}
								/>
								<span
									className='h-6 rounded-xs shrink-0'
									style={{
										width: `${Math.min(p.maxSize, 96)}px`,
										backgroundColor: SWATCH,
									}}
								/>
							</div>
						</li>
					))}
				</ul>
			</section>

			{/* Grid */}
			<h3 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128301; Layout grid
			</h3>
			<section className='tracking-tight container p-xs mb-m bg-cream-50 rounded-lg border border-black-100 space-y-s'>
				<div className='grid gap-s sm:grid-cols-2 lg:grid-cols-4'>
					<Field
						id='grid-container'
						label='Container max'
						unit='px'
						min={0}
						value={grid.containerMax}
						onChange={(v) => setGridField('containerMax', v)}
					/>
					<Field
						id='grid-min-gutter'
						label='Gutter @min'
						unit='px'
						min={0}
						value={grid.minGutter}
						onChange={(v) => setGridField('minGutter', v)}
					/>
					<Field
						id='grid-max-gutter'
						label='Gutter @max'
						unit='px'
						min={0}
						value={grid.maxGutter}
						onChange={(v) => setGridField('maxGutter', v)}
					/>
					<Field
						id='grid-columns'
						label='Columns'
						min={1}
						step={1}
						value={grid.columns}
						onChange={(v) =>
							setGridField('columns', Math.max(1, Math.round(v)))
						}
					/>
				</div>

				<div className='grid grid-cols-[auto_1fr_1fr] gap-x-s gap-y-2xs text-step--1'>
					<span className='font-roboto-condensed font-bold'>Width</span>
					<span className='font-roboto-condensed font-bold'>@min</span>
					<span className='font-roboto-condensed font-bold'>@max</span>

					<span>Container</span>
					<span className='tabular-nums'>{px(gridResult.minContainer)}</span>
					<span className='tabular-nums'>{px(gridResult.maxContainer)}</span>

					<span>Gutter</span>
					<span className='tabular-nums'>{px(gridResult.minGutter)}</span>
					<span className='tabular-nums'>{px(gridResult.maxGutter)}</span>

					<span>Column</span>
					<span className='tabular-nums'>
						{px(gridResult.minColumn)}
						{grid.roundMinColumn !== 'none' && (
							<span className='text-black-300'>
								{' '}
								→ {px(gridResult.minColumnRounded)}
							</span>
						)}
					</span>
					<span className='tabular-nums'>{px(gridResult.maxColumn)}</span>
				</div>

				<div className='flex flex-wrap items-center gap-2xs text-step--2'>
					<span className='text-black-300'>Round @min column:</span>
					{(['none', 'down', 'up'] as const).map((r) => (
						<button
							key={r}
							type='button'
							onClick={() => setGridField('roundMinColumn', r)}
							aria-pressed={grid.roundMinColumn === r}
							className={`px-xs py-3xs rounded-sm border font-roboto-condensed ${
								grid.roundMinColumn === r
									? 'border-black-500 bg-black-500 text-cream-100'
									: 'border-black-100 hover:bg-black-500 hover:text-cream-100'
							}`}
						>
							{r === 'none' ? 'Off' : r}
						</button>
					))}
				</div>
			</section>
		</>
	)
}

// One size row: label, @min / @max each with a proportional swatch (capped so
// the biggest size doesn't overflow the column).
const SizeRow: React.FC<{
	size: ReturnType<typeof generateSpaceSizes>[number]
	maxPreview: number
}> = ({ size, maxPreview }) => {
	const cap = 120 // px ceiling for the largest swatch
	const scale = (n: number) => Math.min(n, (n / maxPreview) * cap)
	return (
		<>
			<span className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-black-500 text-cream-100 text-step--2 font-bold uppercase'>
				{size.label}
			</span>
			<div className='space-y-3xs'>
				<span className='block text-step--2 text-black-400 tabular-nums'>
					{px(size.minSize)} · {pxToRem(size.minSize)}
				</span>
				<span
					className='block rounded-xs'
					style={{
						width: `${scale(size.minSize)}px`,
						height: `${scale(size.minSize)}px`,
						backgroundColor: SWATCH,
					}}
				/>
			</div>
			<div className='space-y-3xs'>
				<span className='block text-step--2 text-black-400 tabular-nums'>
					{px(size.maxSize)} · {pxToRem(size.maxSize)}
				</span>
				<span
					className='block rounded-xs'
					style={{
						width: `${scale(size.maxSize)}px`,
						height: `${scale(size.maxSize)}px`,
						backgroundColor: SWATCH,
					}}
				/>
			</div>
		</>
	)
}

export default SpaceSection
