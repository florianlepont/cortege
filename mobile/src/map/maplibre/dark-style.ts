import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import { brandMapTokens } from "../../app/brand-tokens"

type Hsla = { h: number; s: number; l: number; a: number }

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const RGB = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i

function rgbToHsla(r: number, g: number, b: number, a: number): Hsla {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l, a }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / d) % 6
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return { h: (h * 60 + 360) % 360, s, l, a }
}

/** Reads a CSS colour (hex, rgb, rgba) as hue, saturation, lightness and alpha; null otherwise. */
export function parseColor(value: string): Hsla | null {
  const text = value.trim()
  const hex = HEX.exec(text)
  if (hex) {
    let digits = hex[1]
    if (digits.length <= 4) {
      digits = digits
        .split("")
        .map((char) => char + char)
        .join("")
    }
    const n = (index: number): number => parseInt(digits.slice(index, index + 2), 16)
    return rgbToHsla(n(0), n(2), n(4), digits.length === 8 ? n(6) / 255 : 1)
  }
  const rgb = RGB.exec(text)
  if (rgb) {
    return rgbToHsla(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] ? Number(rgb[4]) : 1)
  }
  return null
}

/**
 * The dark counterpart of a colour: the lightness is flipped (a white ground becomes near black,
 * dark text becomes light) and the saturation toned down, the hue and the alpha are kept, so a
 * green stays green and a halo stays a halo.
 */
export function darkenColor(value: string): string {
  const color = parseColor(value)
  if (color === null) return value
  const lightness = Math.min(0.88, Math.max(0.08, 0.08 + (1 - color.l) * 0.8))
  const saturation = color.s * 0.75
  const alpha = Math.round(color.a * 100) / 100
  return `hsla(${Math.round(color.h)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%, ${alpha})`
}

function darkenValue(value: unknown): unknown {
  if (typeof value === "string") return darkenColor(value)
  if (Array.isArray(value)) return value.map(darkenValue)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, darkenValue(item)]))
  }
  return value
}

/**
 * The Plan IGN style in dark: every colour property (`*-color`, including those inside
 * expressions and zoom stops) is recoloured, a dark ground is put under the layers, and the
 * sources, sprite and glyphs are untouched, so the same vector tiles (and the same offline packs)
 * serve both themes. IGN publishes no dark style.
 */
export function darkenPlanIgnStyle(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.map((layer) => {
    const paint = (layer as { paint?: Record<string, unknown> }).paint
    if (!paint) return layer
    const darkPaint = Object.fromEntries(
      Object.entries(paint).map(([key, value]) => [
        key,
        key.endsWith("-color") ? darkenValue(value) : value,
      ]),
    )
    return { ...layer, paint: darkPaint } as typeof layer
  })
  return {
    ...style,
    layers: [
      {
        id: "basemap-dark-ground",
        type: "background",
        paint: { "background-color": brandMapTokens.darkBasemapBackground },
      },
      ...layers,
    ],
  }
}
