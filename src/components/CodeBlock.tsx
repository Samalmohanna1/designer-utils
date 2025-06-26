import { useMemo } from 'react'
import { colorUtils, type ColorScale } from '../utils/colorUtils'

interface CodeBlockProps {
	colorScales: ColorScale[]
}

const CodeBlock: React.FC<CodeBlockProps> = ({ colorScales }) => {
	const tailwindCode = useMemo(() => {
		const seenColors = new Set<string>()
		return colorScales
			.map((scale, index) => {
				const shades = colorUtils.generateShades(scale.color)
				const uniqueShades = shades
					.map((shade, i) => ({
						shade: colorUtils.shadeNumbers[i],
						hsl: colorUtils.hexToHSL(shade),
					}))
					.filter(({ hsl }) => {
						if (seenColors.has(hsl)) {
							return false
						}
						seenColors.add(hsl)
						return true
					})
				if (uniqueShades.length === 0) {
					return null
				}
				return `  color${index + 1}: {\n${uniqueShades
					.map(({ shade, hsl }) => `    ${shade}: "${hsl}"`)
					.join(',\n')}\n  }`
			})
			.filter(Boolean) // Remove null entries
			.join(',\n')
	}, [colorScales])

	const fullTailwindConfig = useMemo(() => {
		return `colors: {
${tailwindCode}
}`
	}, [tailwindCode])

	const copyToClipboard = () => {
		navigator.clipboard.writeText(fullTailwindConfig)
	}

	return (
		<div className='relative mt-4 p-8 rounded-md font-mono bg-zinc-900  text-white/80'>
			<button
				onClick={copyToClipboard}
				className='absolute top-6 right-6 bg-gray-200 text-black px-4 py-2 rounded text-sm'
			>
				Copy Code Snippet
			</button>
			<pre>
				<code className='text-sm sm:text-lg'>{fullTailwindConfig}</code>
			</pre>
		</div>
	)
}

export default CodeBlock
