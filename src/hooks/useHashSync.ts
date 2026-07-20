import { useEffect, useRef } from 'react'

// The URL-hash persistence pattern: read the hash once on mount (a valid hash
// wins over the default), then live-sync state back to the hash via
// replaceState so edits don't spam history. A `hydrated` ref gates the sync so
// it can't overwrite the hash before the initial read. The raw hash (minus the
// prefix) is passed to `decode` as-is — segment-level URI decoding is the
// decoder's job, since the encoded value may itself contain %-escaped parts.
export function useHashSync<T>(options: {
	prefix: string // e.g. '#'
	value: T
	encode: (value: T) => string
	decode: (encoded: string) => T | null
	onLoad: (value: T) => void
}): void {
	const { prefix, value, encode } = options
	const hydrated = useRef(false)
	// The encoding last synced. Seeded on the first post-mount run WITHOUT
	// writing: a replaceState during hydration aborts any in-flight
	// navigation (a nav click in that window would be swallowed). The URL
	// only updates once the value actually changes.
	const lastSynced = useRef<string | null>(null)
	// decode/onLoad are only used in the mount effect; keep the latest without
	// making them effect dependencies (the read is mount-only by design).
	const loadRef = useRef({ decode: options.decode, onLoad: options.onLoad })
	loadRef.current = { decode: options.decode, onLoad: options.onLoad }

	useEffect(() => {
		const hash = window.location.hash
		if (hash.startsWith(prefix)) {
			const decoded = loadRef.current.decode(hash.slice(prefix.length))
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
		// encode is a stable module function in every caller.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value, prefix])
}

// localStorage autosave with the same write-on-change-only semantics as the
// hash sync: the first post-mount encoding is the baseline (so simply opening
// the page never clobbers a previous session's save), and only a real edit
// writes. Restoring is the caller's decision.
export function useAutosave(key: string, encoded: string): void {
	const lastSaved = useRef<string | null>(null)
	useEffect(() => {
		if (lastSaved.current === null) {
			lastSaved.current = encoded
			return
		}
		if (encoded === lastSaved.current) return
		lastSaved.current = encoded
		try {
			window.localStorage.setItem(key, encoded)
		} catch {
			// localStorage may be unavailable (private mode); ignore.
		}
	}, [key, encoded])
}
