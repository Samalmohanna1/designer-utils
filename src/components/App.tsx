import { useState, useCallback, useEffect } from 'react'
import { colorUtils, type ColorScale } from '../utils/colorUtils'
import { copySvg } from '../utils/clipboard'
import { useHashSync } from '../hooks/useHashSync'
import ColorInput from './ColorInput'
import ShadeRamp from './ShadeRamp'
import ContrastChecker from './ContrastChecker'

interface ScaleState extends ColorScale {
	// True once the user types a name, which stops auto-naming from the hue.
	nameEdited: boolean
}

const STORAGE_KEY = 'color-scale-generator:palette'
const HASH_PREFIX = '#p='

const makeScale = (id: number, index: number): ScaleState => {
	const color = colorUtils.defaultColorForIndex(index)
	return {
		id,
		color,
		name: colorUtils.nameFromHex(color),
		nameEdited: false,
	}
}

const defaultScales = (): ScaleState[] => [makeScale(1, 0)]

// Build ScaleState rows from decoded {name, color} entries. The shared name is
// shown on load, but loads as not-yet-edited so recoloring still re-derives the
// name from the hue — only a name the recipient types locks it. Otherwise a
// loaded palette could keep a name that no longer matches its color.
const scalesFromEntries = (
	entries: { name: string; color: string }[]
): ScaleState[] =>
	entries.map((entry, i) => ({
		id: i + 1,
		color: entry.color,
		name: entry.name,
		nameEdited: false,
	}))

// Decodes an encoded palette into ScaleState rows, or null when nothing
// valid decodes (so the caller falls back to the default).
const decodeScales = (encoded: string): ScaleState[] | null => {
	const entries = colorUtils.decodePalette(encoded)
	return entries.length > 0 ? scalesFromEntries(entries) : null
}

const App = () => {
	const [colorScales, setColorScales] = useState<ScaleState[]>(defaultScales)
	const [nextId, setNextId] = useState(2)

	// The previous session's autosave, captured in a lazy initializer so it's
	// read BEFORE the sync effect's first write overwrites it. Null when the
	// URL carries a palette (URL wins), nothing was saved, or the save is just
	// the default.
	const [savedEntries] = useState<{ name: string; color: string }[] | null>(
		() => {
			if (typeof window === 'undefined') return null
			if (window.location.hash.startsWith(HASH_PREFIX)) return null
			let raw: string | null = null
			try {
				raw = window.localStorage.getItem(STORAGE_KEY)
			} catch {
				return null
			}
			if (!raw || raw === colorUtils.encodePalette(defaultScales())) {
				return null
			}
			const entries = colorUtils.decodePalette(raw)
			return entries.length > 0 ? entries : null
		}
	)
	const [restoreOpen, setRestoreOpen] = useState(false)
	// Banner appears only after hydration so server and first client render
	// match.
	useEffect(() => {
		if (savedEntries) setRestoreOpen(true)
	}, [savedEntries])

	const restoreSaved = () => {
		if (!savedEntries) return
		const scales = scalesFromEntries(savedEntries)
		setColorScales(scales)
		setNextId(scales.length + 1)
		setRestoreOpen(false)
	}

	// URL-hash persistence + localStorage autosave (a palette in the URL
	// always wins; the banner above offers the autosave back).
	useHashSync({
		prefix: HASH_PREFIX,
		value: colorScales,
		encode: colorUtils.encodePalette,
		decode: decodeScales,
		onLoad: (scales) => {
			setColorScales(scales)
			setNextId(scales.length + 1)
		},
		storageKey: STORAGE_KEY,
	})

	const addColorScale = useCallback(() => {
		setColorScales((prevScales) => [
			...prevScales,
			makeScale(nextId, prevScales.length),
		])
		setNextId((prev) => prev + 1)
	}, [nextId])

	const removeColorScale = useCallback((id: number) => {
		setColorScales((prevScales) =>
			prevScales.filter((scale) => scale.id !== id)
		)
	}, [])

	const handleColorChange = useCallback((id: number, newColor: string) => {
		setColorScales((prevScales) =>
			prevScales.map((s) =>
				s.id === id
					? {
							...s,
							color: newColor,
							// Follow the hue until the user types a name of
							// their own (nameEdited). Applies to loaded palettes
							// too — they load as not-yet-edited.
							name: s.nameEdited
								? s.name
								: colorUtils.nameFromHex(newColor),
					  }
					: s
			)
		)
	}, [])

	const moveScale = useCallback((id: number, direction: -1 | 1) => {
		setColorScales((prevScales) => {
			const index = prevScales.findIndex((s) => s.id === id)
			const target = index + direction
			if (index < 0 || target < 0 || target >= prevScales.length) {
				return prevScales
			}
			const next = [...prevScales]
			;[next[index], next[target]] = [next[target], next[index]]
			return next
		})
	}, [])

	const handleNameChange = useCallback((id: number, newName: string) => {
		setColorScales((prevScales) =>
			prevScales.map((s) =>
				s.id === id ? { ...s, name: newName, nameEdited: true } : s
			)
		)
	}, [])

	const [copiedScaleId, setCopiedScaleId] = useState<number | null>(null)
	// Copy one scale's ramp as a labeled-swatch SVG (see copySvg).
	const copyScale = useCallback((id: number, slug: string, color: string) => {
		copySvg(colorUtils.scaleToSvg(slug, color), () => {
			setCopiedScaleId(id)
			setTimeout(() => setCopiedScaleId(null), 1200)
		})
	}, [])

	const resetScales = useCallback(() => {
		setColorScales(defaultScales())
		setNextId(2)
	}, [])

	const [linkCopied, setLinkCopied] = useState(false)
	const copyShareLink = useCallback(() => {
		navigator.clipboard.writeText(window.location.href)
		setLinkCopied(true)
		setTimeout(() => setLinkCopied(false), 2000)
	}, [])

	const [paletteCopied, setPaletteCopied] = useState(false)

	const [bulkOpen, setBulkOpen] = useState(false)
	const [bulkText, setBulkText] = useState('')
	const addFromHexList = useCallback(() => {
		const hexes = colorUtils.parseHexList(bulkText)
		if (hexes.length === 0) return
		setColorScales((prevScales) => {
			let id = nextId
			const added: ScaleState[] = hexes.map((color) => ({
				id: id++,
				color,
				name: colorUtils.nameFromHex(color),
				nameEdited: false,
			}))
			setNextId(id)
			return [...prevScales, ...added]
		})
		setBulkText('')
		setBulkOpen(false)
	}, [bulkText, nextId])

	// De-duped slugs, matching the export/contrast naming.
	const slugs = colorUtils.uniqueSlugs(colorScales.map((s) => s.name))

	// Copy every scale as one SVG (a row per scale), so the whole palette pastes
	// into Figma at once. Uses the same de-duped slugs as the exports.
	const copyPalette = () => {
		const svg = colorUtils.paletteToSvg(
			colorScales.map((s, i) => ({ slug: slugs[i], color: s.color }))
		)
		copySvg(svg, () => {
			setPaletteCopied(true)
			setTimeout(() => setPaletteCopied(false), 2000)
		})
	}

	return (
		<>
			<div className='flex flex-wrap items-center justify-between gap-2xs mb-2xs'>
				<h1 className='text-step-1 sm:text-step-2 tracking-tight uppercase'>
					&#127912; Color Scale Generator
				</h1>
				<div className='flex items-center gap-2xs'>
					<button
						onClick={copyPalette}
						aria-live='polite'
						title='Copy the whole palette as SVG (paste into Figma)'
						className={`px-xs py-3xs border rounded-sm text-step--2 font-roboto-condensed ${
							paletteCopied
								? 'border-green-600 bg-green-200 text-green-800'
								: 'border-black-100 hover:bg-black-500 hover:text-cream-100'
						}`}
					>
						{paletteCopied ? 'Palette copied!' : 'Copy palette SVG'}
					</button>
					<button
						onClick={copyShareLink}
						aria-live='polite'
						className={`px-xs py-3xs border rounded-sm text-step--2 font-roboto-condensed ${
							linkCopied
								? 'border-green-600 bg-green-200 text-green-800'
								: 'border-black-100 hover:bg-black-500 hover:text-cream-100'
						}`}
					>
						{linkCopied ? 'Link copied!' : 'Copy share link'}
					</button>
					{(colorScales.length > 1 ||
						colorScales[0]?.nameEdited ||
						colorScales[0]?.color !==
							colorUtils.defaultColorForIndex(0)) && (
						<button
							onClick={resetScales}
							className='px-xs py-3xs border border-black-100 rounded-sm hover:bg-black-500 hover:text-cream-100 text-step--2 font-roboto-condensed'
						>
							Reset palette
						</button>
					)}
				</div>
			</div>

			{restoreOpen && (
				<div
					role='status'
					className='flex flex-wrap items-center gap-2xs mb-s p-xs bg-yellow-100 border border-yellow-600 rounded-lg text-step--2'
				>
					<span className='font-roboto-condensed'>
						You have a palette saved from last time. Restore it?
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

			<section className='tracking-tight container p-xs mb-xl bg-cream-50 rounded-lg border border-black-100 divide-y divide-black-50'>
				{colorScales.map((scale, index) => (
					<div
						key={scale.id}
						className='py-2xs flex flex-col sm:flex-row sm:items-stretch gap-2xs'
					>
						<div className='flex sm:flex-col gap-3xs shrink-0'>
							<ColorInput
								color={scale.color}
								name={scale.name}
								autoName={colorUtils.nameFromHex(scale.color)}
								exportSlug={
									slugs[index] !==
									colorUtils.slugify(
										scale.name ||
											colorUtils.nameFromHex(scale.color)
									)
										? slugs[index]
										: undefined
								}
								onColorChange={(newColor) =>
									handleColorChange(scale.id, newColor)
								}
								onNameChange={(newName) =>
									handleNameChange(scale.id, newName)
								}
							/>
							<div className='flex gap-3xs'>
								<button
									onClick={() =>
										copyScale(
											scale.id,
											slugs[index],
											scale.color
										)
									}
									aria-label='Copy as SVG to paste into Figma'
									title='Copy as SVG (paste into Figma)'
									className={`p-3xs border rounded-sm flex items-center justify-center ${
										copiedScaleId === scale.id
											? 'border-green-600 bg-green-200 text-green-800'
											: 'border-black-100 hover:bg-black-500 hover:text-cream-100'
									}`}
								>
									<svg
										xmlns='http://www.w3.org/2000/svg'
										viewBox='0 0 448 512'
										className='w-3.5 h-3.5 fill-current'
									>
										<path d='M208 0L332.1 0c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9L448 336c0 26.5-21.5 48-48 48l-192 0c-26.5 0-48-21.5-48-48l0-288c0-26.5 21.5-48 48-48zM48 128l80 0 0 64-64 0 0 256 192 0 0-32 64 0 0 48c0 26.5-21.5 48-48 48L48 512c-26.5 0-48-21.5-48-48L0 176c0-26.5 21.5-48 48-48z' />
									</svg>
								</button>
								{colorScales.length > 1 && (
									<>
										<button
											onClick={() => moveScale(scale.id, -1)}
											disabled={index === 0}
											aria-label='Move color up'
											title='Move up'
											className='p-3xs border border-black-100 rounded-sm hover:bg-black-500 hover:text-cream-100 text-step--2 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-current flex items-center justify-center'
										>
											<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512' className='w-3 h-3 fill-current'>
												<path d='M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2 160 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z' />
											</svg>
										</button>
										<button
											onClick={() => moveScale(scale.id, 1)}
											disabled={index === colorScales.length - 1}
											aria-label='Move color down'
											title='Move down'
											className='p-3xs border border-black-100 rounded-sm hover:bg-black-500 hover:text-cream-100 text-step--2 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-current flex items-center justify-center'
										>
											<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512' className='w-3 h-3 fill-current'>
												<path d='M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z' />
											</svg>
										</button>
										<button
											onClick={() => removeColorScale(scale.id)}
											aria-label='Remove color'
											title='Remove color'
											className='p-3xs border border-black-100 rounded-sm hover:bg-red-500 hover:text-red-50 flex items-center justify-center'
										>
											<svg
												xmlns='http://www.w3.org/2000/svg'
												viewBox='0 0 448 512'
												className='w-3 h-3 fill-current'
											>
												<path d='M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C304.4 6.8 292.3 0 279.2 0L168.8 0c-13.1 0-25.2 6.8-32.6 17.7zM32 128l384 0 0 320c0 35.3-28.7 64-64 64L96 512c-35.3 0-64-28.7-64-64L32 128zm96 64c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16z' />
											</svg>
										</button>
									</>
								)}
							</div>
						</div>
						<ShadeRamp baseColor={scale.color} />
					</div>
				))}

				<div className='mt-s flex flex-wrap gap-xs'>
					<button
						onClick={addColorScale}
						className='px-xs py-2xs bg-black-500 text-cream-100 rounded-sm hover:bg-yellow-500 hover:text-black-500 font-roboto-condensed flex items-center justify-center'
					>
						<span className='inline-block mr-2xs'>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								viewBox='0 0 448 512'
								className='w-4 h-4 fill-current'
							>
								<path d='M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z' />
							</svg>
						</span>
						Add a Color
					</button>
					<button
						onClick={() => setBulkOpen((o) => !o)}
						aria-expanded={bulkOpen}
						className='px-xs py-2xs border border-black-100 rounded-sm hover:bg-black-500 hover:text-cream-100 font-roboto-condensed text-step--2'
					>
						{bulkOpen ? 'Cancel' : 'Paste a list'}
					</button>
				</div>

				{bulkOpen && (
					<div className='mt-s flex flex-col gap-2xs'>
						<label
							htmlFor='bulk-hex'
							className='text-step--2 font-roboto-condensed'
						>
							Paste hex values (commas, spaces, or new lines)
						</label>
						<textarea
							id='bulk-hex'
							rows={3}
							value={bulkText}
							onChange={(e) => setBulkText(e.target.value)}
							placeholder='#5799DB, #E11D48, #16A34A'
							className='w-full max-w-xl px-2xs py-3xs rounded-sm border border-black-100 bg-cream-50 text-step--2 font-mono'
						/>
						<button
							onClick={addFromHexList}
							disabled={
								colorUtils.parseHexList(bulkText).length === 0
							}
							className='self-start px-xs py-2xs bg-black-500 text-cream-100 rounded-sm hover:bg-yellow-500 hover:text-black-500 font-roboto-condensed text-step--2 disabled:opacity-40'
						>
							Add{' '}
							{colorUtils.parseHexList(bulkText).length || ''}{' '}
							color
							{colorUtils.parseHexList(bulkText).length === 1
								? ''
								: 's'}
						</button>
					</div>
				)}
			</section>

			<h2 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128064; WCAG Compliant Combinations
			</h2>
			<ContrastChecker colorScales={colorScales} />
		</>
	)
}

export default App
