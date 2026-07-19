import { useMemo, useState } from 'react'
import { useHashSync } from '../hooks/useHashSync'
import ExportBlock from './ExportBlock'
import {
	generateSpaceSizes,
	generateSpacePairs,
	computeGrid,
	gutterClampFor,
	toCss,
	toTailwind,
	toTokens,
	encodeSpaceGrid,
	decodeSpaceGrid,
	px,
	type SpaceConfig,
	type GridConfig,
} from '../utils/spaceScale'

type ExportFormat = 'css' | 'tailwind4' | 'tokens'

const HASH_PREFIX = '#s='

// 8pt-grid defaults: @min base 16 -> 4/8/12/16/24/32/48/64/96 (a clean 4/8pt
// ramp); @max base 20 so the scale is genuinely fluid (20 -> 5/10/15/20/...).
// Viewport 320–1440 per the project default.
const DEFAULT_SPACE: SpaceConfig = {
	minViewport: 320,
	maxViewport: 1440,
	minBase: 16,
	maxBase: 20,
}
const DEFAULT_GRID: GridConfig = {
	minViewport: 320,
	maxViewport: 1440,
	containerMax: 1240,
	minGutter: 16,
	maxGutter: 32,
	columnMax: 60,
	columns: 12,
	roundMinColumn: 'none',
}

// The preview swatch/bar fill — the project blue token (not Utopia's pink).
// The pair-bar taper uses color-mix since a var() can't take a hex alpha
// suffix.
const SWATCH = 'var(--color-blue-500)'
const SWATCH_FADED = 'color-mix(in srgb, var(--color-blue-500) 40%, transparent)'

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
			{unit && <span className='text-step--2 text-black-300'>{unit}</span>}
		</div>
	</div>
)

const SpaceScale = () => {
	const [space, setSpace] = useState<SpaceConfig>(DEFAULT_SPACE)
	const [grid, setGrid] = useState<GridConfig>(DEFAULT_GRID)

	const setSpaceField = (key: keyof SpaceConfig, value: number) => {
		setSpace((s) => {
			const next = { ...s, [key]: value }
			// Keep the grid's viewports in sync with the space viewports.
			if (key === 'minViewport' || key === 'maxViewport') {
				setGrid((g) => ({ ...g, [key]: value }))
			}
			return next
		})
	}
	const setGridField = (key: keyof GridConfig, value: number) =>
		setGrid((g) => ({ ...g, [key]: value }))

	// URL-hash persistence + autosave (the unified system export reads the
	// saved config).
	const combined = useMemo(() => ({ space, grid }), [space, grid])
	useHashSync({
		prefix: HASH_PREFIX,
		value: combined,
		encode: (v) => encodeSpaceGrid(v.space, v.grid),
		decode: decodeSpaceGrid,
		onLoad: (v) => {
			setSpace(v.space)
			setGrid(v.grid)
		},
		storageKey: 'designer-utils:space-grid',
	})

	const sizes = useMemo(() => generateSpaceSizes(space), [space])
	const pairs = useMemo(() => generateSpacePairs(space), [space])
	const gridResult = useMemo(() => computeGrid(grid), [grid])
	const gutterClamp = useMemo(() => gutterClampFor(grid), [grid])

	const [format, setFormat] = useState<ExportFormat>('css')
	const [prefix, setPrefix] = useState('')
	const code = useMemo(() => {
		switch (format) {
			case 'tailwind4':
				return toTailwind(sizes, pairs, gridResult, gutterClamp, prefix)
			case 'tokens':
				return toTokens(sizes, pairs, gridResult, prefix)
			default:
				return toCss(sizes, pairs, gridResult, gutterClamp, prefix)
		}
	}, [sizes, pairs, gridResult, gutterClamp, format, prefix])
	const language = format === 'tokens' ? 'json' : 'css'

	// Largest size's max, to scale the preview swatches proportionally.
	const maxPreview = sizes[sizes.length - 1].maxSize

	return (
		<>
			<h1 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128208; Space &amp; Grid Calculator
			</h1>
			<p className='text-step--1 mb-s max-w-prose'>
				A fluid spacing scale (T-shirt sizes on an 8pt grid by default)
				and a matching layout grid, each interpolating between a min and
				max viewport with a CSS{' '}
				<code className='font-Ubuntu-mono-bold'>clamp()</code>.
			</p>

			{/* Space inputs */}
			<section className='tracking-tight container p-xs mb-m bg-cream-50 rounded-lg border border-black-100'>
				<div className='grid gap-s sm:grid-cols-2'>
					<fieldset className='space-y-2xs'>
						<legend className='text-step--2 font-roboto-condensed uppercase tracking-tight mb-3xs'>
							Min viewport
						</legend>
						<div className='grid grid-cols-2 gap-2xs'>
							<Field
								id='space-min-vw'
								label='Width'
								unit='px'
								min={0}
								value={space.minViewport}
								onChange={(v) => setSpaceField('minViewport', v)}
							/>
							<Field
								id='space-min-base'
								label='Base size'
								unit='px'
								min={1}
								value={space.minBase}
								onChange={(v) => setSpaceField('minBase', v)}
							/>
						</div>
					</fieldset>
					<fieldset className='space-y-2xs'>
						<legend className='text-step--2 font-roboto-condensed uppercase tracking-tight mb-3xs'>
							Max viewport
						</legend>
						<div className='grid grid-cols-2 gap-2xs'>
							<Field
								id='space-max-vw'
								label='Width'
								unit='px'
								min={0}
								value={space.maxViewport}
								onChange={(v) => setSpaceField('maxViewport', v)}
							/>
							<Field
								id='space-max-base'
								label='Base size'
								unit='px'
								min={1}
								value={space.maxBase}
								onChange={(v) => setSpaceField('maxBase', v)}
							/>
						</div>
					</fieldset>
				</div>
			</section>

			{/* Size scale */}
			<h2 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128207; Space scale
			</h2>
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
			<h2 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#11020; Space pairs
			</h2>
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
			<h2 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128301; Layout grid
			</h2>
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
							onClick={() =>
								setGrid((g) => ({ ...g, roundMinColumn: r }))
							}
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

			{/* Code export */}
			<h3 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128187; Code Snippet
			</h3>
			<ExportBlock
				id='space-format'
				formats={[
					{ value: 'css', label: 'CSS Variables' },
					{ value: 'tailwind4', label: 'Tailwind 4.1' },
					{ value: 'tokens', label: 'Design Tokens (JSON)' },
				]}
				format={format}
				onFormatChange={(v) => setFormat(v as ExportFormat)}
				code={code}
				language={language}
				filename={`space-grid-${format}.txt`}
				onPrefixChange={setPrefix}
			/>
		</>
	)
}

// One size row: label, multiplier-less, @min / @max each with a proportional
// pink swatch (capped so the biggest size doesn't overflow the column).
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
					{px(size.minSize)}
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
					{px(size.maxSize)}
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

export default SpaceScale
