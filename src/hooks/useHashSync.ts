import { useEffect, useRef } from 'react'

// The shared URL-hash persistence pattern used by every tool: read the hash
// once on mount (a valid hash wins over the default), then live-sync state
// back to the hash via replaceState so edits don't spam history. A `hydrated`
// ref gates the sync so it can't overwrite the hash before the initial read.
// With `storageKey` the encoded value is also autosaved to localStorage
// (write-only here — restoring is the caller's decision).
export function useHashSync<T>(options: {
	prefix: string // e.g. '#t='
	value: T
	encode: (value: T) => string
	decode: (encoded: string) => T | null
	onLoad: (value: T) => void
	storageKey?: string
}): void {
	const { prefix, value, encode, storageKey } = options
	const hydrated = useRef(false)
	// decode/onLoad are only used in the mount effect; keep the latest without
	// making them effect dependencies (the read is mount-only by design).
	const loadRef = useRef({ decode: options.decode, onLoad: options.onLoad })
	loadRef.current = { decode: options.decode, onLoad: options.onLoad }

	useEffect(() => {
		const hash = window.location.hash
		if (hash.startsWith(prefix)) {
			const decoded = loadRef.current.decode(
				decodeURIComponent(hash.slice(prefix.length))
			)
			if (decoded !== null) loadRef.current.onLoad(decoded)
		}
		hydrated.current = true
		// Mount-only: the prefix is constant for an island's lifetime.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		if (!hydrated.current) return
		const encoded = encode(value)
		window.history.replaceState(
			null,
			'',
			`${window.location.pathname}${window.location.search}${prefix}${encoded}`
		)
		if (storageKey) {
			try {
				window.localStorage.setItem(storageKey, encoded)
			} catch {
				// localStorage may be unavailable (private mode); ignore.
			}
		}
		// encode is a stable module function in every caller.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, prefix, storageKey])
}
