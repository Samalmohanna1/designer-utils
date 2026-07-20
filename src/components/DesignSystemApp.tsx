import { useEffect, useMemo, useState } from 'react'
import { colorUtils } from '../utils/colorUtils'
import {
	DEFAULT_TYPE_CONFIG,
	encodeConfig,
	type TypeScaleConfig,
} from '../utils/typeScale'
import {
	DEFAULT_SPACE,
	DEFAULT_GRID,
	encodeSpaceGrid,
	type SpaceConfig,
	type GridConfig,
} from '../utils/spaceScale'
import {
	DEFAULT_FOUNDATIONS,
	encodeFoundations,
	type FoundationsConfig,
} from '../utils/foundations'
import {
	STORAGE_KEYS,
	decodeSystemHash,
	encodeSystemHash,
	readSavedSystem,
	type SystemHashParts,
	type SystemState,
} from '../utils/systemExport'
import { useHashSync, useAutosave } from '../hooks/useHashSync'
import Field from './Field'
import ColorSection, {
	defaultScales,
	scalesFromEntries,
	type ScaleState,
} from './ColorSection'
import TypeSection from './TypeSection'
import SpaceSection from './SpaceSection'
import FoundationsSection from './FoundationsSection'
import ExportSection from './ExportSection'

// Everything the page owns, as one value (the unit the URL hash serializes).
interface Snapshot {
	scales: ScaleState[]
	type: TypeScaleConfig
	space: SpaceConfig
	grid: GridConfig
	foundations: FoundationsConfig
}

// Decoded hash/autosave parts as a full snapshot, defaults where a part is
// missing. The viewport anchors are unified across configs — the type
// segment's anchors win, then space's — because the page has ONE viewport
// control; a legacy single-tool link would otherwise leave the configs
// disagreeing with each other and with the control.
const snapshotFromParts = (parts: SystemHashParts): Snapshot => {
	const type = parts.type ?? DEFAULT_TYPE_CONFIG
	const space = parts.spaceGrid?.space ?? DEFAULT_SPACE
	const grid = parts.spaceGrid?.grid ?? DEFAULT_GRID
	const viewportSource = parts.type ? type : parts.spaceGrid ? space : type
	const minViewport = viewportSource.minViewport
	const maxViewport = viewportSource.maxViewport
	return {
		scales: parts.palette
			? scalesFromEntries(parts.palette)
			: defaultScales(),
		type: { ...type, minViewport, maxViewport },
		space: { ...space, minViewport, maxViewport },
		grid: { ...grid, minViewport, maxViewport },
		foundations: parts.foundations ?? DEFAULT_FOUNDATIONS,
	}
}

const decodeSnapshot = (encoded: string): Snapshot | null => {
	const parts = decodeSystemHash(encoded)
	return parts ? snapshotFromParts(parts) : null
}

const SECTION_IDS = ['colors', 'type', 'space', 'foundations', 'export']

// The whole suite as one island: every section's state lives here, the
// combined URL hash (#p=…&t=…&s=…&f=…) serializes it, and the export section
// consumes it live.
const DesignSystemApp = () => {
	const [scales, setScales] = useState<ScaleState[]>(defaultScales)
	const [typeConfig, setTypeConfig] =
		useState<TypeScaleConfig>(DEFAULT_TYPE_CONFIG)
	const [space, setSpace] = useState<SpaceConfig>(DEFAULT_SPACE)
	const [grid, setGrid] = useState<GridConfig>(DEFAULT_GRID)
	const [foundations, setFoundations] =
		useState<FoundationsConfig>(DEFAULT_FOUNDATIONS)

	const applySnapshot = (s: Snapshot) => {
		setScales(s.scales)
		setTypeConfig(s.type)
		setSpace(s.space)
		setGrid(s.grid)
		setFoundations(s.foundations)
	}

	// The one viewport control: the anchors live in the type/space/grid
	// configs (the engines and share links need them there) but are only ever
	// written together, so they can't drift apart.
	const setViewport = (
		key: 'minViewport' | 'maxViewport',
		value: number
	) => {
		setTypeConfig((c) => ({ ...c, [key]: value }))
		setSpace((s) => ({ ...s, [key]: value }))
		setGrid((g) => ({ ...g, [key]: value }))
	}

	// Per-section encodings (also the localStorage autosave payloads).
	const encoded = {
		p: colorUtils.encodePalette(scales),
		t: encodeConfig(typeConfig),
		s: encodeSpaceGrid(space, grid),
		f: encodeFoundations(foundations),
	}

	const snapshot = useMemo<Snapshot>(
		() => ({ scales, type: typeConfig, space, grid, foundations }),
		[scales, typeConfig, space, grid, foundations]
	)

	// URL-hash persistence: one combined hash for the whole page. Legacy
	// per-tool links (#p=…, #t=…, …) parse as single-segment hashes.
	useHashSync({
		prefix: '#',
		value: snapshot,
		encode: (s) =>
			encodeSystemHash({
				p: colorUtils.encodePalette(s.scales),
				t: encodeConfig(s.type),
				s: encodeSpaceGrid(s.space, s.grid),
				f: encodeFoundations(s.foundations),
			}),
		decode: decodeSnapshot,
		onLoad: applySnapshot,
	})

	// Autosave each section under its own key (the keys predate the single
	// page; existing saves keep working).
	useAutosave(STORAGE_KEYS.palette, encoded.p)
	useAutosave(STORAGE_KEYS.type, encoded.t)
	useAutosave(STORAGE_KEYS.space, encoded.s)
	useAutosave(STORAGE_KEYS.foundations, encoded.f)

	// The previous session's autosave, captured in a lazy initializer. Null
	// when the URL carries state (the URL wins) or nothing real was saved.
	const [savedParts] = useState<SystemHashParts | null>(() => {
		if (typeof window === 'undefined') return null
		if (decodeSystemHash(window.location.hash.slice(1))) return null
		return readSavedSystem()
	})
	const [restoreOpen, setRestoreOpen] = useState(false)
	// Banner appears only after hydration so server and first client render
	// match.
	useEffect(() => {
		if (savedParts) setRestoreOpen(true)
	}, [savedParts])

	const restoreSaved = () => {
		if (!savedParts) return
		applySnapshot(snapshotFromParts(savedParts))
		setRestoreOpen(false)
	}

	// The old per-tool routes redirect here as /?go=<section> (keeping any
	// legacy hash); scroll to the section and drop the query.
	useEffect(() => {
		const go = new URLSearchParams(window.location.search).get('go')
		if (!go) return
		window.history.replaceState(
			null,
			'',
			`${window.location.pathname}${window.location.hash}`
		)
		if (SECTION_IDS.includes(go)) {
			document.getElementById(go)?.scrollIntoView()
		}
	}, [])

	// Live inputs for the export section and the foundations shadow swatches.
	const system = useMemo<SystemState>(
		() => ({
			palette: scales.map((s) => ({ name: s.name, color: s.color })),
			type: typeConfig,
			space,
			grid,
			foundations,
		}),
		[scales, typeConfig, space, grid, foundations]
	)
	const slugs = colorUtils.uniqueSlugs(scales.map((s) => s.name))
	const palette = scales.map((s, i) => ({ slug: slugs[i], color: s.color }))

	return (
		<>
			<h1 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				Design System Foundations
			</h1>
			<p className='text-step--1 mb-s max-w-prose'>
				Build your design system's foundations in one place — color
				scales, a fluid type scale with your fonts, space &amp; grid,
				radii, borders, elevation, and motion — then export everything
				as one file.
			</p>

			{restoreOpen && (
				<div
					role='status'
					className='flex flex-wrap items-center gap-2xs mb-s p-xs bg-yellow-100 border border-yellow-600 rounded-lg text-step--2'
				>
					<span className='font-roboto-condensed'>
						You have a design system saved from last time. Restore
						it?
					</span>
					<div className='flex gap-2xs ml-auto'>
						<button
							onClick={restoreSaved}
							className='px-xs py-3xs bg-black-500 text-cream-100 rounded-sm hover:bg-yellow-500 hover:text-black-500 font-roboto-condensed'
						>
							Restore
						</button>
						<button
							onClick={() => setRestoreOpen(false)}
							className='px-xs py-3xs border border-black-100 rounded-sm hover:bg-black-500 hover:text-cream-100 font-roboto-condensed'
						>
							Dismiss
						</button>
					</div>
				</div>
			)}

			{/* The one viewport range every fluid scale interpolates across. */}
			<section
				aria-label='Viewport range'
				className='tracking-tight container p-xs mb-xl bg-cream-50 rounded-lg border border-black-100'
			>
				<div className='flex flex-wrap items-end gap-s'>
					<div className='w-40'>
						<Field
							id='viewport-min'
							label='Min viewport'
							unit='px'
							min={0}
							value={typeConfig.minViewport}
							onChange={(v) => setViewport('minViewport', v)}
						/>
					</div>
					<div className='w-40'>
						<Field
							id='viewport-max'
							label='Max viewport'
							unit='px'
							min={0}
							value={typeConfig.maxViewport}
							onChange={(v) => setViewport('maxViewport', v)}
						/>
					</div>
					<p className='text-step--2 text-black-300 max-w-prose'>
						Set once, used everywhere: the type, space, and grid
						scales all interpolate between these two anchors.
					</p>
				</div>
			</section>

			<div id='colors' className='scroll-mt-2xl'>
				<ColorSection scales={scales} setScales={setScales} />
			</div>

			<div id='type' className='scroll-mt-2xl mt-xl'>
				<TypeSection config={typeConfig} onChange={setTypeConfig} />
			</div>

			<div id='space' className='scroll-mt-2xl mt-xl'>
				<SpaceSection
					space={space}
					grid={grid}
					onSpaceChange={setSpace}
					onGridChange={setGrid}
				/>
			</div>

			<div id='foundations' className='scroll-mt-2xl mt-xl'>
				<FoundationsSection
					config={foundations}
					onChange={setFoundations}
					palette={palette}
				/>
			</div>

			<div id='export' className='scroll-mt-2xl mt-xl'>
				<ExportSection system={system} />
			</div>
		</>
	)
}

export default DesignSystemApp
