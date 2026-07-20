// A labeled number input wired to one config field, shared by every section.
// Empty/NaN keeps the last valid value so the field stays editable mid-typing.
const Field: React.FC<{
	id: string
	label: string
	unit?: string
	value: number
	min?: number
	max?: number
	step?: number
	onChange: (v: number) => void
}> = ({ id, label, unit, value, min, max, step, onChange }) => (
	<div className='space-y-3xs'>
		<label
			htmlFor={id}
			className='block text-step--2 font-roboto-condensed font-bold'
		>
			{label}
		</label>
		<div className='flex items-center gap-3xs rounded-sm border border-black-100 bg-cream-50 px-2xs focus-within:ring-2 focus-within:ring-blue-500'>
			<input
				id={id}
				type='number'
				inputMode='decimal'
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => {
					const v = parseFloat(e.target.value)
					if (!Number.isNaN(v)) onChange(v)
				}}
				className='h-9 w-full bg-transparent text-step--1 tabular-nums focus:outline-hidden'
			/>
			{unit && <span className='text-step--2 text-black-300'>{unit}</span>}
		</div>
	</div>
)

export default Field
