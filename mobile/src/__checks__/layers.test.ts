import fs from "fs"
import os from "os"
import path from "path"
import ts from "typescript"

// Phase 12.2-17 layering gates (owner, iPhone: "on voit la couche plate d'en dessous dépasser de ta
// couche effet glass"). RN 0.86 draws a view's layers in ways that do not always agree, so a style
// can make a flat base layer show past the gradient or glass layer on top of it. Each finder takes
// file paths and returns the style objects that break its rule.
//
// bordered-gradient: RN sizes `experimental_backgroundImage` to the padding box and tiles it
// (`background-repeat: repeat`, `background-origin: padding-box`, see
// `RCTViewComponentView.mm` and `RCTBackgroundImageUtils.mm`), so a border ring around a gradient
// shows the opposite edge of the gradient under the hairline: a flat, darker or lighter ring around
// the card. A hairline on a gradient view is an inset ring (`buildInsetRing`) instead.
//
// border-curve: on iOS only the layers RN shapes through `CALayer.cornerRadius` (the background
// colour, the gradient, a Core Animation border) follow `borderCurve`. Box shadows (outset and
// inset, `RCTBoxShadow.mm`), a translucent hairline drawn as an image (`RCTBorderDrawing.m`), the
// overflow clip of a view with a shadow (its container layer) and the mask of an image are built
// with circular arcs (`RCTPathCreateWithRoundedRect`). A `borderCurve: "continuous"` card with a
// hairline or a shadow therefore draws two different corner shapes, and the flat fill shows past
// the hairline at the corners. Every surface keeps circular corners, so all its layers agree.

type Finding = { file: string; line: number; rule: string }

const BORDER_WIDTH = /^border(Top|Bottom|Left|Right|Start|End)?Width$/

function propertyNames(node: ts.ObjectLiteralExpression): string[] {
  return node.properties.flatMap((property) => {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
      return []
    }
    const name = property.name
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return [name.text]
    return []
  })
}

function findInObjects(
  files: string[],
  rule: string,
  breaks: (names: string[]) => boolean,
): Finding[] {
  return files.flatMap((file) => {
    const text = fs.readFileSync(file, "utf8")
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const findings: Finding[] = []
    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node) && breaks(propertyNames(node))) {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
        findings.push({ file, line, rule })
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    return findings
  })
}

function findBorderedGradients(files: string[]): Finding[] {
  return findInObjects(
    files,
    "bordered-gradient",
    (names) =>
      names.includes("experimental_backgroundImage") &&
      names.some((name) => BORDER_WIDTH.test(name)),
  )
}

function findBorderCurves(files: string[]): Finding[] {
  return findInObjects(files, "border-curve", (names) => names.includes("borderCurve"))
}

const SRC_ROOT = path.resolve(__dirname, "..")
const CHECKS_DIR = path.join(SRC_ROOT, "__checks__")

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return full === CHECKS_DIR ? [] : sourceFiles(full)
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return []
    return [full]
  })
}

let fixtureRoot = ""

function writeFixture(relativePath: string, content: string): string {
  const filePath = path.join(fixtureRoot, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  return filePath
}

beforeEach(() => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "layer-gates-"))
})

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
})

describe("findBorderedGradients", () => {
  it("flags a style object with a gradient and a border width", () => {
    const file = writeFixture(
      "card.tsx",
      [
        "const styles = {",
        "  clip: {",
        "    experimental_backgroundImage: image,",
        "    borderWidth: 1,",
        "  },",
        "}",
        "",
      ].join("\n"),
    )

    expect(findBorderedGradients([file])).toEqual([{ file, line: 2, rule: "bordered-gradient" }])
  })

  it("flags a one-sided border width and a quoted key", () => {
    const file = writeFixture(
      "pill.ts",
      'const a = { "experimental_backgroundImage": image, borderTopWidth: 1 }\n',
    )

    expect(findBorderedGradients([file])).toHaveLength(1)
  })

  it("accepts a gradient with an inset ring, and a border without a gradient", () => {
    const file = writeFixture(
      "ok.tsx",
      [
        "const a = { experimental_backgroundImage: image, boxShadow: ring }",
        "const b = { borderWidth: 1, backgroundColor: fill, ...other }",
        "const c = { [key]: 1, experimental_backgroundImage: image }",
        "",
      ].join("\n"),
    )

    expect(findBorderedGradients([file])).toEqual([])
  })
})

describe("findBorderCurves", () => {
  it("flags a style object with a borderCurve, whatever its value", () => {
    const file = writeFixture(
      "card.ts",
      [
        'const a = { borderRadius: 22, borderCurve: "continuous", borderWidth: 1 }',
        'const b = { "borderCurve": "circular" }',
        "",
      ].join("\n"),
    )

    expect(findBorderCurves([file])).toEqual([
      { file, line: 1, rule: "border-curve" },
      { file, line: 2, rule: "border-curve" },
    ])
  })

  it("accepts a plain radius", () => {
    const file = writeFixture("ok.ts", "const a = { borderRadius: 22, borderWidth: 1 }\n")

    expect(findBorderCurves([file])).toEqual([])
  })
})

describe("layer gates on mobile/src", () => {
  const files = sourceFiles(SRC_ROOT)

  it("scans a real set of source files", () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it("has no border on a view that carries a gradient", () => {
    expect(findBorderedGradients(files)).toEqual([])
  })

  it("keeps circular corners on every surface (no borderCurve)", () => {
    expect(findBorderCurves(files)).toEqual([])
  })
})
