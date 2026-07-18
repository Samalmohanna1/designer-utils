// Client-side file download for the export blocks. There's no backend, so the
// snippet is turned into a Blob URL and handed to a synthetic <a download>.

export const downloadText = (filename: string, contents: string): void => {
	const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain' }))
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	link.remove()
	URL.revokeObjectURL(url)
}
