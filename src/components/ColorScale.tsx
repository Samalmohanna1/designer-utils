import { useMemo, useState } from 'react'
import { colorUtils } from '../utils/colorUtils'

interface ColorScaleProps {
	baseColor: string
}

const ColorScale: React.FC<ColorScaleProps> = ({ baseColor }) => {
	const shades = useMemo(() => {
		return colorUtils.generateShades(baseColor)
	}, [baseColor])

	const [copied, setCopied] = useState<string | null>(null)

	const copyHex = (hex: string) => {
		navigator.clipboard.writeText(hex)
		setCopied(hex)
		setTimeout(() => setCopied(null), 1200)
	}

	return (
		<div className='flex flex-wrap gap-2xs'>
			{shades.map((hexCode, index) => {
				const isCopied = copied === hexCode
				return (
					<button
						key={index}
						type='button'
						onClick={() => copyHex(hexCode)}
						aria-label={`Copy ${hexCode}`}
						title={`Copy ${hexCode}`}
						className='flex flex-col items-center w-[110px] group cursor-pointer focus:outline-hidden'
					>
						<div
							className='relative w-full h-16 rounded-sm color-scale-item border border-black-100 min-w-12 group-hover:ring-2 group-hover:ring-black-500 group-focus:ring-2 group-focus:ring-blue-500'
							style={{ backgroundColor: hexCode }}
						>
							<span
								className={`absolute inset-0 flex items-center justify-center text-xs font-bold rounded-sm transition-opacity ${
									isCopied
										? 'opacity-100 bg-black-500/80 text-cream-100'
										: 'opacity-0'
								}`}
							>
								Copied!
							</span>
						</div>
						<span className='flex justify-between px-px w-full'>
							<span>{colorUtils.shadeNumbers[index]}</span>
							<span className='hex-code'>{hexCode}</span>
						</span>
					</button>
				)
			})}
		</div>
	)
}

export default ColorScale
