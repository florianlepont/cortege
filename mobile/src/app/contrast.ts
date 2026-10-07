// WCAG 2.1 contrast helpers. Pure functions with no dependency, used by the visual token tests
// (`visual-tokens.test.ts`) to keep every text and graphic pair of the 12.2 contract above its ratio.

type Rgba = { r: number; g: number; b: number; a: number }

function parseColor(color: string): Rgba {
  const value = color.trim()
  if (value.startsWith("#")) {
    const hex = value.slice(1)
    if (hex.length !== 6) throw new Error(`Unsupported hex colour: ${color}`)
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    }
  }
  const match = /^rgba?\(([^)]*)\)$/.exec(value)
  if (!match) throw new Error(`Unsupported colour: ${color}`)
  const parts = match[1].split(",").map((part) => Number(part.trim()))
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Unsupported colour: ${color}`)
  }
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
}

function toHex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase()
}

/** Alpha blend `color` (hex or rgba) over an opaque `backgroundHex`; returns `#RRGGBB`. */
export function compositeOver(color: string, backgroundHex: string): string {
  const fg = parseColor(color)
  const bg = parseColor(backgroundHex)
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a)
  return `#${toHex(mix(fg.r, bg.r))}${toHex(mix(fg.g, bg.g))}${toHex(mix(fg.b, bg.b))}`
}

function linearise(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG relative luminance of an opaque `#RRGGBB` colour. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseColor(hex)
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b)
}

/** WCAG contrast ratio; an `rgba(...)` foreground is composited over the background first. */
export function contrastRatio(fg: string, bg: string): number {
  const foreground = fg.trim().startsWith("rgba") ? compositeOver(fg, bg) : fg
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}
