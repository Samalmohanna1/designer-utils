import React from 'react'
import { type ColorCombination } from '../utils/colorUtils'
import ColorCombo from './ColorCombo'

interface ContrastLevelProps {
	title: string
	colorClass: string
	combinations: ColorCombination[]
}

const ContrastLevel: React.FC<ContrastLevelProps> = ({
	title,
	colorClass,
	combinations,
}) => {
	if (combinations.length === 0) return null

	return (
		<div>
			<h3 className={`text-lg font-semibold mb-3 ${colorClass}`}>
				{title} - {combinations.length} combinations
			</h3>
			<div className='space-y-2 max-h-64 overflow-y-auto'>
				{combinations.map((combo, index) => (
					<ColorCombo key={index} combo={combo} />
				))}
			</div>
		</div>
	)
}

export default ContrastLevel
