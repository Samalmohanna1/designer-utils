import { useMemo, useState } from 'react'
import { colorUtils } from '../utils/colorUtils'

interface ShadeRampProps {
	baseColor: string
}

// The 10-swatch shade ramp for one base color (formerly named ColorScale,
// which collided with the ColorScale type from colorUtils).
const ShadeRamp: React.FC<ShadeRampProps> = ({ baseColor }) => {
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
		<div className='flex flex-wrap sm:flex-nowrap gap-px grow self-stretch'>
			{shades.map((hexCode, index) => {
				const isCopied = copied === hexCode
				const textColor = colorUtils.readableTextColor(hexCode)
				return (
					<button
						key={index}
						type='button'
						onClick={() => copyHex(hexCode)}
						aria-label={`Copy ${hexCode}`}
						title={`Copy ${hexCode}`}
						style={{ backgroundColor: hexCode, color: textColor }}
						className='group relative flex-1 min-w-[64px] min-h-16 rounded-sm border border-black-100/40 flex flex-col justify-between p-3xs text-step--2 leading-tight cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500 hover:ring-2 hover:ring-black-500'
					>
						<span className='font-bold text-left'>
							{colorUtils.shadeNumbers[index]}
						</span>
						<span className='hex-code text-left tabular-nums opacity-80'>
							{hexCode}
						</span>
						{isCopied && (
							<span
								className='absolute inset-0 flex items-center justify-center text-xs font-bold rounded-sm bg-black-500/80 text-cream-100'
							>
								Copied!
							</span>
						)}
					</button>
				)
			})}
		</div>
	)
}

export default ShadeRamp
