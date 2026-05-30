import { useState, useCallback, useEffect, useRef } from 'react'
import { colorUtils, type ColorScale } from '../utils/colorUtils'
import ColorInput from './ColorInput'
import ColorScale2 from './ColorScale'
import CodeBlock from './CodeBlock'
import ContrastChecker from './ContrastChecker'

interface ScaleState extends ColorScale {
	// True once the user types a name, which stops auto-naming from the hue.
	nameEdited: boolean
}

export type VisionType =
	| 'normal'
	| 'protanopia'
	| 'deuteranopia'
	| 'tritanopia'

const visionOptions: { value: VisionType; label: string }[] = [
	{ value: 'normal', label: 'Normal vision' },
	{ value: 'protanopia', label: 'Protanopia (red-blind)' },
	{ value: 'deuteranopia', label: 'Deuteranopia (green-blind)' },
	{ value: 'tritanopia', label: 'Tritanopia (blue-blind)' },
]

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

// Build ScaleState rows from decoded {name, color} entries. A shared name is
// treated as authored (nameEdited), so it isn't overwritten by hue auto-naming.
const scalesFromEntries = (
	entries: { name: string; color: string }[]
): ScaleState[] =>
	entries.map((entry, i) => ({
		id: i + 1,
		color: entry.color,
		name: entry.name,
		nameEdited: true,
	}))

// Reads a palette from the URL hash, if present and valid. Client-only.
const readHashPalette = (): ScaleState[] | null => {
	if (typeof window === 'undefined') return null
	const hash = window.location.hash
	if (!hash.startsWith(HASH_PREFIX)) return null
	const encoded = decodeURIComponent(hash.slice(HASH_PREFIX.length))
	const entries = colorUtils.decodePalette(encoded)
	return entries.length > 0 ? scalesFromEntries(entries) : null
}

const App = () => {
	const [colorScales, setColorScales] = useState<ScaleState[]>(defaultScales)
	const [nextId, setNextId] = useState(2)
	// Becomes true after the initial URL read, so the sync effect doesn't
	// clobber the hash before we've had a chance to load from it.
	const hydrated = useRef(false)

	// On mount: a palette in the URL wins; otherwise keep the default.
	// (Autosave is written below but intentionally not auto-restored.)
	useEffect(() => {
		const fromHash = readHashPalette()
		if (fromHash) {
			setColorScales(fromHash)
			setNextId(fromHash.length + 1)
		}
		hydrated.current = true
	}, [])

	// Live-sync to the URL hash (replaceState, so edits don't spam history)
	// and autosave to localStorage. Runs only after the initial load.
	useEffect(() => {
		if (!hydrated.current) return
		const encoded = colorUtils.encodePalette(colorScales)
		const url = `${window.location.pathname}${window.location.search}${HASH_PREFIX}${encoded}`
		window.history.replaceState(null, '', url)
		try {
			window.localStorage.setItem(STORAGE_KEY, encoded)
		} catch {
			// localStorage may be unavailable (private mode); ignore.
		}
	}, [colorScales])

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
							// Keep the name in sync with the hue until the
							// user takes ownership of it.
							name: s.nameEdited
								? s.name
								: colorUtils.nameFromHex(newColor),
					  }
					: s
			)
		)
	}, [])

	const handleNameChange = useCallback((id: number, newName: string) => {
		setColorScales((prevScales) =>
			prevScales.map((s) =>
				s.id === id ? { ...s, name: newName, nameEdited: true } : s
			)
		)
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

	const [visionType, setVisionType] = useState<VisionType>('normal')

	return (
		<>
			<div className='flex flex-wrap items-center justify-between gap-2xs mb-2xs'>
				<h1 className='text-step-1 sm:text-step-2 tracking-tight uppercase'>
					&#127912; Color Scale Generator
				</h1>
				<div className='flex items-center gap-2xs'>
					<button
						onClick={copyShareLink}
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
			<div className='flex flex-wrap items-center gap-2xs mb-2xs'>
				<label
					htmlFor='vision-type'
					className='text-step--2 font-roboto-condensed uppercase tracking-tight'
				>
					Preview as
				</label>
				<select
					id='vision-type'
					value={visionType}
					onChange={(e) =>
						setVisionType(e.target.value as VisionType)
					}
					className='px-xs py-2xs border border-black-100 rounded-sm bg-cream-50 text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
				>
					{visionOptions.map(({ value, label }) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
				{visionType !== 'normal' && (
					<span className='text-step--2 text-black-300'>
						simulating color vision deficiency — swatches show
						simulated color; copy still uses the true hex
					</span>
				)}
			</div>
			<section className='tracking-tight container p-s mb-xl bg-cream-50 rounded-lg border border-black-100 divide-y divide-gray-200'>
				{colorScales.map((scale) => (
					<div
						key={scale.id}
						className='py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-s'
					>
						<div className='flex sm:flex-col gap-xs'>
							<ColorInput
								color={scale.color}
								name={scale.name}
								autoName={colorUtils.nameFromHex(scale.color)}
								onColorChange={(newColor) =>
									handleColorChange(scale.id, newColor)
								}
								onNameChange={(newName) =>
									handleNameChange(scale.id, newName)
								}
							/>
							{colorScales.length > 1 && (
								<button
									onClick={() => removeColorScale(scale.id)}
									className='px-s py-3xs border border-black-100 rounded-sm hover:bg-[#A51D1D] hover:text-[#FDF4F4] text-step--2 font-roboto-condensed flex items-center justify-center gap-3xs max-w-36'
								>
									<svg
										xmlns='http://www.w3.org/2000/svg'
										viewBox='0 0 448 512'
										className='w-3 h-3 fill-current'
									>
										<path d='M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C304.4 6.8 292.3 0 279.2 0L168.8 0c-13.1 0-25.2 6.8-32.6 17.7zM32 128l384 0 0 320c0 35.3-28.7 64-64 64L96 512c-35.3 0-64-28.7-64-64L32 128zm96 64c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16l0 224c0 8.8 7.2 16 16 16s16-7.2 16-16l0-224c0-8.8-7.2-16-16-16z' />
									</svg>
									Remove
								</button>
							)}
						</div>
						<ColorScale2
							baseColor={scale.color}
							visionType={visionType}
						/>
					</div>
				))}

				<button
					onClick={addColorScale}
					className='mt-s px-xs py-2xs bg-black-500 text-[#F4F5F9] rounded-sm hover:bg-yellow-500 hover:text-black-500 font-roboto-condensed flex items-center justify-center'
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
			</section>

			<h2 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128064; WCAG Compliant Combinations
			</h2>
			<ContrastChecker colorScales={colorScales} />

			<h3 className='text-step-1 sm:text-step-2 mb-2xs tracking-tight uppercase'>
				&#128187; Code Snippet
			</h3>
			<CodeBlock colorScales={colorScales} />
		</>
	)
}

export default App
