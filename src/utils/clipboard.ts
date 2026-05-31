// Write an SVG string to the clipboard so it pastes into Figma (and other
// vector tools) as named, editable rectangles. The markup goes on the
// clipboard under BOTH text/plain and image/svg+xml in one ClipboardItem:
// Figma-in-browser pastes the SVG it finds in text/plain on canvas, while the
// desktop app / other tools read the image/svg+xml blob — covering both paths.
// Falls back to plain text where ClipboardItem is unavailable. Calls onDone
// once the write resolves.
export const copySvg = (svg: string, onDone: () => void): void => {
	if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
		const item = new ClipboardItem({
			'text/plain': new Blob([svg], { type: 'text/plain' }),
			'image/svg+xml': new Blob([svg], { type: 'image/svg+xml' }),
		})
		navigator.clipboard
			.write([item])
			.then(onDone)
			.catch(() => {
				navigator.clipboard.writeText(svg).then(onDone)
			})
	} else {
		navigator.clipboard.writeText(svg).then(onDone)
	}
}
