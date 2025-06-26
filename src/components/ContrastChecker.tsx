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
					// Only include if it meets at least AA Large
					const meetsAA = contrast >= 4.5
					const meetsAAA = contrast >= 7
					const meetsAALarge = contrast >= 3.1

					combinations.push({
						color1,
						color2,
						contrast: Math.round(contrast * 100) / 100,
						meetsAA,
						meetsAAA,
						meetsAALarge,
					})
				}
			}
		}

		return combinations.sort((a, b) => b.contrast - a.contrast)
	}, [colorScales])

	if (colorScales.length === 0) {
		return (
			<div className='mt-8 p-4 bg-gray-100 rounded-lg'>
				<h3 className='text-lg font-semibold mb-2'>
					WCAG Accessibility Checker
				</h3>
				<p className='text-gray-600'>
					Add some color scales to see accessibility combinations.
				</p>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			<div className='bg-white rounded-lg border overflow-hidden mt-6'>
				<div className='p-4 bg-gray-50 border-b'>
					<p className='text-sm text-gray-600 mt-1'>
						Showing all {accessibleCombinations.length} combinations
						that meet minimum accessibility standards (≥3:1)
					</p>
				</div>

				<div className='overflow-x-auto max-h-[32rem]'>
					<table className='w-full'>
						<thead className='bg-gray-50 sticky top-0 text-gray-600 text-left font-medium uppercase text-xs'>
							<tr>
								<th className='px-4 py-2'>Foreground</th>
								<th className='px-4 py-2'>Background</th>
								<th className='px-4 py-2'>Contrast</th>
								<th className='px-4 py-2'>Level</th>
								<th className='px-4 py-2'>Min Text Size</th>
								<th className='px-4 py-2'>Preview</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-gray-200'>
							{accessibleCombinations.map((combo, index) => {
								const getAccessibilityBadge = (
									combo: ColorCombination
								) => {
									if (combo.meetsAAA)
										return {
											level: 'AAA',
											class: 'text-green-700 bg-green-100',
										}
									if (combo.meetsAA)
										return {
											level: 'AA',
											class: 'text-blue-700 bg-blue-100',
										}
									if (combo.meetsAALarge)
										return {
											level: 'AA Large',
											class: 'text-yellow-700 bg-yellow-100',
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
										className='hover:bg-gray-50'
									>
										<td className='px-4 py-2'>
											<div className='flex items-center gap-2'>
												<div
													className='w-4 h-4 rounded border border-gray-300'
													style={{
														backgroundColor:
															combo.color1.hex,
													}}
												/>
												<span className='text-sm font-mono'>
													color{'-'}
													{combo.color1.scaleIndex +
														1}
													-{combo.color1.shade}
												</span>
											</div>
										</td>
										<td className='px-4 py-2'>
											<div className='flex items-center gap-2'>
												<div
													className='w-4 h-4 rounded border border-gray-300'
													style={{
														backgroundColor:
															combo.color2.hex,
													}}
												/>
												<span className='text-sm font-mono'>
													color{'-'}
													{combo.color2.scaleIndex +
														1}
													-{combo.color2.shade}
												</span>
											</div>
										</td>
										<td className='px-4 py-2 font-mono text-sm'>
											{combo.contrast}:1
										</td>
										<td className='px-4 py-2'>
											<span
												className={`px-2 py-1 rounded text-xs font-medium ${badge.class}`}
											>
												{badge.level}
											</span>
										</td>
										<td className='px-4 py-2 text-sm font-medium'>
											{minSize}
										</td>
										<td className='px-4 py-2'>
											<div
												className='px-3 py-1 rounded text-sm font-medium border text-center'
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
				<div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
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
