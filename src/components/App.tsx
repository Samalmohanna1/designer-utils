import { useState, useCallback } from 'react'
import { colorUtils, type ColorScale } from '../utils/colorUtils'
import ColorInput from './ColorInput'
import ColorScale2 from './ColorScale'
import CodeBlock from './CodeBlock'
import ContrastChecker from './ContrastChecker'

interface ScaleState extends ColorScale {
	// True once the user types a name, which stops auto-naming from the hue.
	nameEdited: boolean
}

const makeScale = (id: number, index: number): ScaleState => {
	const color = colorUtils.defaultColorForIndex(index)
	return {
		id,
		color,
		name: colorUtils.nameFromHex(color),
		nameEdited: false,
	}
}

const App = () => {
	const [colorScales, setColorScales] = useState<ScaleState[]>([
		makeScale(1, 0),
	])
	const [nextId, setNextId] = useState(2)

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
		setColorScales([makeScale(1, 0)])
		setNextId(2)
	}, [])

	return (
		<>
			<div className='flex flex-wrap items-center justify-between gap-2xs mb-2xs'>
				<h1 className='text-step-1 sm:text-step-2 tracking-tight uppercase'>
					&#127912; Color Scale Generator
				</h1>
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
			<section className='tracking-tight container p-s mb-xl bg-cream-50 rounded-lg border border-black-100 divide-y divide-gray-200'>
				{colorScales.map((scale) => (
					<div
						key={scale.id}
						className='py-4 flex flex-col sm:flex-row justify-between gap-s'
					>
						<div className='flex sm:flex-col gap-xs'>
							<ColorInput
								initialColor={scale.color}
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
						<ColorScale2 baseColor={scale.color} />
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
