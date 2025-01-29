/**
 * Lightens or darkens a HEX color by a given factor.
 * @param hex - The base HEX color (e.g., "#3b82f6").
 * @param factor - A number between -1 (darken) and 1 (lighten).
 * @returns The modified HEX color.
 */
export function LightenDarkenColor(hex: string, factor: number): string {
	// Ensure the hex color is valid
	if (!/^#([0-9A-F]{3}){1,2}$/i.test(hex)) {
		throw new Error(`Invalid HEX color: ${hex}`);
	}

	// Convert shorthand hex to full hex (e.g., "#fff" -> "#ffffff")
	if (hex.length === 4) {
		hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
	}

	// Parse the R, G, B values from the hex string
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);

	// Adjust each color channel based on the factor
	const adjustChannel = (channel: number): number => {
		return Math.min(255, Math.max(0, channel + Math.round(channel * factor)));
	};

	const newR = adjustChannel(r);
	const newG = adjustChannel(g);
	const newB = adjustChannel(b);

	// Convert back to HEX and return
	return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
