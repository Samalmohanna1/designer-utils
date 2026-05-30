import { useEffect, useState } from 'react'

interface ColorInputProps {
	color: string
	name: string
	autoName: string
	onColorChange: (color: string) => void
	onNameChange: (name: string) => void
}

const ColorInput: React.FC<ColorInputProps> = ({
	color,
	name,
	autoName,
	onColorChange,
	onNameChange,
}) => {
	// Draft text for the hex field so the user can type an in-progress,
	// not-yet-valid value. Resyncs whenever the committed color changes
	// from outside (color picker, reset).
	const [draft, setDraft] = useState(color.toUpperCase())

	useEffect(() => {
		setDraft(color.toUpperCase())
	}, [color])

	const updateColor = (newColor: string) => {
		const formatted = newColor.toUpperCase()
		setDraft(formatted)

		if (/^#[0-9A-F]{6}$/.test(formatted)) {
			onColorChange(formatted)
		}
	}

	const inputId = `color-${autoName}`

	return (
		<div className='space-y-2xs'>
			<div className='flex items-center gap-2xs'>
				<label
					htmlFor={`name-${inputId}`}
					className='text-step--2 font-roboto-condensed shrink-0'
				>
					Name
				</label>
				<input
					type='text'
					id={`name-${inputId}`}
					className='h-10 w-full max-w-36 px-2xs rounded-sm border border-black-100 text-step--2'
					placeholder={autoName}
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
				/>
			</div>

			<label htmlFor={inputId} className='sr-only'>
				Color hex value
			</label>
			<div className='flex items-center gap-2xs'>
				<div className='rounded-full overflow-hidden border border-black-100 w-10 h-10 relative shrink-0'>
					<input
						type='color'
						id={inputId}
						aria-label='Color picker'
						className='h-16 w-16 cursor-pointer absolute origin-center left-[-10px] top-[-10px]'
						value={/^#[0-9A-F]{6}$/.test(draft) ? draft : '#3B82F6'}
						onChange={(e) => updateColor(e.target.value)}
					/>
				</div>
				<input
					type='text'
					maxLength={7}
					id={`hex-${inputId}`}
					aria-label='Hex code'
					className='h-10 max-w-24 px-2xs rounded-sm border border-black-100'
					placeholder='Enter hex code'
					value={draft}
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
