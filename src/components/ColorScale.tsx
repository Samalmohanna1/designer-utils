import { useMemo } from 'react'
import { colorUtils } from '../utils/colorUtils'

interface ColorScaleProps {
	baseColor: string
}

const ColorScale: React.FC<ColorScaleProps> = ({ baseColor }) => {
	const shades = useMemo(() => {
		return colorUtils.generateShades(baseColor)
	}, [baseColor])

	return (
		<div className='flex flex-wrap gap-xs'>
			{shades.map((hexCode, index) => (
				<div
					key={index}
					className='flex flex-col items-center w-[110px]'
				>
					<div
						className='w-full h-16 rounded-sm color-scale-item border border-black-100 min-w-12'
						style={{ backgroundColor: hexCode }}
					/>
					<span className='flex justify-between px-px w-full'>
						<div className='text-md'>
							{colorUtils.shadeNumbers[index]}
						</div>
						<div className='text-lg hex-code'>{hexCode}</div>
					</span>
				</div>
			))}
		</div>
	)
}

export default ColorScale
