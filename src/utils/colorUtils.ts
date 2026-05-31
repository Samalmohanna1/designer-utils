export interface ColorScale {
    id: number
    color: string
    name: string
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
        const { h, s, l } = colorUtils.hexToHSLValues(hex)
        return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, 1)`
    },

    hexToHSLValues(hex: string): { h: number; s: number; l: number } {
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
        return { h: h * 360, s: s * 100, l: l * 100 }
    },

    // Maps a hex to a human-friendly hue name (e.g. "blue", "slate").
    // Hand-rolled from HSL so there's no color-name dependency.
    nameFromHex(hex: string): string {
        const { h, s, l } = colorUtils.hexToHSLValues(hex)

        if (l <= 8) return 'black'
        if (l >= 95 && s <= 12) return 'white'
        if (s <= 10) {
            if (l <= 30) return 'charcoal'
            if (l <= 55) return 'gray'
            return 'silver'
        }

        const hues: [number, string][] = [
            [15, 'red'],
            [45, 'orange'],
            [70, 'yellow'],
            [160, 'green'],
            [200, 'teal'],
            [250, 'blue'],
            [290, 'purple'],
            [330, 'pink'],
            [360, 'red'],
        ]
        const base = hues.find(([max]) => h <= max)?.[1] ?? 'color'
        if (s <= 30) return `muted-${base}`
        return base
    },

    slugify(name: string): string {
        const slug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        return slug || 'color'
    },

    // Turns scale names into unique, export-safe slugs, preserving order.
    // Collisions get a numeric suffix: blue, blue-2, blue-3.
    uniqueSlugs(names: string[]): string[] {
        const counts = new Map<string, number>()
        return names.map((name) => {
            const base = colorUtils.slugify(name)
            const seen = counts.get(base) ?? 0
            counts.set(base, seen + 1)
            return seen === 0 ? base : `${base}-${seen + 1}`
        })
    },

    // Extracts every 6-digit hex color from free-form pasted text (commas,
    // spaces, or newlines; '#' optional). Returns normalized #RRGGBB values
    // in order. Used by the bulk-paste flow.
    parseHexList(text: string): string[] {
        const matches = text.match(/#?[0-9a-fA-F]{6}\b/g) ?? []
        return matches.map(
            (m) => `#${m.replace('#', '').toUpperCase()}`
        )
    },

    // --- Shareable palette serialization ---
    // A palette is encoded for the URL hash as `name:hex` pairs joined by
    // commas, e.g. `blue:5799DB,brand:E11D48`. Names are slugified and hexes
    // are stripped of '#'. Round-trips through encode/decode.

    encodePalette(scales: { name: string; color: string }[]): string {
        return scales
            .map(({ name, color }) => {
                const hex = color.replace('#', '').toUpperCase()
                return `${colorUtils.slugify(name)}:${hex}`
            })
            .join(',')
    },

    // Parses the encoded string back into entries, dropping any malformed
    // pair. Returns [] when nothing valid is found.
    decodePalette(encoded: string): { name: string; color: string }[] {
        if (!encoded) return []
        return encoded
            .split(',')
            .map((pair) => {
                const [rawName, rawHex] = pair.split(':')
                if (!rawHex) return null
                const hex = rawHex.trim()
                if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
                const name = colorUtils.slugify(rawName ?? '')
                return { name, color: `#${hex.toUpperCase()}` }
            })
            .filter(
                (e): e is { name: string; color: string } => e !== null
            )
    },

    hslToHex(h: number, s: number, l: number): string {
        const sFrac = s / 100
        const lFrac = l / 100
        const k = (n: number) => (n + h / 30) % 12
        const a = sFrac * Math.min(lFrac, 1 - lFrac)
        const f = (n: number) =>
            lFrac - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
        return colorUtils.rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255)
    },

    // A distinct starting color for the Nth scale, so new scales don't
    // collapse into each other in the dedupe. Walks the hue wheel by a
    // golden-angle step for good visual separation.
    defaultColorForIndex(index: number): string {
        const hue = (210 + index * 137.508) % 360
        return colorUtils.hslToHex(hue, 65, 60)
    },

    // --- OKLCH (perceptual) color space ---
    // Conversions follow Björn Ottosson's OKLab definition. OKLCH is the
    // cylindrical form: L (0..1 lightness), C (chroma >= 0), H (hue degrees).

    // hex -> OKLCH. Inverse of oklchToHex.
    hexToOklch(hex: string): { l: number; c: number; h: number } {
        const [r, g, b] = colorUtils
            .hexToRgb(hex)
            .map((x) => colorUtils.sRGBtoLin(x))

        const l_ = Math.cbrt(
            0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
        )
        const m_ = Math.cbrt(
            0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
        )
        const s_ = Math.cbrt(
            0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
        )

        const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
        const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
        const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_

        const c = Math.sqrt(a * a + bb * bb)
        let h = (Math.atan2(bb, a) * 180) / Math.PI
        if (h < 0) h += 360
        return { l: L, c, h }
    },

    // OKLCH -> linear sRGB (may fall outside [0,1] if out of gamut).
    oklchToLinearRgb(l: number, c: number, h: number): [number, number, number] {
        const hRad = (h * Math.PI) / 180
        const a = c * Math.cos(hRad)
        const bb = c * Math.sin(hRad)

        const l_ = l + 0.3963377774 * a + 0.2158037573 * bb
        const m_ = l - 0.1055613458 * a - 0.0638541728 * bb
        const s_ = l - 0.0894841775 * a - 1.291485548 * bb

        const lc = l_ * l_ * l_
        const mc = m_ * m_ * m_
        const sc = s_ * s_ * s_

        return [
            4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
            -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
            -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
        ]
    },

    // OKLCH -> hex. If the color is outside sRGB, reduce chroma (preserving
    // hue and lightness) until it fits, rather than clamping channels — which
    // would shift the hue. This is a simple binary-search gamut map.
    oklchToHex(l: number, c: number, h: number): string {
        const inGamut = ([r, g, b]: [number, number, number]) => {
            const e = 0.0001
            return (
                r >= -e && r <= 1 + e &&
                g >= -e && g <= 1 + e &&
                b >= -e && b <= 1 + e
            )
        }

        let lo = 0
        let hi = c
        if (!inGamut(colorUtils.oklchToLinearRgb(l, hi, h))) {
            for (let i = 0; i < 24; i++) {
                const mid = (lo + hi) / 2
                if (inGamut(colorUtils.oklchToLinearRgb(l, mid, h))) {
                    lo = mid
                } else {
                    hi = mid
                }
            }
        } else {
            lo = hi
        }

        const [rLin, gLin, bLin] = colorUtils.oklchToLinearRgb(l, lo, h)
        return colorUtils.rgbToHex(
            colorUtils.linToSRGB(rLin),
            colorUtils.linToSRGB(gLin),
            colorUtils.linToSRGB(bLin)
        )
    },

    // OKLCH lightness endpoints for the ramp. The base color anchors 500;
    // lighter shades fan up toward LIGHTEST, darker ones down toward DARKEST.
    LIGHTEST_L: 0.97,
    DARKEST_L: 0.25,

    // Index of the 500 shade, which is the unmodified base color.
    BASE_INDEX: 5,

    generateShades(baseColor: string): string[] {
        const base = colorUtils.hexToOklch(baseColor)
        const { BASE_INDEX, LIGHTEST_L, DARKEST_L } = colorUtils

        return colorUtils.shadeNumbers.map((_shade, i) => {
            if (i === BASE_INDEX) {
                // 500 is the base color, normalized to canonical hex.
                return colorUtils.rgbToHex(...colorUtils.hexToRgb(baseColor))
            }

            // Interpolate lightness between the base (at 500) and the
            // light/dark endpoint, so the ramp is monotonic for any input.
            let targetL: number
            if (i < BASE_INDEX) {
                const t = (BASE_INDEX - i) / BASE_INDEX
                targetL = base.l + (LIGHTEST_L - base.l) * t
            } else {
                const lastIndex = colorUtils.shadeNumbers.length - 1
                const t = (i - BASE_INDEX) / (lastIndex - BASE_INDEX)
                targetL = base.l + (DARKEST_L - base.l) * t
            }

            // Taper chroma toward the very light / very dark ends so the
            // ramp stays in gamut and doesn't look neon or wash out.
            const distance = Math.abs(targetL - base.l)
            const chroma = Math.max(base.c * (1 - 0.5 * distance), 0)
            return colorUtils.oklchToHex(targetL, chroma, base.h)
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

    // Inverse of sRGBtoLin: linear-light (0..1) -> 0..255 sRGB, clamped.
    linToSRGB(channel: number): number {
        const clamped = Math.min(Math.max(channel, 0), 1)
        const v =
            clamped <= 0.0031308
                ? clamped * 12.92
                : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
        return v * 255
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
    },

    // Black or white, whichever reads better as text on the given background.
    // Used for labels drawn on top of a swatch.
    readableTextColor(bgHex: string): string {
        const onBlack = colorUtils.getContrastRatio(bgHex, '#000000')
        const onWhite = colorUtils.getContrastRatio(bgHex, '#FFFFFF')
        return onBlack >= onWhite ? '#000000' : '#FFFFFF'
    },

    // Swatch geometry shared by the SVG copy helpers.
    SWATCH_W: 120,
    SWATCH_H: 160,

    // One scale as a horizontal row of labeled swatches, wrapped in a <g>
    // identified by the slug, offset down the canvas by `y`. The building block
    // both scaleToSvg and paletteToSvg compose. Each swatch is itself a <g>
    // with `id="<slug>-<shade>"` — Figma reads the `id` attribute as the layer
    // name on import — holding the fill rect plus the shade number and hex drawn
    // in whichever of black/white reads on that color.
    swatchRowSvg(slug: string, baseColor: string, y: number): string {
        const SW = colorUtils.SWATCH_W
        const SH = colorUtils.SWATCH_H
        const swatches = colorUtils
            .generateShades(baseColor)
            .map((hex, i) => {
                const shade = colorUtils.shadeNumbers[i]
                const x = i * SW
                const label = `${slug}-${shade}`
                const ink = colorUtils.readableTextColor(hex)
                return (
                    `<g id="${label}">` +
                    `<title>${label} ${hex}</title>` +
                    `<rect x="${x}" y="${y}" width="${SW}" height="${SH}" fill="${hex}"/>` +
                    `<text x="${x + 12}" y="${y + 28}" font-family="sans-serif" font-size="20" font-weight="700" fill="${ink}">${shade}</text>` +
                    `<text x="${x + 12}" y="${y + SH - 16}" font-family="monospace" font-size="15" fill="${ink}" opacity="0.85">${hex}</text>` +
                    `</g>`
                )
            })
            .join('')
        return `<g id="${slug}">${swatches}</g>`
    },

    // Wraps row groups in a sized <svg>. width/height in user units.
    wrapSvg(rows: string, width: number, height: number): string {
        return (
            `<svg xmlns="http://www.w3.org/2000/svg" ` +
            `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
            `${rows}</svg>`
        )
    },

    // A single scale's 10-shade ramp as an SVG of labeled swatches. Copied to
    // the clipboard so a designer pastes it into Figma (or any vector tool) as
    // named, editable rectangles instead of rebuilding the ramp by hand.
    scaleToSvg(slug: string, baseColor: string): string {
        const width = colorUtils.SWATCH_W * colorUtils.shadeNumbers.length
        return colorUtils.wrapSvg(
            colorUtils.swatchRowSvg(slug, baseColor, 0),
            width,
            colorUtils.SWATCH_H
        )
    },

    // The whole palette as an SVG: one scale per row, stacked top to bottom in
    // array (export) order, each row a named group. Pastes the entire system
    // into Figma at once. `scales` carry a slug + base color; pass the de-duped
    // slugs so layer names match the exports.
    paletteToSvg(scales: { slug: string; color: string }[]): string {
        const SH = colorUtils.SWATCH_H
        const width = colorUtils.SWATCH_W * colorUtils.shadeNumbers.length
        const rows = scales
            .map((s, row) => colorUtils.swatchRowSvg(s.slug, s.color, row * SH))
            .join('')
        return colorUtils.wrapSvg(rows, width, SH * Math.max(scales.length, 1))
    },

    // Geometry shared by the contrast-grid SVG.
    PAIR_CARD_W: 320,
    PAIR_CARD_H: 124,
    PAIR_GAP: 16,
    PAIR_COLS: 3,

    // One contrast pairing as a positioned <g> cell (no <svg> wrapper),
    // mirroring the on-screen card: a background panel with the sample text in
    // the foreground color, a tier badge, then a footer naming the pairing and
    // its ratio. `large` renders the sample bigger+bold (the AA Large preview).
    // Named `<fgLabel>-on-<bgLabel>` so Figma shows the pairing as the layer
    // name. The building block gridToSvg lays out.
    pairCardSvg(
        pair: {
            fgHex: string
            bgHex: string
            fgLabel: string
            bgLabel: string
            ratio: number
            tier: string
            large: boolean
        },
        x: number,
        y: number
    ): string {
        const W = colorUtils.PAIR_CARD_W
        const PANEL_H = 90
        const FOOT_H = colorUtils.PAIR_CARD_H - PANEL_H
        const esc = colorUtils.escapeXml
        const id = `${pair.fgLabel}-on-${pair.bgLabel}`
        const sampleSize = pair.large ? 24 : 17
        const sampleWeight = pair.large ? 700 : 400
        const ink = '#000000' // footer is a light strip
        const badgeW = 8 + pair.tier.length * 7
        return (
            `<g id="${esc(id)}" transform="translate(${x},${y})">` +
            `<rect x="0" y="0" width="${W}" height="${PANEL_H}" fill="${pair.bgHex}"/>` +
            `<text x="16" y="${PANEL_H / 2 + sampleSize / 3}" ` +
            `font-family="sans-serif" font-size="${sampleSize}" ` +
            `font-weight="${sampleWeight}" fill="${pair.fgHex}">` +
            `The quick brown fox</text>` +
            // tier badge, top-right of the panel
            `<rect x="${W - badgeW - 10}" y="10" width="${badgeW}" height="18" rx="3" fill="#FFFFFF" opacity="0.9"/>` +
            `<text x="${W - badgeW / 2 - 10}" y="23" text-anchor="middle" ` +
            `font-family="sans-serif" font-size="11" font-weight="700" fill="#1A1A1A">${esc(pair.tier)}</text>` +
            // footer
            `<rect x="0" y="${PANEL_H}" width="${W}" height="${FOOT_H}" fill="#FBFAF7"/>` +
            `<rect x="14" y="${PANEL_H + 12}" width="10" height="10" fill="${pair.fgHex}" stroke="#D8D5CE"/>` +
            `<text x="30" y="${PANEL_H + 21}" font-family="sans-serif" ` +
            `font-size="13" fill="${ink}">${esc(id)}</text>` +
            `<text x="${W - 14}" y="${PANEL_H + 21}" text-anchor="end" ` +
            `font-family="monospace" font-size="13" font-weight="700" ` +
            `fill="${ink}">${pair.ratio}:1</text>` +
            `</g>`
        )
    },

    // The whole compliance grid as one SVG: every passing pairing laid out in
    // the same 3-column grid, grouped under a tier header (AAA / AA / AA Large),
    // each card tagged with its level. Pastes the full WCAG view into Figma at
    // once. `tiers` are pre-grouped and pre-labeled by the caller.
    contrastGridToSvg(
        title: string,
        tiers: {
            tier: string
            note: string
            cards: {
                fgHex: string
                bgHex: string
                fgLabel: string
                bgLabel: string
                ratio: number
                large: boolean
            }[]
        }[]
    ): string {
        const CW = colorUtils.PAIR_CARD_W
        const CH = colorUtils.PAIR_CARD_H
        const GAP = colorUtils.PAIR_GAP
        const COLS = colorUtils.PAIR_COLS
        const PAD = 24
        const HEADER_H = 30 // per-tier header row
        const TITLE_H = 40
        const esc = colorUtils.escapeXml
        const width = PAD * 2 + COLS * CW + (COLS - 1) * GAP

        let y = TITLE_H
        const sections = tiers
            .filter((t) => t.cards.length > 0)
            .map((t) => {
                const headerY = y
                y += HEADER_H
                const cells = t.cards
                    .map((card, i) => {
                        const col = i % COLS
                        const row = Math.floor(i / COLS)
                        const cx = PAD + col * (CW + GAP)
                        const cy = y + row * (CH + GAP)
                        return colorUtils.pairCardSvg(
                            { ...card, tier: t.tier },
                            cx,
                            cy
                        )
                    })
                    .join('')
                const rows = Math.ceil(t.cards.length / COLS)
                y += rows * CH + (rows - 1) * GAP + GAP
                const header =
                    `<text x="${PAD}" y="${headerY + 20}" font-family="sans-serif" ` +
                    `font-size="15" font-weight="700" fill="#1A1A1A">` +
                    `${esc(t.tier)} — ${esc(t.note)}</text>`
                return `<g id="${esc(t.tier)}">${header}${cells}</g>`
            })
            .join('')

        const titleEl =
            `<text x="${PAD}" y="26" font-family="sans-serif" font-size="18" ` +
            `font-weight="700" fill="#1A1A1A">${esc(title)}</text>`
        const bg = `<rect x="0" y="0" width="${width}" height="${y}" fill="#FFFFFF"/>`
        return colorUtils.wrapSvg(`${bg}${titleEl}${sections}`, width, y)
    },

    // Minimal XML-attribute/text escaping for values interpolated into SVG.
    escapeXml(s: string): string {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    },

    // The dark-mode ramp: the same shade slots in reverse, so a light tint
    // (e.g. 50) takes the value of its opposite end (900) and vice versa,
    // keeping hue and chroma. shadeHexes is the ordered 50..900 list.
    mirrorHexes(shadeHexes: string[]): string[] {
        return [...shadeHexes].reverse()
    },

    // Which shades pass WCAG AA (>=4.5:1) as text on white and on black.
    // Used by the style-guide export to annotate each scale.
    textSafeShades(shadeHexes: string[]): {
        onWhite: number[]
        onBlack: number[]
    } {
        const onWhite: number[] = []
        const onBlack: number[] = []
        shadeHexes.forEach((hex, i) => {
            const shade = colorUtils.shadeNumbers[i]
            if (colorUtils.getContrastRatio(hex, '#FFFFFF') >= 4.5) {
                onWhite.push(shade)
            }
            if (colorUtils.getContrastRatio(hex, '#000000') >= 4.5) {
                onBlack.push(shade)
            }
        })
        return { onWhite, onBlack }
    },

    // Compresses a sorted list of shade numbers into a readable range string,
    // e.g. [600,700,800,900] -> "600-900", [50,200,900] -> "50, 200, 900".
    formatShadeRanges(shades: number[]): string {
        if (shades.length === 0) return 'none'
        const order = colorUtils.shadeNumbers as readonly number[]
        const parts: string[] = []
        let start = shades[0]
        let prev = shades[0]
        const isNext = (a: number, b: number) =>
            order.indexOf(b) === order.indexOf(a) + 1
        for (let i = 1; i <= shades.length; i++) {
            const cur = shades[i]
            if (i < shades.length && isNext(prev, cur)) {
                prev = cur
                continue
            }
            parts.push(start === prev ? `${start}` : `${start}-${prev}`)
            start = cur
            prev = cur
        }
        return parts.join(', ')
    },
}