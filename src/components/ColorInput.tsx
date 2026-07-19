import { useEffect, useState } from 'react'

interface ColorInputProps {
	color: string
	name: string
	autoName: string
	// The export/contrast slug after de-duping, passed only when it differs
	// from this scale's own name (i.e. de-duping renamed it). Shown in the name
	// field while idle so the user sees the real exported name (e.g. `blue-2`);
	// focusing the field reveals the editable name so a rename starts fresh.
	exportSlug?: string
	onColorChange: (color: string) => void
	onNameChange: (name: string) => void
}

const ColorInput: React.FC<ColorInputProps> = ({
	color,
	name,
	autoName,
	exportSlug,
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

	// While the name field is idle and de-duping renamed this scale, show the
	// resolved export slug (e.g. `blue-2`) so it matches the exports/contrast.
	// On focus, swap to the editable name and select it so a rename starts
	// fresh rather than inheriting the derived `-2` suffix.
	const [nameFocused, setNameFocused] = useState(false)
	const showExportSlug = !nameFocused && exportSlug !== undefined

	const updateColor = (newColor: string) => {
		const formatted = newColor.toUpperCase()
		setDraft(formatted)

		if (/^#[0-9A-F]{6}$/.test(formatted)) {
			onColorChange(formatted)
		}
	}

	const inputId = `color-${autoName}`

	return (
		<div className='space-y-3xs'>
			<label htmlFor={`name-${inputId}`} className='sr-only'>
				Color name
			</label>
			<input
				type='text'
				id={`name-${inputId}`}
				className='h-8 w-36 px-2xs rounded-sm border border-black-100 bg-cream-50 text-step--2'
				placeholder={autoName}
				value={showExportSlug ? exportSlug : name}
				onFocus={(e) => {
					setNameFocused(true)
					// Select after React swaps the value to the editable name,
					// so the first keystroke replaces it (rename starts fresh).
					const el = e.target
					requestAnimationFrame(() => el.select())
				}}
				onBlur={() => setNameFocused(false)}
				onChange={(e) => onNameChange(e.target.value)}
			/>

			<div className='flex items-center gap-3xs'>
				<label htmlFor={inputId} className='sr-only'>
					Color picker
				</label>
				<div className='rounded-full overflow-hidden border border-black-100 w-8 h-8 relative shrink-0'>
					<input
						type='color'
						id={inputId}
						aria-label='Color picker'
						className='h-16 w-16 cursor-pointer absolute origin-center left-[-16px] top-[-16px]'
						value={/^#[0-9A-F]{6}$/.test(draft) ? draft : '#3B82F6'}
						onChange={(e) => updateColor(e.target.value)}
					/>
				</div>
				<input
					type='text'
					maxLength={7}
					id={`hex-${inputId}`}
					aria-label='Hex code'
					className='h-8 w-24 px-2xs rounded-sm border border-black-100 bg-cream-50 text-step--2'
					placeholder='#hex'
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
