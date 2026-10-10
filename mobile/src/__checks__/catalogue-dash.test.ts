import fs from "fs"
import os from "os"
import path from "path"
import ts from "typescript"

import { fr } from "../i18n"

// Phase 12.2-21 em dash gate. The owner forbids the em dash in user-facing French text (owner
// acceptance OA-03: a comma, a colon, parentheses or two sentences instead). Every token of the
// code is read through the TypeScript parser, so comments (line, block and JSX comments) never
// count, while string literals, template literals and JSX text do. The character is written here
// as an escape so this file stays clean too.
//
// No file is exempt: the PDF catalogue (`survey-export.ts`) follows the same rule since phase 25.1
// (D-08), its "unknown" cell reads "Non renseign\u00e9".

const EM_DASH = "\u2014"

type Finding = { file: string; line: number }

/**
 * The leaf tokens of a source file. Comments are trivia, so they are never a leaf's text; the
 * parser does attach doc comments as JSDoc nodes, which are skipped.
 */
function leaves(source: ts.SourceFile): ts.Node[] {
  const found: ts.Node[] = []
  const visit = (node: ts.Node) => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) {
      return
    }
    const children = node.getChildren(source)
    if (children.length === 0) found.push(node)
    else children.forEach(visit)
  }
  visit(source)
  return found
}

/** Every em dash left in the code of `files`, comments stripped, with its 1-based line. */
function findEmDash(files: string[]): Finding[] {
  return files.flatMap((file) => {
    const text = fs.readFileSync(file, "utf8")
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    return leaves(source).flatMap((leaf) => {
      const start = leaf.getStart(source)
      const tokenText = leaf.getText(source)
      const lines: Finding[] = []
      for (let index = tokenText.indexOf(EM_DASH); index >= 0; ) {
        lines.push({ file, line: source.getLineAndCharacterOfPosition(start + index).line + 1 })
        index = tokenText.indexOf(EM_DASH, index + 1)
      }
      return lines
    })
  })
}

const SRC_ROOT = path.resolve(__dirname, "..")
const CHECKS_DIR = path.join(SRC_ROOT, "__checks__")
const CATALOGUE_ROOT = path.join(SRC_ROOT, "i18n", "fr")

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
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "catalogue-dash-"))
})

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
})

describe("findEmDash", () => {
  it("reports an em dash inside a string literal, with its line", () => {
    const file = writeFixture(
      "fr/area.ts",
      ["export const area = {", `  title: "Relevés ${EM_DASH} brouillons",`, "}", ""].join("\n"),
    )

    expect(findEmDash([file])).toEqual([{ file, line: 2 }])
  })

  it("reports template literals and JSX text, once per dash", () => {
    const file = writeFixture(
      "screen.tsx",
      [
        "const label = (n: number) => `${n} " + EM_DASH + " " + EM_DASH + "`",
        "export const A = () => <Text>Score " + EM_DASH + " IBP</Text>",
        "const b = `a ${label(1)}",
        EM_DASH + " b`",
        "",
      ].join("\n"),
    )

    expect(findEmDash([file]).map(({ line }) => line)).toEqual([1, 1, 2, 4])
  })

  it("ignores an em dash in line, block and JSX comments", () => {
    const file = writeFixture(
      "fr/comments.tsx",
      [
        `// HOME-01: a plain title ${EM_DASH} see ListHero.tsx`,
        `/* block ${EM_DASH} comment */`,
        `/** Doc comment ${EM_DASH} parsed as JSDoc. */`,
        "export const area = {",
        `  title: "Mes relevés", // trailing ${EM_DASH} note`,
        "}",
        `export const A = () => <View>{/* JSX ${EM_DASH} comment */}</View>`,
        'export const url = "https://example.org"',
        "",
      ].join("\n"),
    )

    expect(findEmDash([file])).toEqual([])
  })
})

describe("em dash gate on mobile/src", () => {
  it("leaves the last two placeholders as words (UI-SPEC: text value placeholder)", () => {
    expect(fr.components.ibpScoreBadge.noScore).toBe("Non renseigné")
    expect(fr.components.ibpFactorBars.notFilled).toBe("Non renseigné")
  })

  it("has no em dash in the French catalogue", () => {
    const files = sourceFiles(CATALOGUE_ROOT)
    expect(files.length).toBeGreaterThan(30)
    expect(files.some((file) => file.endsWith(path.join("status", "sync.ts")))).toBe(true)
    expect(files.some((file) => file.endsWith("survey-export.ts"))).toBe(true)
    expect(findEmDash(files)).toEqual([])
  })

  it("has no em dash in any string or JSX text of the app code either", () => {
    const files = sourceFiles(SRC_ROOT)
    expect(files.length).toBeGreaterThan(200)
    expect(findEmDash(files)).toEqual([])
  })
})
