import { useEffect, useState } from 'react'

type CvdMode =
	| 'protanopia'
	| 'deuteranopia'
	| 'tritanopia'
	| 'achromatopsia'

const modes: { value: CvdMode; label: string; hint: string }[] = [
	{ value: 'protanopia', label: 'Protanopia', hint: 'red-weak' },
	{ value: 'deuteranopia', label: 'Deuteranopia', hint: 'green-weak' },
	{ value: 'tritanopia', label: 'Tritanopia', hint: 'blue-weak' },
	{ value: 'achromatopsia', label: 'Achromatopsia', hint: 'no color' },
]

const CvdBar = () => {
	const [active, setActive] = useState<CvdMode | null>(null)

	// Drive the page filter by toggling a class on <body>. The CSS in
	// Layout.astro applies the matching SVG filter to main + footer.
	useEffect(() => {
		const classes = modes.map((m) => `cvd-${m.value}`)
		document.body.classList.remove(...classes)
		if (active) document.body.classList.add(`cvd-${active}`)
		return () => document.body.classList.remove(...classes)
	}, [active])

	const toggle = (mode: CvdMode) =>
		setActive((cur) => (cur === mode ? null : mode))

	return (
		<div className='fixed bottom-0 inset-x-0 z-50 bg-black-500 text-cream-100 border-t border-black-400'>
			<div className='container mx-auto px-s py-2xs flex flex-wrap items-center gap-x-s gap-y-2xs'>
				<span className='flex items-center gap-2xs font-roboto-condensed uppercase tracking-tight text-step--2'>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						viewBox='0 0 576 512'
						className='w-4 h-4 fill-current shrink-0'
						aria-hidden='true'
					>
						<path d='M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4 142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64-7.1 0-13.9-1.2-20.3-3.3-5.5-1.8-11.9 1.6-11.7 7.4.3 6.9 1.3 13.8 3.2 20.7 13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1-5.8-.2-9.2 6.1-7.4 11.7 2.1 6.4 3.3 13.2 3.3 20.3z' />
					</svg>
					Simulate color blindness
				</span>

				<div className='flex flex-wrap items-center gap-2xs'>
					{modes.map(({ value, label, hint }) => {
						const isActive = active === value
						return (
							<button
								key={value}
								type='button'
								onClick={() => toggle(value)}
								aria-pressed={isActive}
								title={`${label} (${hint})`}
								className={`px-xs py-3xs rounded-sm text-step--2 font-roboto-condensed border transition-colors ${
									isActive
										? 'bg-yellow-500 text-black-500 border-yellow-500'
										: 'border-black-300 hover:bg-black-400'
								}`}
							>
								{label}
							</button>
						)
					})}
				</div>

				{active && (
					<button
						type='button'
						onClick={() => setActive(null)}
						className='ml-auto px-xs py-3xs rounded-sm text-step--2 font-roboto-condensed border border-black-300 hover:bg-black-400'
					>
						Reset to full color
					</button>
				)}
			</div>
		</div>
	)
}

export default CvdBar
