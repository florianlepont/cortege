// Converter of the fifteen dendromicrohabitat drawings (phase 32, plan 32-04, D-06 and D-11).
//
// Usage, from the repository root:
//   node mobile/scripts/build-dmh-drawings.mjs <folder of SVG sources>
//
// It reads every dmh_NN-slug.svg of the folder, checks that each one keeps to the approved style
// (a flat file of path, ellipse and circle elements in one group, no colour of its own beyond the
// source's, no text, image, use, style or script), and writes the generated module
// mobile/src/app/dmh-guide/drawings.ts with the elements as the sources draw them: path data
// verbatim, ellipse and circle attributes, the rotate angle and centre. react-native-svg renders
// those elements directly, so nothing is normalised, measured or animated here.
//
// Every breach is reported as a line ("style: ", "missing: ", "duplicate: ", "budget: ") and the
// exit code is then non-zero with nothing written. Format the output afterwards with
// `npx prettier --write mobile/src/app/dmh-guide/drawings.ts`. The result is checked by the
// drawings gate, mobile/src/__checks__/dmh-drawings.test.ts. No dependency: the sources are flat
// one-line files, a small tag scanner is enough.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUTPUT = join(HERE, "../src/app/dmh-guide/drawings.ts")

/** The stroke weights of the approved style (6 main lines, thinner details, up to 12 for dots). */
export const DMH_DRAWING_STROKE_RANGE = { min: 4, max: 12 }
const FRAME = { width: 800, height: 600 }
const GROUP_STROKE_WIDTH = 6
const GROUP_COUNT = 15
const DRAWING_MAX_BYTES = 12 * 1024

/** Path data: starts with M or m, then only path commands, digits, signs, dots, commas, spaces. */
const PATH_DATA = /^[Mm][MLHVCSQTAZmlhvcsqtaz0-9+\-.,\s]*$/
const NUMBER = /^-?\d+(?:\.\d+)?$/
const ROTATE = /^rotate\(\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)\s*\)$/

const ALLOWED_ATTRIBUTES = {
  svg: ["xmlns", "viewBox", "width", "height"],
  rect: ["width", "height", "fill"],
  g: ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"],
  path: ["d", "stroke-width"],
  ellipse: ["cx", "cy", "rx", "ry", "transform", "stroke-width"],
  circle: ["cx", "cy", "r", "stroke-width"],
}

function attributesOf(text) {
  const attributes = {}
  for (const match of text.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g)) {
    attributes[match[1]] = match[2]
  }
  return attributes
}

function numberOf(value) {
  if (value === undefined || !NUMBER.test(value)) return null
  return Number(value)
}

/** Converts one source. Returns { elements, findings }. */
export function convertSource(file, text) {
  const findings = []
  const breach = (what) => findings.push(`style: ${file}: ${what}`)
  const elements = []

  if (/<[!?]|\bhref\b|\bstyle\s*=|<style|<script/i.test(text)) {
    breach("comment, declaration, href, style or script")
  }

  let sawSvg = false
  let sawBackground = false
  let sawGroup = false
  let insideGroup = false
  let groupClosed = false

  for (const match of text.matchAll(/<(\/?)([A-Za-z][\w-]*)([^<>]*?)(\/?)>/g)) {
    const closing = match[1] === "/"
    const tag = match[2]
    const attributes = attributesOf(match[3])
    const names = Object.keys(attributes)

    if (closing) {
      if (tag === "g") {
        insideGroup = false
        groupClosed = true
      } else if (tag !== "svg") {
        breach(`closing tag </${tag}> is not allowed`)
      }
      continue
    }

    if (!(tag in ALLOWED_ATTRIBUTES)) {
      breach(`element <${tag}> is not allowed`)
      continue
    }
    for (const name of names) {
      if (!ALLOWED_ATTRIBUTES[tag].includes(name))
        breach(`<${tag}> attribute ${name} is not allowed`)
    }

    if (tag === "svg") {
      sawSvg = true
      if (attributes.viewBox !== `0 0 ${FRAME.width} ${FRAME.height}`) {
        breach(`root viewBox must be "0 0 ${FRAME.width} ${FRAME.height}"`)
      }
      continue
    }

    if (tag === "rect") {
      if (sawBackground || sawGroup)
        breach("only one background rect, before the group, is allowed")
      sawBackground = true
      if (
        numberOf(attributes.width) !== FRAME.width ||
        numberOf(attributes.height) !== FRAME.height
      ) {
        breach("the background rect must fill the frame")
      }
      continue
    }

    if (tag === "g") {
      if (sawGroup) breach("only one group is allowed")
      sawGroup = true
      insideGroup = true
      if (attributes.fill !== "none") breach('the group must set fill="none"')
      if (!attributes.stroke || attributes.stroke === "none") breach("the group must set a stroke")
      if (numberOf(attributes["stroke-width"]) !== GROUP_STROKE_WIDTH) {
        breach(`the group must set stroke-width ${GROUP_STROKE_WIDTH}`)
      }
      if (attributes["stroke-linecap"] !== "round")
        breach('the group must set stroke-linecap="round"')
      if (attributes["stroke-linejoin"] !== "round") {
        breach('the group must set stroke-linejoin="round"')
      }
      continue
    }

    // path, ellipse or circle
    if (!insideGroup || groupClosed) {
      breach(`<${tag}> must sit inside the group`)
      continue
    }
    const where = `<${tag}> number ${elements.length + 1}`
    let width = GROUP_STROKE_WIDTH
    if (attributes["stroke-width"] !== undefined) {
      const own = numberOf(attributes["stroke-width"])
      if (
        own === null ||
        own < DMH_DRAWING_STROKE_RANGE.min ||
        own > DMH_DRAWING_STROKE_RANGE.max
      ) {
        breach(
          `${where}: stroke-width ${attributes["stroke-width"]} is outside ${DMH_DRAWING_STROKE_RANGE.min} to ${DMH_DRAWING_STROKE_RANGE.max}`,
        )
        continue
      }
      width = own
    }

    if (tag === "path") {
      const d = (attributes.d ?? "").replace(/\s+/g, " ").trim()
      if (!PATH_DATA.test(d)) {
        breach(`${where}: d is not path data`)
        continue
      }
      elements.push({ kind: "path", d, width })
      continue
    }

    const cx = numberOf(attributes.cx)
    const cy = numberOf(attributes.cy)
    if (cx === null || cy === null) {
      breach(`${where}: cx and cy must be numbers`)
      continue
    }

    if (tag === "circle") {
      const r = numberOf(attributes.r)
      if (r === null || r <= 0) {
        breach(`${where}: r must be a positive number`)
        continue
      }
      if (attributes.transform !== undefined) {
        breach(`${where}: a circle takes no transform`)
        continue
      }
      elements.push({ kind: "circle", cx, cy, r, width })
      continue
    }

    const rx = numberOf(attributes.rx)
    const ry = numberOf(attributes.ry)
    if (rx === null || ry === null || rx <= 0 || ry <= 0) {
      breach(`${where}: rx and ry must be positive numbers`)
      continue
    }
    const element = { kind: "ellipse", cx, cy, rx, ry, width }
    if (attributes.transform !== undefined) {
      const rotate = ROTATE.exec(attributes.transform)
      if (!rotate) {
        breach(`${where}: the only transform allowed is rotate(angle cx cy)`)
        continue
      }
      element.rotate = [Number(rotate[1]), Number(rotate[2]), Number(rotate[3])]
    }
    elements.push(element)
  }

  if (!sawSvg) breach("no svg root")
  if (!sawGroup) breach("no drawing group")
  if (sawGroup && elements.length === 0 && findings.length === 0)
    breach("the group holds no element")
  return { elements, findings }
}

function elementText(element) {
  const text = (value) => JSON.stringify(value)
  if (element.kind === "path") {
    return `{ kind: "path", d: ${text(element.d)}, width: ${element.width} }`
  }
  if (element.kind === "circle") {
    return `{ kind: "circle", cx: ${element.cx}, cy: ${element.cy}, r: ${element.r}, width: ${element.width} }`
  }
  const rotate = element.rotate ? `, rotate: [${element.rotate.join(", ")}]` : ""
  return `{ kind: "ellipse", cx: ${element.cx}, cy: ${element.cy}, rx: ${element.rx}, ry: ${element.ry}, width: ${element.width}${rotate} }`
}

function moduleText(drawings) {
  const entries = Object.keys(drawings)
    .sort()
    .map((code) => {
      const lines = drawings[code].map((element) => `      ${elementText(element)},`)
      return `  ${code}: {\n    elements: [\n${lines.join("\n")}\n    ],\n  },`
    })
  return `// Generated by mobile/scripts/build-dmh-drawings.mjs from the SVG sources of phase 32
// (procedure in docs/specs/dmh-guide-content-v1.md section 9). Do not edit by hand: edit the SVG
// and run the script again, then Prettier. The fifteen original line drawings of the association,
// one per IBP group, as vector element data. The data carries no colour: DmhDrawing draws the
// strokes in the theme's ink. Checked by src/__checks__/dmh-drawings.test.ts.

import type { DmhGroupCode } from "@cortege/ibp-domain"

/** Every drawing uses this frame; the converter refuses another. */
export const DMH_DRAWING_FRAME = { width: ${FRAME.width}, height: ${FRAME.height} } as const

/** The stroke weights of the approved style, in frame units. */
export const DMH_DRAWING_STROKE_RANGE = {
  min: ${DMH_DRAWING_STROKE_RANGE.min},
  max: ${DMH_DRAWING_STROKE_RANGE.max},
} as const

/** The data of one drawing, as UTF-8 bytes of its compact JSON text. */
export const DMH_DRAWING_MAX_BYTES = 12 * 1024

/** The whole module file. */
export const DMH_DRAWINGS_BUDGET_BYTES = 120 * 1024

export type DmhDrawingElement =
  | { kind: "path"; d: string; width: number }
  | {
      kind: "ellipse"
      cx: number
      cy: number
      rx: number
      ry: number
      width: number
      /** Angle, then the centre of the rotation, as in rotate(angle cx cy). */
      rotate?: readonly [number, number, number]
    }
  | { kind: "circle"; cx: number; cy: number; r: number; width: number }

export type DmhDrawingData = { elements: readonly DmhDrawingElement[] }

/** Partial on purpose: a group without data renders nothing. */
export const DMH_DRAWINGS: Readonly<Partial<Record<DmhGroupCode, DmhDrawingData>>> = {
${entries.join("\n")}
}

export function drawingFor(code: DmhGroupCode): DmhDrawingData | null {
  return DMH_DRAWINGS[code] ?? null
}
`
}

function main() {
  const folder = process.argv[2]
  if (!folder) {
    console.error("usage: node mobile/scripts/build-dmh-drawings.mjs <folder of SVG sources>")
    process.exit(2)
  }
  const lines = []
  const drawings = {}
  const seen = new Map()
  const files = readdirSync(folder)
    .filter((name) => /^dmh_\d{2}-.+\.svg$/.test(name))
    .sort()
  for (const file of files) {
    const code = file.slice(0, 6)
    seen.set(code, (seen.get(code) ?? 0) + 1)
    if (seen.get(code) > 1) continue
    const { elements, findings } = convertSource(file, readFileSync(join(folder, file), "utf8"))
    lines.push(...findings)
    const bytes = Buffer.byteLength(JSON.stringify({ elements }))
    if (bytes > DRAWING_MAX_BYTES)
      lines.push(`budget: ${file}: ${bytes} bytes exceed ${DRAWING_MAX_BYTES}`)
    drawings[code] = elements
  }
  const missing = []
  for (let n = 1; n <= GROUP_COUNT; n += 1) {
    const code = `dmh_${String(n).padStart(2, "0")}`
    if (!seen.has(code)) missing.push(code)
  }
  if (missing.length > 0) lines.push(`missing: ${missing.join(", ")}`)
  for (const [code, count] of seen) if (count > 1) lines.push(`duplicate: ${code}`)
  for (const code of Object.keys(drawings)) {
    if (!/^dmh_(0[1-9]|1[0-5])$/.test(code)) lines.push(`style: ${code}: not a group code`)
  }

  if (lines.length > 0) {
    for (const line of lines) console.log(line)
    process.exit(1)
  }
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, moduleText(drawings))
  for (const code of Object.keys(drawings).sort()) {
    const elements = drawings[code]
    const bytes = Buffer.byteLength(JSON.stringify({ elements }))
    console.log(`${code}: ${elements.length} elements, ${bytes} bytes`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
