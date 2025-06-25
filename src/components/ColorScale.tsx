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
		<div className='flex flex-wrap gap-4'>
			{shades.map((hexCode, index) => (
				<div
					key={index}
					className='flex flex-col items-center w-[110px]'
				>
					<div
						className='w-full h-20 rounded color-scale-item border border-grey-400 min-w-20'
						style={{ backgroundColor: hexCode }}
					/>
					<span className='flex justify-between px-[1px] w-full'>
						<div className='text-md text-zinc-600'>
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
