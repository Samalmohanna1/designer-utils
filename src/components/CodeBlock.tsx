import { useEffect, useMemo, useState } from 'react'
import { colorUtils, type ColorScale } from '../utils/colorUtils'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-css'

interface CodeBlockProps {
	colorScales: ColorScale[]
}

const CodeBlock: React.FC<CodeBlockProps> = ({ colorScales }) => {
	const [isCopied, setIsCopied] = useState(false)
	const [isClient, setIsClient] = useState(false)

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

	useEffect(() => {
		setIsClient(true)
	}, [])

	useEffect(() => {
		if (isClient) {
			Prism.highlightAll()
		}
	}, [fullTailwindConfig, isClient])

	useEffect(() => {
		setIsCopied(false)
	}, [fullTailwindConfig])

	const copyToClipboard = () => {
		navigator.clipboard.writeText(fullTailwindConfig)
		setIsCopied(true)
		setTimeout(() => {
			setIsCopied(false)
		}, 2000)
	}

	return (
		<div className='relative mt-4 p-8 rounded-md font-mono bg-[#2d2d2d] text-white'>
			<button
				onClick={copyToClipboard}
				className={`absolute top-6 right-6 px-4 py-2 rounded text-sm font-bold transition-colors ${
					isCopied
						? 'bg-[#DCFCE7] text-[#0D5026]'
						: 'bg-gray-200 text-black hover:bg-gray-300'
				}`}
			>
				{isCopied ? 'Code Copied!' : 'Copy Code'}
			</button>
			<pre>
				<code
					className={`text-sm sm:text-lg ${
						isClient ? 'language-css' : ''
					}`}
				>
					{fullTailwindConfig}
				</code>
			</pre>
		</div>
	)
}

export default CodeBlock
