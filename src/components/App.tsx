import { useState, useCallback } from 'react'
import ColorInput from './ColorInput'
import ColorScale from './ColorScale'
import ScreenshotButton from './ScreenshotBtn'
import CodeBlock from './CodeBlock'
import ContrastChecker from './ContrastChecker'

const App = () => {
	const [colorScales, setColorScales] = useState([
		{ id: 1, color: '#3b82f6' },
	])
	const [nextId, setNextId] = useState(2)

	const addColorScale = useCallback(() => {
		setColorScales((prevScales) => [
			...prevScales,
			{ id: nextId, color: '#3b82f6' },
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
			prevScales.map((s) => (s.id === id ? { ...s, color: newColor } : s))
		)
	}, [])

	return (
		<>
			<h1 className='text-step-2 mb-2xs tracking-tight uppercase'>
				&#127912; Color Scale Generator
			</h1>
			<section className='tracking-tight container p-s mb-xl bg-cream-50 rounded-lg border border-black-100 divide-y divide-gray-200'>
				{colorScales.map((scale) => (
					<div
						key={scale.id}
						className='py-4 flex flex-col 2xl:flex-row justify-between gap-s'
					>
						<div
							data-html2canvas-ignore='true'
							className='flex flex-col justify-between'
						>
							<ColorInput
								initialColor={scale.color}
								onColorChange={(newColor) =>
									handleColorChange(scale.id, newColor)
								}
							/>
							{colorScales.length > 1 && (
								<button
									onClick={() => removeColorScale(scale.id)}
									className='px-s py-3xs border border-black-100 rounded-sm hover:bg-[#A51D1D] hover:text-[#FDF4F4] text-step--2 flex items-center justify-center gap-3xs max-w-36'
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
						<ColorScale baseColor={scale.color} />
					</div>
				))}

				<div
					data-html2canvas-ignore='true'
					className='flex flex-col sm:flex-row gap-m'
				>
					<button
						onClick={addColorScale}
						className='mt-s px-xs py-2xs bg-black-500 text-[#F4F5F9] rounded-sm hover:bg-yellow-500 hover:text-black-500 hover:font-bold font-roboto-condensed flex items-center justify-center'
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
					{/* <ScreenshotButton /> */}
				</div>
			</section>

			<h2 className='text-step-2 mb-2xs tracking-tight uppercase'>
				&#128064; WCAG Compliant Combinations
			</h2>
			<ContrastChecker colorScales={colorScales} />

			<h3 className='text-step-2 mb-2xs tracking-tight uppercase'>
				&#128187; Code Snippet
			</h3>
			<CodeBlock colorScales={colorScales} />
		</>
	)
}

export default App
