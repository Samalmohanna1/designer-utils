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
		<div>
			<label htmlFor='colorInput' className='sr-only'>
				Enter color below:
			</label>
			<div className='flex items-center gap-2xs'>
				<div className='rounded-full overflow-hidden border border-black-100 w-10 h-10 relative'>
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
					className='h-10 max-w-24 px-2xs rounded-sm border border-black-100'
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
