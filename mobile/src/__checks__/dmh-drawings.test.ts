import fs from "fs"
import path from "path"
import { DMH_GROUP_CODES } from "@cortege/ibp-domain"
import { fr } from "../i18n"
import {
  DMH_DRAWING_MAX_BYTES,
  DMH_DRAWING_STROKE_RANGE,
  DMH_DRAWINGS,
  DMH_DRAWINGS_BUDGET_BYTES,
} from "../app/dmh-guide/drawings"

// Phase 32 drawings gate (plan 32-04, D-06 and D-11): the fifteen line drawings are vector element
// data in a generated module. The build fails when a group has no drawing, a key is not a group
// code, a stroke width leaves the approved range, an element would not render, a drawing or the
// module is over its budget, or the module holds a colour (the ink comes from the theme).

type LooseElement = Record<string, unknown>
type LooseDrawing = { elements: LooseElement[] }

type GateInput = {
  drawings: Record<string, LooseDrawing>
  moduleText: string
  moduleBytes: number
}

/** The same path-data rule as the converter: starts with M or m, then commands and numbers only. */
const PATH_DATA = /^[Mm][MLHVCSQTAZmlhvcsqtaz0-9+\-.,\s]*$/

const isPositive = (value: unknown): boolean =>
  typeof value === "number" && Number.isFinite(value) && value > 0

const isFinite = (value: unknown): boolean => typeof value === "number" && Number.isFinite(value)

/** A hex colour, a colour function, or a key named like a colour in the module text. */
const COLOUR_PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\b(?:rgb|rgba|hsl|hsla)\s*\(/i,
  /\b(?:stroke|fill|color)\s*:/,
]

function checkElement(code: string, index: number, element: LooseElement): string[] {
  const findings: string[] = []
  const where = `${code} element ${index + 1}`
  const width = element["width"]
  if (
    typeof width !== "number" ||
    width < DMH_DRAWING_STROKE_RANGE.min ||
    width > DMH_DRAWING_STROKE_RANGE.max
  ) {
    findings.push(
      `${where}: width ${String(width)} is outside ${DMH_DRAWING_STROKE_RANGE.min} to ${DMH_DRAWING_STROKE_RANGE.max}`,
    )
  }
  if (element["kind"] === "path") {
    const d = element["d"]
    if (typeof d !== "string" || !PATH_DATA.test(d)) findings.push(`${where}: d is not path data`)
  } else if (element["kind"] === "ellipse") {
    if (!isFinite(element["cx"]) || !isFinite(element["cy"])) {
      findings.push(`${where}: cx and cy must be numbers`)
    }
    if (!isPositive(element["rx"]) || !isPositive(element["ry"])) {
      findings.push(`${where}: rx and ry must be positive`)
    }
  } else if (element["kind"] === "circle") {
    if (!isFinite(element["cx"]) || !isFinite(element["cy"])) {
      findings.push(`${where}: cx and cy must be numbers`)
    }
    if (!isPositive(element["r"])) findings.push(`${where}: r must be positive`)
  } else {
    findings.push(`${where}: unknown kind`)
  }
  return findings
}

export function checkDmhDrawings({ drawings, moduleText, moduleBytes }: GateInput): string[] {
  const findings: string[] = []
  const codes: readonly string[] = DMH_GROUP_CODES
  for (const code of codes) {
    if (!(code in drawings)) findings.push(`missing drawing: ${code}`)
  }
  for (const [code, drawing] of Object.entries(drawings)) {
    if (!codes.includes(code)) {
      findings.push(`key is not a group code: ${code}`)
      continue
    }
    drawing.elements.forEach((element, index) => {
      findings.push(...checkElement(code, index, element))
    })
    const bytes = Buffer.byteLength(JSON.stringify(drawing))
    if (bytes > DMH_DRAWING_MAX_BYTES) {
      findings.push(`${code}: ${bytes} bytes exceed ${DMH_DRAWING_MAX_BYTES}`)
    }
  }
  if (moduleBytes > DMH_DRAWINGS_BUDGET_BYTES) {
    findings.push(`module: ${moduleBytes} bytes exceed ${DMH_DRAWINGS_BUDGET_BYTES}`)
  }
  if (COLOUR_PATTERNS.some((pattern) => pattern.test(moduleText))) {
    findings.push("module holds a colour")
  }
  return findings
}

const validDrawing = (): LooseDrawing => ({
  elements: [
    { kind: "path", d: "M0 0 L10 10 h0.1", width: 6 },
    { kind: "ellipse", cx: 10, cy: 10, rx: 4, ry: 2, width: 4, rotate: [-8, 10, 10] },
    { kind: "circle", cx: 5, cy: 5, r: 3, width: 12 },
  ],
})

function validInput(): GateInput {
  const drawings: Record<string, LooseDrawing> = {}
  for (const code of DMH_GROUP_CODES) drawings[code] = validDrawing()
  return { drawings, moduleText: "export const x = 1\n", moduleBytes: 1000 }
}

function withElement(element: LooseElement): GateInput {
  const input = validInput()
  input.drawings["dmh_03"] = { elements: [element] }
  return input
}

describe("checkDmhDrawings on fixtures", () => {
  test("a complete valid set has no finding", () => {
    expect(checkDmhDrawings(validInput())).toEqual([])
  })

  test("a group without a drawing is one finding", () => {
    const input = validInput()
    delete input.drawings["dmh_07"]
    expect(checkDmhDrawings(input)).toEqual(["missing drawing: dmh_07"])
  })

  test("a key that is not a group code is one finding", () => {
    const input = validInput()
    input.drawings["dmh_16"] = validDrawing()
    expect(checkDmhDrawings(input)).toEqual(["key is not a group code: dmh_16"])
  })

  test.each([3, 14])("a stroke width of %i is one finding", (width) => {
    const findings = checkDmhDrawings(withElement({ kind: "path", d: "M0 0 L1 1", width }))
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain("outside 4 to 12")
  })

  test.each([
    ["an empty string", ""],
    ["a start that is not a move", "10 10 L5 5"],
    ["a letter that is not a path command", "M0 0 X5 5"],
  ])("a path whose d is %s is one finding", (_name, d) => {
    const findings = checkDmhDrawings(withElement({ kind: "path", d, width: 6 }))
    expect(findings).toEqual(["dmh_03 element 1: d is not path data"])
  })

  test("an ellipse with a radius of zero is one finding", () => {
    const findings = checkDmhDrawings(
      withElement({ kind: "ellipse", cx: 1, cy: 1, rx: 0, ry: 2, width: 6 }),
    )
    expect(findings).toEqual(["dmh_03 element 1: rx and ry must be positive"])
  })

  test("a circle with a radius of zero is one finding", () => {
    const findings = checkDmhDrawings(withElement({ kind: "circle", cx: 1, cy: 1, r: 0, width: 6 }))
    expect(findings).toEqual(["dmh_03 element 1: r must be positive"])
  })

  test("a drawing over the per-drawing budget is one finding", () => {
    const input = validInput()
    const filler = "M0 0 L1 1 ".repeat(Math.ceil(DMH_DRAWING_MAX_BYTES / 10))
    input.drawings["dmh_05"] = { elements: [{ kind: "path", d: filler.trim(), width: 6 }] }
    const findings = checkDmhDrawings(input)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain("dmh_05")
    expect(findings[0]).toContain("exceed")
  })

  test("a module over the module budget is one finding", () => {
    const input = validInput()
    input.moduleBytes = DMH_DRAWINGS_BUDGET_BYTES + 1
    const findings = checkDmhDrawings(input)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain("module")
  })

  // The colour fixtures are assembled from pieces so this file holds no colour literal itself.
  test.each([
    ["a hex colour", ["#", "ff", "00", "00"].join("")],
    ["an rgba call", ["rg", "ba(", "0, 0, 0, 1)"].join("")],
    ["an hsl call", ["hs", "l(", "10, 20%, 30%)"].join("")],
    ["a key named stroke", ["str", "oke", ": 1"].join("")],
    ["a key named fill", ["fi", "ll", ": 1"].join("")],
    ["a key named color", ["col", "or", ": 1"].join("")],
  ])("a module holding %s is one finding", (_name, text) => {
    const input = validInput()
    input.moduleText = `export const x = { ${text} }\n`
    expect(checkDmhDrawings(input)).toEqual(["module holds a colour"])
  })
})

describe("the real drawings module", () => {
  test("the fifteen dendromicrohabitat drawings are complete and stay within budget", () => {
    const file = path.join(__dirname, "../app/dmh-guide/drawings.ts")
    const findings = checkDmhDrawings({
      drawings: DMH_DRAWINGS as unknown as Record<string, LooseDrawing>,
      moduleText: fs.readFileSync(file, "utf8"),
      moduleBytes: fs.statSync(file).size,
    })
    expect(findings).toEqual([])
    expect(Object.keys(DMH_DRAWINGS)).toHaveLength(15)
  })

  test("every drawing has an alt sentence", () => {
    const groups: Record<string, { illustrationAlt?: unknown }> = fr.dmhGuide.groups
    const codes = Object.keys(DMH_DRAWINGS)
    expect(codes.length).toBeGreaterThan(0)
    for (const code of codes) {
      const alt = groups[code]?.illustrationAlt
      expect(typeof alt).toBe("string")
      expect(alt as string).toMatch(/\S/)
      expect(alt as string).toMatch(/\.$/)
      expect(alt as string).not.toMatch(/dmh_\d+/)
    }
  })
})
