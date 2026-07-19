import { useCallback, useEffect, useRef, useState } from 'react'

// The shared copied!-feedback state: `trigger` flips `copied` on and schedules
// the reset; `reset` clears it early (e.g. when the copied content changes).
export const useCopied = (resetAfterMs = 2000) => {
	const [copied, setCopied] = useState(false)
	const timer = useRef<number | undefined>(undefined)

	const trigger = useCallback(() => {
		setCopied(true)
		window.clearTimeout(timer.current)
		timer.current = window.setTimeout(() => setCopied(false), resetAfterMs)
	}, [resetAfterMs])

	const reset = useCallback(() => {
		window.clearTimeout(timer.current)
		setCopied(false)
	}, [])

	useEffect(() => () => window.clearTimeout(timer.current), [])

	return { copied, trigger, reset }
}
