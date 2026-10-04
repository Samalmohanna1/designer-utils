// Client-side file download for the export blocks. There's no backend, so the
// snippet is turned into a Blob URL and handed to a synthetic <a download>.

export interface DownloadFile {
	filename: string
	contents: string
}

const mimeFor = (filename: string): string =>
	filename.endsWith('.json') ? 'application/json' : 'text/plain'

export const downloadText = (filename: string, contents: string): void => {
	const url = URL.createObjectURL(
		new Blob([contents], { type: mimeFor(filename) })
	)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	link.remove()
	// Revoking in the same tick can cancel the save while it's still starting,
	// which shows up once several downloads fire in a row.
	setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// Figma imports one file per variable mode, so the token export saves a set.
// Browsers drop downloads fired in a tight loop from one gesture, so they're
// spaced out; Chrome additionally asks once to allow multiple files.
export const downloadAll = (files: DownloadFile[]): void => {
	files.forEach((file, i) => {
		if (i === 0) downloadText(file.filename, file.contents)
		else setTimeout(() => downloadText(file.filename, file.contents), i * 300)
	})
}
