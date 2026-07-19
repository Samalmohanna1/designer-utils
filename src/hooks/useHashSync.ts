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
	// The encoding last synced. Seeded on the first post-mount run WITHOUT
	// writing: a replaceState during hydration aborts any in-flight
	// navigation (a nav click in that window would be swallowed), and the
	// eager write also used to clobber the previous session's autosave. The
	// URL/storage only update once the value actually changes.
	const lastSynced = useRef<string | null>(null)
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
		if (lastSynced.current === null) {
			// First run after mount: record the baseline, write nothing.
			lastSynced.current = encoded
			return
		}
		if (encoded === lastSynced.current) return
		lastSynced.current = encoded
		if (window.location.hash !== `${prefix}${encoded}`) {
			window.history.replaceState(
				null,
				'',
				`${window.location.pathname}${window.location.search}${prefix}${encoded}`
			)
		}
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
