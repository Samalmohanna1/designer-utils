import { useEffect, useRef, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-json'
import { downloadText } from '../utils/download'
import { useCopied } from '../hooks/useCopied'

export interface FormatOption {
	value: string
	label: string
}

interface ExportBlockProps {
	// Unique per page — the format select's id (label htmlFor points at it).
	id: string
	formats: FormatOption[]
	format: string
	onFormatChange: (value: string) => void
	code: string
	language: 'css' | 'markdown' | 'json'
	// Download filename, e.g. `type-scale-css.txt`.
	filename: string
	// When set, shows the optional variable-prefix field; called with the
	// sanitized (slug-safe) prefix on every change.
	onPrefixChange?: (sanitized: string) => void
	// Extra selectors rendered beside Format (e.g. the color tool's
	// color-format select).
	children?: React.ReactNode
}

// Export-safe form of whatever the user types into the prefix field.
const sanitizePrefix = (raw: string): string =>
	raw
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '')

// The shared export panel: format selector(s), Prism-highlighted snippet, and
// the Copy Code / Download .txt pair. Used by every tool so the export UX
// stays identical across the suite.
const ExportBlock: React.FC<ExportBlockProps> = ({
	id,
	formats,
	format,
	onFormatChange,
	code,
	language,
	filename,
	onPrefixChange,
	children,
}) => {
	// Server HTML has no Prism markup; gate the language class until the
	// island hydrates so the first client render matches the server.
	const [isClient, setIsClient] = useState(false)
	useEffect(() => setIsClient(true), [])

	const codeRef = useRef<HTMLElement>(null)
	useEffect(() => {
		// Scoped to this block — highlightAll() would re-highlight the page.
		if (isClient && codeRef.current) Prism.highlightElement(codeRef.current)
	}, [code, language, isClient])

	const { copied, trigger, reset } = useCopied()
	useEffect(() => reset(), [code, reset])

	const copy = () => {
		navigator.clipboard.writeText(code)
		trigger()
	}

	return (
		<div className='border border-black-100 bg-cream-50 rounded-lg overflow-hidden'>
			<div className='p-xs space-y-s'>
				<div className='flex gap-s flex-wrap'>
					<div className='space-y-3xs'>
						<label
							htmlFor={id}
							className='block text-step--2 font-roboto-condensed'
						>
							Format
						</label>
						<select
							id={id}
							value={format}
							onChange={(e) => onFormatChange(e.target.value)}
							className='px-xs py-2xs border border-black-100 rounded-sm bg-cream-50 text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
						>
							{formats.map((f) => (
								<option key={f.value} value={f.value}>
									{f.label}
								</option>
							))}
						</select>
					</div>

					{children}

					{onPrefixChange && (
						<div className='space-y-3xs'>
							<label
								htmlFor={`${id}-prefix`}
								className='block text-step--2 font-roboto-condensed'
							>
								Variable prefix{' '}
								<span className='text-black-300'>(optional)</span>
							</label>
							<input
								id={`${id}-prefix`}
								type='text'
								placeholder='e.g. brand'
								onChange={(e) =>
									onPrefixChange(sanitizePrefix(e.target.value))
								}
								className='h-9 px-xs border border-black-100 rounded-sm bg-cream-50 text-step--2 focus:outline-hidden focus:ring-2 focus:ring-blue-500'
							/>
						</div>
					)}
				</div>
			</div>
			<div className='relative bg-code-bg text-cream-100'>
				<div className='absolute top-6 right-6 z-10 flex flex-wrap justify-end gap-2xs'>
					<button
						onClick={copy}
						aria-live='polite'
						className={`px-xs py-2xs rounded-sm font-roboto-condensed font-bold ${
							copied
								? 'bg-green-200 text-green-800'
								: 'bg-cream-200 text-black-400 hover:bg-yellow-500 hover:text-black-500'
						}`}
					>
						{copied ? 'Code Copied!' : 'Copy Code'}
					</button>
					<button
						onClick={() => downloadText(filename, code)}
						className='px-xs py-2xs rounded-sm font-roboto-condensed font-bold bg-cream-200 text-black-400 hover:bg-yellow-500 hover:text-black-500'
					>
						Download .txt
					</button>
				</div>
				<pre className='p-s max-h-128 overflow-auto'>
					<code
						ref={codeRef}
						className={`text-sm sm:text-lg ${
							isClient ? `language-${language}` : ''
						}`}
					>
						{code}
					</code>
				</pre>
			</div>
		</div>
	)
}

export default ExportBlock
