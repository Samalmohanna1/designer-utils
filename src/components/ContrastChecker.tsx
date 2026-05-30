import { useMemo, useState, useEffect } from 'react'
import {
	type ColorScale,
	type ColorInfo,
	colorUtils,
} from '../utils/colorUtils'

interface ContrastCheckerProps {
	colorScales: ColorScale[]
}

type Tier = 'AAA' | 'AA' | 'AA Large'

interface Match {
	foreground: ColorInfo
	contrast: number
	tier: Tier
}

const tierInfo: Record<
	Tier,
	{ badge: string; minSize: string; sampleClass: string; note: string }
> = {
	AAA: {
		badge: 'text-black-400 bg-green-200',
		minSize: 'Any size',
		sampleClass: 'text-base',
		note: 'Passes at any text size.',
	},
	AA: {
		badge: 'text-black-400 bg-blue-100',
		minSize: '16px / 12pt normal',
		sampleClass: 'text-base',
		note: 'Use at 16px or larger for body text.',
	},
	'AA Large': {
		badge: 'text-black-400 bg-yellow-200',
		minSize: '18.66px bold or 24px',
		sampleClass: 'text-2xl font-bold',
		note: 'Large text only — 24px, or 18.66px bold.',
	},
}

const colorLabel = (c: ColorInfo) => `color${c.scaleIndex + 1}-${c.shade}`

const ContrastChecker: React.FC<ContrastCheckerProps> = ({ colorScales }) => {
	const uniqueColors = useMemo(() => {
		const colors: ColorInfo[] = []
		const seen = new Set<string>()

		colorScales.forEach((scale, scaleIndex) => {
			colorUtils.generateShades(scale.color).forEach((hex, shadeIndex) => {
				const key = hex.toLowerCase()
				if (!seen.has(key)) {
					seen.add(key)
					colors.push({
						hex,
						shade: colorUtils.shadeNumbers[shadeIndex],
						scaleId: scale.id,
						scaleIndex,
					})
				}
			})
		})

		return colors
	}, [colorScales])

	const [bgHex, setBgHex] = useState<string | null>(null)

	const background = useMemo(
		() =>
			uniqueColors.find((c) => c.hex === bgHex) ??
			[...uniqueColors].sort((a, b) => b.shade - a.shade)[0] ??
			null,
		[uniqueColors, bgHex]
	)

	useEffect(() => {
		if (background && background.hex !== bgHex) {
			setBgHex(background.hex)
		}
	}, [background, bgHex])

	const matches = useMemo(() => {
		if (!background) return [] as Match[]

		return uniqueColors
			.filter((fg) => fg.hex !== background.hex)
			.map((fg): Match | null => {
				const ratio = colorUtils.getContrastRatio(
					fg.hex,
					background.hex
				)
				if (ratio < 3.1) return null
				const tier: Tier =
					ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'AA Large'
				return {
					foreground: fg,
					contrast: Math.round(ratio * 10) / 10,
					tier,
				}
			})
			.filter((m): m is Match => m !== null)
			.sort((a, b) => b.contrast - a.contrast)
	}, [uniqueColors, background])

	const grouped = useMemo(() => {
		const groups: Record<Tier, Match[]> = {
			AAA: [],
			AA: [],
			'AA Large': [],
		}
		matches.forEach((m) => groups[m.tier].push(m))
		return groups
	}, [matches])

	if (!background) return null

	return (
		<div className='space-y-s mb-xl'>
			<div className='bg-cream-50 rounded-lg border border-black-100 overflow-hidden mt-s'>
				<div
					className='p-xs bg-cream-200 border-b border-black-100'
					role='group'
					aria-label='Choose a background color'
				>
					<p className='text-step--2 mb-2xs font-roboto-condensed uppercase tracking-tight'>
						Pick a background color
					</p>
					<div className='flex flex-wrap gap-3xs'>
						{uniqueColors.map((c) => {
							const isSelected = c.hex === background.hex
							return (
								<button
									key={c.hex}
									type='button'
									onClick={() => setBgHex(c.hex)}
									aria-pressed={isSelected}
									aria-label={`${colorLabel(c)}, ${c.hex}`}
									title={`${colorLabel(c)} · ${c.hex}`}
									className={`w-7 h-7 rounded-sm border transition-transform hover:scale-110 focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
										isSelected
											? 'border-black-500 ring-2 ring-black-500 scale-110'
											: 'border-black-100'
									}`}
									style={{ backgroundColor: c.hex }}
								/>
							)
						})}
					</div>
				</div>

				<div className='p-xs flex flex-wrap items-center gap-2xs border-b border-black-100'>
					<span className='text-step--2'>
						Showing text colors that are legible on
					</span>
					<span className='inline-flex items-center gap-3xs px-2xs py-3xs rounded-sm border border-black-100 bg-cream-100 text-step--2'>
						<span
							className='w-4 h-4 rounded-xs border border-black-100'
							style={{ backgroundColor: background.hex }}
						/>
						<span className='font-bold'>
							{colorLabel(background)}
						</span>
						<span className='text-black-300'>{background.hex}</span>
					</span>
					<span className='text-step--2 text-black-300'>
						· {matches.length} pass (≥3:1)
					</span>
				</div>

				{matches.length === 0 ? (
					<div className='p-s'>
						<p className='text-red-700 text-step--2'>
							No shades are legible on this background. Try a
							lighter or darker background, or add a more
							contrasting color scale.
						</p>
					</div>
				) : (
					<div className='p-xs space-y-s max-h-128 overflow-y-auto' tabIndex={0}>
						{(['AAA', 'AA', 'AA Large'] as Tier[]).map((tier) => {
							const items = grouped[tier]
							if (items.length === 0) return null
							const info = tierInfo[tier]
							return (
								<section key={tier} aria-label={`${tier} combinations`}>
									<div className='flex flex-wrap items-baseline gap-2xs mb-2xs'>
										<span
											className={`px-2xs py-3xs rounded-sm text-xs font-bold ${info.badge}`}
										>
											{tier}
										</span>
										<span className='text-step--2 text-black-300'>
											{items.length} · {info.note}
										</span>
									</div>
									<ul className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2xs'>
										{items.map((m) => (
											<li
												key={m.foreground.hex}
												className='rounded-sm border border-black-100 overflow-hidden'
											>
												<div
													className='px-xs py-2xs'
													style={{
														backgroundColor:
															background.hex,
														color: m.foreground.hex,
													}}
												>
													<span
														className={info.sampleClass}
													>
														The quick brown fox
													</span>
												</div>
												<div className='flex items-center justify-between gap-2xs px-xs py-3xs bg-cream-100 text-step--2'>
													<span className='flex items-center gap-3xs'>
														<span
															className='w-3 h-3 rounded-xs border border-black-100'
															style={{
																backgroundColor:
																	m.foreground
																		.hex,
															}}
														/>
														{colorLabel(
															m.foreground
														)}
													</span>
													<span className='font-bold tabular-nums'>
														{m.contrast}:1
													</span>
												</div>
											</li>
										))}
									</ul>
								</section>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}

export default ContrastChecker
