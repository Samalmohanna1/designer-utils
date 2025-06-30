import { useMemo } from 'react'
import {
	type ColorScale,
	type ColorInfo,
	colorUtils,
	type ColorCombination,
} from '../utils/colorUtils'

interface ContrastCheckerProps {
	colorScales: ColorScale[]
}

const ContrastChecker: React.FC<ContrastCheckerProps> = ({ colorScales }) => {
	const accessibleCombinations = useMemo(() => {
		const allColors: ColorInfo[] = []
		const seenHexColors = new Set<string>()

		colorScales.forEach((scale, scaleIndex) => {
			const shades = colorUtils.generateShades(scale.color)
			shades.forEach((hex, shadeIndex) => {
				if (!seenHexColors.has(hex.toLowerCase())) {
					seenHexColors.add(hex.toLowerCase())
					allColors.push({
						hex,
						shade: colorUtils.shadeNumbers[shadeIndex],
						scaleId: scale.id,
						scaleIndex: scaleIndex,
					})
				}
			})
		})

		const combinations: ColorCombination[] = []
		for (let i = 0; i < allColors.length; i++) {
			for (let j = i + 1; j < allColors.length; j++) {
				const color1 = allColors[i]
				const color2 = allColors[j]
				const contrast = colorUtils.getContrastRatio(
					color1.hex,
					color2.hex
				)

				if (contrast >= 3.1) {
					const meetsAA = contrast >= 4.5
					const meetsAAA = contrast >= 7
					const meetsAALarge = contrast >= 3.1

					combinations.push({
						color1,
						color2,
						contrast: Math.round(contrast * 10) / 10,
						meetsAA,
						meetsAAA,
						meetsAALarge,
					})
				}
			}
		}

		return combinations.sort((a, b) => b.contrast - a.contrast)
	}, [colorScales])

	return (
		<div className='space-y-s mb-xl'>
			<div className='bg-cream-50 rounded-lg border  border-black-100 overflow-hidden mt-s'>
				<div className='p-xs bg-cream-200 border-b border-black-100'>
					<p className='text-step--2'>
						Showing all {accessibleCombinations.length} combinations
						that meet minimum accessibility standards (≥3:1)
					</p>
				</div>

				<div className='overflow-x-auto max-h-128' tabIndex={0}>
					<table className='w-full'>
						<thead className='bg-cream-200 sticky top-0 text-left uppercase text-xs'>
							<tr>
								<th className='px-xs py-2xs'>Foreground</th>
								<th className='px-xs py-2xs'>Background</th>
								<th className='px-xs py-2xs'>Contrast</th>
								<th className='px-xs py-2xs'>Level</th>
								<th className='px-xs py-2xs'>Min Text Size</th>
								<th className='px-xs py-2xs'>Preview</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-black-100'>
							{accessibleCombinations.map((combo, index) => {
								const getAccessibilityBadge = (
									combo: ColorCombination
								) => {
									if (combo.meetsAAA)
										return {
											level: 'AAA',
											class: 'text-black-400 bg-green-200',
										}
									if (combo.meetsAA)
										return {
											level: 'AA',
											class: 'text-black-400 bg-blue-100',
										}
									if (combo.meetsAALarge)
										return {
											level: 'AA Large',
											class: 'text-black-400 bg-yellow-200',
										}
									return {
										level: 'Fail',
										class: 'text-red-700 bg-red-100',
									}
								}

								const getMinTextSize = (
									combo: ColorCombination
								) => {
									if (combo.meetsAAA) return 'Any size'
									if (combo.meetsAA) return '16px / 12pt'
									if (combo.meetsAALarge) return '18px / 14pt'
									return 'N/A'
								}

								const badge = getAccessibilityBadge(combo)
								const minSize = getMinTextSize(combo)

								return (
									<tr
										key={index}
										className='hover:bg-cream-100'
									>
										<td className='px-xs py-2xs'>
											<div className='flex items-center gap-2'>
												<div
													className='w-4 h-4 rounded-sm border border-gray-300'
													style={{
														backgroundColor:
															combo.color1.hex,
													}}
												/>
												<span className='text-sm'>
													color
													{combo.color1.scaleIndex +
														1}
													-{combo.color1.shade}
												</span>
											</div>
										</td>
										<td className='px-xs py-2xs'>
											<div className='flex items-center gap-2'>
												<div
													className='w-4 h-4 rounded-sm border border-gray-300'
													style={{
														backgroundColor:
															combo.color2.hex,
													}}
												/>
												<span className='text-sm'>
													color
													{combo.color2.scaleIndex +
														1}
													-{combo.color2.shade}
												</span>
											</div>
										</td>
										<td className='px-xs py-2xs text-sm'>
											{combo.contrast}:1
										</td>
										<td className='px-xs py-2xs'>
											<span
												className={`px-2xs py-3xs rounded-sm text-xs ${badge.class}`}
											>
												{badge.level}
											</span>
										</td>
										<td className='px-xs py-2xs text-sm'>
											{minSize}
										</td>
										<td className='px-xs py-2xs'>
											<div
												className='px-3 py-1 rounded-sm text-sm border text-center'
												style={{
													backgroundColor:
														combo.color2.hex,
													color: combo.color1.hex,
												}}
											>
												Sample Text
											</div>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</div>

			{accessibleCombinations.length === 0 && (
				<div className='p-s bg-red-50 border border-red-200 rounded-lg'>
					<p className='text-red-700'>
						No accessible color combinations found. Try adding more
						contrasting colors or additional color scales.
					</p>
				</div>
			)}
		</div>
	)
}

export default ContrastChecker
