import { type ColorCombination } from '../utils/colorUtils'

const ColorCombo: React.FC<{ combo: ColorCombination }> = ({ combo }) => {
	return (
		<div className='flex items-center gap-4 p-3 border rounded-lg bg-gray-50 border-yellow-400'>
			<div className='flex flex-col gap-2'>
				<span className='flex justify-between'>
					<div
						className='w-10 h-10 rounded border border-gray-300'
						style={{ backgroundColor: combo.color1.hex }}
						title={combo.color1.hex}
					/>
					<div
						className='w-10 h-10 rounded border border-gray-300'
						style={{ backgroundColor: combo.color2.hex }}
						title={combo.color2.hex}
					/>
				</span>
				<div
					className='px-2 py-1 text-xs rounded text-white'
					style={{
						backgroundColor: combo.color1.hex,
						color: combo.color2.hex,
					}}
				>
					Sample Text
				</div>
			</div>
			<div className='text-md'>
				<div className='font-mono'>
					{combo.color1.hex} ({combo.color1.shade}) +{' '}
					{combo.color2.hex} ({combo.color2.shade})
				</div>
				<div className='text-gray-700'>
					Contrast: {combo.contrast}:1
				</div>
			</div>
		</div>
	)
}

export default ColorCombo
