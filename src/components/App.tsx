import { useState, useCallback } from 'react'
import ColorInput from './ColorInput'
import ColorScale from './ColorScale'

const App = () => {
	const [colorScales, setColorScales] = useState([
		{ id: 1, color: '#3b82f6' },
	])

	const addColorScale = useCallback(() => {
		setColorScales((prevScales) => [
			...prevScales,
			{ id: prevScales.length + 1, color: '#3b82f6' },
		])
	}, [])

	const handleColorChange = useCallback((id: number, newColor: string) => {
		setColorScales((prevScales) =>
			prevScales.map((s) => (s.id === id ? { ...s, color: newColor } : s))
		)
	}, [])

	return (
		<div className='tracking-tight'>
			{colorScales.map((scale) => (
				<div
					key={scale.id}
					className='pb-2 mb-4 flex flex-col 2xl:flex-row gap-4 border-b-2 border-slate-300'
				>
					<ColorInput
						initialColor={scale.color}
						onColorChange={(newColor) =>
							handleColorChange(scale.id, newColor)
						}
					/>
					<ColorScale baseColor={scale.color} />
				</div>
			))}
			<button
				onClick={addColorScale}
				className='mt-4 px-4 py-2 bg-zinc-950 text-white rounded hover:bg-blue-900 font-bold flex items-center'
			>
				<span className='inline-block mr-2'>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						viewBox='0 0 448 512'
						className='w-4 h-4 fill-current'
					>
						<path d='M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z' />
					</svg>
				</span>
				Add A Color
			</button>
		</div>
	)
}

export default App
