import html2canvas from 'html2canvas'

const ScreenshotButton = () => {
	const takeScreenshot = () => {
		const sectionElement = document.querySelector('section')
		if (sectionElement) {
			html2canvas(sectionElement).then((canvas) => {
				const link = document.createElement('a')
				link.download = 'color-scale.png'
				link.href = canvas.toDataURL()
				link.click()
			})
		}
	}

	return (
		<button
			className='mt-4 px-4 py-2 bg-zinc-950 text-white rounded hover:bg-blue-900 font-bold flex items-center justify-center'
			onClick={takeScreenshot}
		>
			<span className='inline-block mr-2'>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					viewBox='0 0 512 512'
					className='w-4 h-4 fill-current'
				>
					<path d='M448 80c8.8 0 16 7.2 16 16l0 319.8-5-6.5-136-176c-4.5-5.9-11.6-9.3-19-9.3s-14.4 3.4-19 9.3L202 340.7l-30.5-42.7C167 291.7 159.8 288 152 288s-15 3.7-19.5 10.1l-80 112L48 416.3l0-.3L48 96c0-8.8 7.2-16 16-16l384 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zm80 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z' />
				</svg>
			</span>
			Take a Screenshot
		</button>
	)
}

export default ScreenshotButton
