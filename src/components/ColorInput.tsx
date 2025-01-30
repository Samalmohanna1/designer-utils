import { useState } from 'react'

interface ColorInputProps {
	initialColor: string
	onColorChange: (color: string) => void
}

const ColorInput: React.FC<ColorInputProps> = ({
	initialColor,
	onColorChange,
}) => {
	const [color, setColor] = useState(initialColor.toUpperCase())

	const updateColor = (newColor: string) => {
		const formattedColor = newColor.toUpperCase()
		setColor(formattedColor)

		if (/^#[0-9A-F]{6}$/.test(formattedColor)) {
			onColorChange(formattedColor)
		}
	}

	return (
		<div className=''>
			<label htmlFor='colorInput' className='block mb-2 text-lg'>
				Enter color below:
			</label>
			<div className='flex items-center space-x-2'>
				<div className='rounded-full overflow-hidden border-2 border-slate-600 w-10 h-10 relative'>
					<input
						type='color'
						id='colorInput'
						className='h-16 w-16 cursor-pointer absolute origin-center left-[-10px] top-[-10px]'
						value={/^#[0-9A-F]{6}$/.test(color) ? color : '#3B82F6'}
						onChange={(e) => updateColor(e.target.value)}
					/>
				</div>
				<input
					type='text'
					maxLength={7}
					id='hexInput'
					className='h-10 max-w-28 px-2 rounded border-2 border-slate-600'
					placeholder='Enter hex code'
					value={color}
					onChange={(e) =>
						updateColor(
							e.target.value.startsWith('#')
								? e.target.value
								: '#' + e.target.value
						)
					}
				/>
			</div>
		</div>
	)
}

export default ColorInput
