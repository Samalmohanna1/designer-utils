export interface ColorScale {
    id: number
    color: string
}

export interface ColorInfo {
    hex: string
    shade: number
    scaleId: number
    scaleIndex: number
}

export interface ColorCombination {
    color1: ColorInfo
    color2: ColorInfo
    contrast: number
    meetsAA: boolean
    meetsAAA: boolean
    meetsAALarge: boolean
}

export const colorUtils = {
    shadeNumbers: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const,

    calculateMixPercentage(shade: number): number {
        if (shade <= 500) {
            return 95 - ((shade - 50) / 450) * 95
        } else {
            return ((shade - 500) / 400) * 50
        }
    },

    hexToRgb(hex: string): [number, number, number] {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result
            ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16),
            ]
            : [0, 0, 0]
    },

    rgbToHex(r: number, g: number, b: number): string {
        return (
            '#' +
            [r, g, b]
                .map((x) => {
                    const hex = Math.round(x).toString(16)
                    return hex.length === 1 ? '0' + hex : hex
                })
                .join('')
                .toUpperCase()
        )
    },

    hexToHSL(hex: string): string {
        let [r, g, b] = colorUtils.hexToRgb(hex).map((x) => x / 255)
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        let h = 0,
            s = 0,
            l = (max + min) / 2

        if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0)
                    break
                case g:
                    h = (b - r) / d + 2
                    break
                case b:
                    h = (r - g) / d + 4
                    break
            }
            h /= 6
        }
        return `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(
            l * 100
        )}%, 1)`
    },

    mixColors(
        color1: [number, number, number],
        color2: [number, number, number],
        weight: number
    ): [number, number, number] {
        return color1.map((c, i) =>
            Math.round(c * (1 - weight) + color2[i] * weight)
        ) as [number, number, number]
    },

    generateShades(baseColor: string): string[] {
        const baseRgb = this.hexToRgb(baseColor)
        return this.shadeNumbers.map((shade) => {
            const mixPercentage = this.calculateMixPercentage(shade) / 100
            const mixColor: [number, number, number] = shade < 500 ? [255, 255, 255] : [0, 0, 0]
            const mixedRgb = this.mixColors(baseRgb, mixColor, mixPercentage)
            return this.rgbToHex(...mixedRgb)
        })
    },

    // WCAG contrast calculation functions
    sRGBtoLin(colorChannel: number): number {
        colorChannel = colorChannel / 255
        if (colorChannel <= 0.03928) {
            return colorChannel / 12.92
        } else {
            return Math.pow((colorChannel + 0.055) / 1.055, 2.4)
        }
    },

    getLuminance(r: number, g: number, b: number): number {
        const rsRGB = this.sRGBtoLin(r)
        const gsRGB = this.sRGBtoLin(g)
        const bsRGB = this.sRGBtoLin(b)
        return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB
    },

    getContrastRatio(color1: string, color2: string): number {
        const [r1, g1, b1] = this.hexToRgb(color1)
        const [r2, g2, b2] = this.hexToRgb(color2)

        const lum1 = this.getLuminance(r1, g1, b1)
        const lum2 = this.getLuminance(r2, g2, b2)

        const brightest = Math.max(lum1, lum2)
        const darkest = Math.min(lum1, lum2)

        return (brightest + 0.05) / (darkest + 0.05)
    }
}