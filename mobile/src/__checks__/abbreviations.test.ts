import fs from "fs"
import os from "os"
import path from "path"
import ts from "typescript"

import { fr } from "../i18n"

// Phase 26-06 abbreviation gate (D-05, D-11). Every string, template part and JSX text of the fr
// catalogue is read through the TypeScript parser (comments and JSDoc never count, like the em dash
// gate), and an abbreviation that is neither registered in POLICY below, defined once, nor written
// out fails the test, naming the file, the line and the token. The structure gate already forces
// every user-facing string into `src/i18n`, so scanning the catalogue covers every screen.
//
// Treatments (D-11):
//   allowlist    units (ha, cm, m, km, Mo, Ko), OK, PDF, GPS and ex.: used bare everywhere
//   info         IBP: written out where `definedIn` says, explained by an info sheet on the main
//                headers (plan 26-07), not on every use
//   written-out  the long form must occur in the same catalogue file (case-insensitive, spaces and
//                apostrophes normalised); the texts live in `fr.abbreviations.terms` (D-04)
//   dev-only     shown only by `shouldShowDevTools()`: allowed in the listed files only
//
// Single capital letters (factor letters, the north arrow) are labels and are never candidates;
// shouted words ("HORS LIGNE", "10 FACTEURS") are words in capitals and are skipped.

type Treatment = "allowlist" | "info" | "written-out" | "dev-only"
type TermPolicy = { treatment: Treatment; definedIn?: string[]; files?: string[] }
type Policy = Record<string, TermPolicy>
type Reason = "unregistered" | "not-written-out" | "dev-only-outside" | "snake-case"
type Finding = { file: string; line: number; token: string; reason: Reason }
type Leaf = { text: string; line: number }
type LongForms = Record<string, string>

const POLICY: Policy = {
  ha: { treatment: "allowlist" },
  cm: { treatment: "allowlist" },
  m: { treatment: "allowlist" },
  km: { treatment: "allowlist" },
  Mo: { treatment: "allowlist" },
  Ko: { treatment: "allowlist" },
  OK: { treatment: "allowlist" },
  PDF: { treatment: "allowlist" },
  GPS: { treatment: "allowlist" },
  "ex.": { treatment: "allowlist" },
  IBP: { treatment: "info", definedIn: ["onboarding.ts", "auth-gate.ts", "survey-export.ts"] },
  BMg: { treatment: "written-out" },
  BMm: { treatment: "written-out" },
  TGB: { treatment: "written-out" },
  GB: { treatment: "written-out" },
  IGN: { treatment: "written-out" },
  GBIF: { treatment: "written-out" },
  CC0: { treatment: "written-out" },
  "CC BY": { treatment: "written-out" },
  "WGS 84": { treatment: "written-out" },
  DEV: { treatment: "dev-only", files: ["settings.ts", "auth-gate.ts"] },
  URL: { treatment: "dev-only", files: ["settings.ts", "auth-gate.ts"] },
  API: { treatment: "dev-only", files: ["settings.ts", "auth-gate.ts"] },
  IP: { treatment: "dev-only", files: ["settings.ts", "auth-gate.ts"] },
}

const WORD_CHARS = "\\p{L}\\p{N}_"

// Candidates after the policy keys are masked: a run of capitals, a mixed-case short form ("BMg"),
// a capital with digits ("S0") or a slash pair ("P/G"). A single capital letter is a label.
const CANDIDATE =
  /(?<![\p{L}\p{N}_])(?:[A-Z]{2,}[0-9]*|[A-Z][a-z]?[A-Z][A-Za-z]*|[A-Z][0-9]+|[A-Z]\/[A-Z])(?![\p{L}\p{N}_])/gu
const SNAKE_CASE = /(?<![\p{L}\p{N}_])[a-z]+_[a-z_]+(?![\p{L}\p{N}_])/gu

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u00a0\u202f\n\r\t]+/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Whole-word matchers of the policy keys, the longest key first so "CC BY" wins over "CC". */
function keyMatchers(policy: Policy): { key: string; pattern: RegExp }[] {
  return Object.keys(policy)
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .map((key) => ({
      key,
      pattern: new RegExp(`(?<![${WORD_CHARS}])${escapeRegExp(key)}(?![${WORD_CHARS}])`, "gu"),
    }))
}

/** The leaf tokens of a source file. Comments are trivia; JSDoc nodes are skipped. */
function syntaxLeaves(source: ts.SourceFile): ts.Node[] {
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

function isTextToken(node: ts.Node): boolean {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node) ||
    ts.isJsxText(node)
  )
}

/** Names, import paths and type literals are code, not text a user reads. */
function isCodeString(node: ts.Node): boolean {
  const parent = node.parent
  if (!ts.isStringLiteral(node) || !parent) return false
  if (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) return parent.name === node
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) {
    return parent.moduleSpecifier === node
  }
  return ts.isLiteralTypeNode(parent)
}

function isShouted(text: string): boolean {
  return text === text.toUpperCase() && /\p{Lu}{5,}/u.test(text)
}

/** The user text of a file: strings, template parts and JSX text, with their 1-based lines. */
function stringLeaves(file: string): Leaf[] {
  const text = fs.readFileSync(file, "utf8")
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  return syntaxLeaves(source).flatMap((node) => {
    if (!isTextToken(node) || isCodeString(node)) return []
    const value = (node as ts.StringLiteral).text
    if (value.trim() === "" || /^[a-z][a-z0-9_]*$/.test(value) || isShouted(value)) return []
    const start = ts.isJsxText(node) ? node.pos : node.getStart(source)
    return [{ text: value, line: source.getLineAndCharacterOfPosition(start).line + 1 }]
  })
}

function lineOf(leaf: Leaf, index: number): number {
  return leaf.line + (leaf.text.slice(0, index).match(/\n/g)?.length ?? 0)
}

function hasLongForm(leaves: Leaf[], longForm: string): boolean {
  const wanted = normalise(longForm)
  return leaves.some((leaf) => normalise(leaf.text).includes(wanted))
}

/**
 * Every abbreviation of `files` that is neither allowed, defined once nor written out. Policy keys
 * are masked first (judged by their treatment); what is left is matched by the candidate patterns.
 */
function findUnexplainedAbbreviations(
  files: string[],
  policy: Policy,
  longForms: LongForms,
): Finding[] {
  const matchers = keyMatchers(policy)
  return files.flatMap((file) => {
    const leaves = stringLeaves(file)
    const findings: Finding[] = []
    for (const leaf of leaves) {
      let masked = leaf.text
      for (const { key, pattern } of matchers) {
        masked = masked.replace(pattern, (match, offset: number) => {
          const rule = policy[key]
          const line = lineOf(leaf, offset)
          if (rule.treatment === "written-out") {
            if (!hasLongForm(leaves, longForms[key] ?? "")) {
              findings.push({ file, line, token: key, reason: "not-written-out" })
            }
          } else if (rule.treatment === "dev-only") {
            if (!(rule.files ?? []).includes(path.basename(file))) {
              findings.push({ file, line, token: key, reason: "dev-only-outside" })
            }
          }
          return " ".repeat(match.length)
        })
      }
      for (const match of masked.matchAll(CANDIDATE)) {
        findings.push({
          file,
          line: lineOf(leaf, match.index ?? 0),
          token: match[0],
          reason: "unregistered",
        })
      }
      for (const match of masked.matchAll(SNAKE_CASE)) {
        findings.push({
          file,
          line: lineOf(leaf, match.index ?? 0),
          token: match[0],
          reason: "snake-case",
        })
      }
    }
    return findings
  })
}

/** Info terms whose listed defining file lost the long form (or is not scanned at all). */
function findMissingDefinitions(
  files: string[],
  policy: Policy,
  longForms: LongForms,
): { term: string; file: string }[] {
  return Object.entries(policy).flatMap(([term, rule]) => {
    if (rule.treatment !== "info") return []
    return (rule.definedIn ?? []).flatMap((name) => {
      const file = files.find((candidate) => path.basename(candidate) === name)
      const defined = file !== undefined && hasLongForm(stringLeaves(file), longForms[term] ?? "")
      return defined ? [] : [{ term, file: name }]
    })
  })
}

/** Policy keys that no catalogue string uses any more: the registry shrinks by itself. */
function findUnusedTerms(files: string[], policy: Policy): string[] {
  const texts = files.flatMap((file) => stringLeaves(file).map((leaf) => leaf.text))
  return keyMatchers(policy)
    .filter(({ pattern }) => !texts.some((text) => text.search(pattern) >= 0))
    .map(({ key }) => key)
    .sort()
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
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "abbreviations-"))
})

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
})

const FIXTURE_POLICY: Policy = {
  ha: { treatment: "allowlist" },
  PDF: { treatment: "allowlist" },
  IBP: { treatment: "info", definedIn: ["intro.ts"] },
  BMg: { treatment: "written-out" },
  URL: { treatment: "dev-only", files: ["dev.ts"] },
}
const FIXTURE_LONG: LongForms = {
  IBP: "Indice de Biodiversité Potentielle",
  BMg: "bois morts de grosse dimension",
}

const run = (file: string, policy: Policy = FIXTURE_POLICY) =>
  findUnexplainedAbbreviations([file], policy, FIXTURE_LONG)

describe("findUnexplainedAbbreviations", () => {
  it("reports an unregistered abbreviation with its token and 1-based line", () => {
    const file = writeFixture(
      "fr/area.ts",
      ["export const area = {", '  title: "Le XYZ est requis",', "}", ""].join("\n"),
    )

    expect(run(file, {})).toEqual([{ file, line: 2, token: "XYZ", reason: "unregistered" }])
  })

  it("passes the allowlist, with units in parentheses", () => {
    const file = writeFixture(
      "fr/units.ts",
      ['export const a = { x: "Export PDF", y: "Surface (ha)", z: "12 ha" }', ""].join("\n"),
    )

    expect(run(file)).toEqual([])
  })

  it("passes an info term anywhere", () => {
    const file = writeFixture("fr/info.ts", 'export const a = "Votre IBP est calculé"\n')

    expect(run(file)).toEqual([])
  })

  it("fails a written-out term without its long form in the file", () => {
    const file = writeFixture("fr/w.ts", 'export const a = "Nombre de BMg"\n')

    expect(run(file)).toEqual([{ file, line: 1, token: "BMg", reason: "not-written-out" }])
  })

  it("passes a written-out term when the same string or another string of the file has it", () => {
    const same = writeFixture(
      "fr/same.ts",
      'export const a = "Bois morts de grosse dimension (BMg)"\n',
    )
    const other = writeFixture(
      "fr/other.ts",
      [
        "export const a = {",
        '  caption: "BMg",',
        "  long: `Les bois morts\u00a0de  grosse\ndimension`,",
        "}",
        "",
      ].join("\n"),
    )

    expect(run(same)).toEqual([])
    expect(run(other)).toEqual([])
  })

  it("skips shouted words but not a short code that holds digits", () => {
    const shouted = writeFixture(
      "fr/shout.ts",
      'export const a = { x: "HORS LIGNE", y: "BIENVENUE", z: "10 FACTEURS" }\n',
    )
    const code = writeFixture("fr/code.ts", 'export const a = "Datum (WGS 84)"\n')

    expect(run(shouted)).toEqual([])
    expect(run(code).map(({ token }) => token)).toEqual(["WGS"])
  })

  it("ignores comments, JSDoc, quoted property names and whole-string codes", () => {
    const file = writeFixture(
      "fr/quiet.tsx",
      [
        "// ZZZ in a line comment",
        "/* ZZZ in a block comment */",
        "/** ZZZ in a doc comment */",
        'import { x } from "./XYZ"',
        "type Level = 'VERY_LOW' | 'very_low'",
        "export const a = {",
        '  "class_score (0|2|5)": 1,',
        '  level: "very_low",',
        "}",
        "export const B = () => <View>{/* ZZZ in JSX */}</View>",
        "",
      ].join("\n"),
    )

    expect(run(file)).toEqual([])
  })

  it("reads template parts and JSX text, at the right line", () => {
    const file = writeFixture(
      "fr/parts.tsx",
      [
        "const label = (n: number) => `${n} KO ${n} et",
        "ZZ`",
        "export const A = () => <Text>",
        "  Score TMP",
        "</Text>",
        "",
      ].join("\n"),
    )

    expect(run(file).map(({ token, line }) => `${token}@${line}`)).toEqual([
      "KO@1",
      "ZZ@2",
      "TMP@4",
    ])
  })

  it("reports snake_case identifiers and slash abbreviations", () => {
    const file = writeFixture(
      "fr/leak.ts",
      ['export const a = { x: "Renseigner bmg_count", y: "P/G 12" }', ""].join("\n"),
    )

    expect(run(file)).toEqual([
      { file, line: 1, token: "bmg_count", reason: "snake-case" },
      { file, line: 1, token: "P/G", reason: "unregistered" },
    ])
  })

  it("allows a dev-only term in a listed file and reports it elsewhere", () => {
    const listed = writeFixture("fr/dev.ts", 'export const a = "URL de l\'API"\n')
    const elsewhere = writeFixture("fr/home.ts", 'export const a = "URL"\n')

    expect(run(listed).map(({ token }) => token)).toEqual(["API"])
    expect(run(elsewhere)).toEqual([
      { file: elsewhere, line: 1, token: "URL", reason: "dev-only-outside" },
    ])
  })

  it("matches whole words only and the longest key first", () => {
    const policy: Policy = { ...FIXTURE_POLICY, "CC BY": { treatment: "allowlist" } }
    const file = writeFixture("fr/words.ts", 'export const a = "Licence CC BY, haha"\n')

    expect(run(file, policy)).toEqual([])
  })
})

describe("findMissingDefinitions", () => {
  it("reports an info term whose defining file lacks the long form", () => {
    const file = writeFixture("fr/intro.ts", 'export const a = "Bienvenue dans l\'app"\n')

    expect(findMissingDefinitions([file], FIXTURE_POLICY, FIXTURE_LONG)).toEqual([
      { term: "IBP", file: "intro.ts" },
    ])
  })

  it("passes when the long form is there, and reports a file that is not scanned", () => {
    const file = writeFixture(
      "fr/intro.ts",
      'export const a = "Indice de Biodiversité Potentielle (IBP)"\n',
    )

    expect(findMissingDefinitions([file], FIXTURE_POLICY, FIXTURE_LONG)).toEqual([])
    expect(findMissingDefinitions([], FIXTURE_POLICY, FIXTURE_LONG)).toEqual([
      { term: "IBP", file: "intro.ts" },
    ])
  })
})

describe("findUnusedTerms", () => {
  it("reports a policy key that no string uses", () => {
    const file = writeFixture("fr/used.ts", 'export const a = "12 ha et un PDF"\n')

    expect(findUnusedTerms([file], FIXTURE_POLICY)).toEqual(["BMg", "IBP", "URL"])
  })
})

describe("abbreviation gate on the fr catalogue", () => {
  const files = sourceFiles(CATALOGUE_ROOT).filter(
    (file) => path.basename(file) !== "abbreviations.ts",
  )
  const longForms: LongForms = Object.fromEntries(
    Object.entries(fr.abbreviations.terms).map(([key, term]) => [key, term.long]),
  )

  it("scans the whole catalogue but not the registry itself", () => {
    expect(files.length).toBeGreaterThan(30)
    expect(files.some((file) => file.endsWith(path.join("status", "gps.ts")))).toBe(true)
    expect(files.some((file) => file.endsWith("survey-export.ts"))).toBe(true)
    expect(files.some((file) => file.endsWith("abbreviations.ts"))).toBe(false)
  })

  it("registers exactly the explained terms and the D-11 allowlist", () => {
    const explained = Object.entries(POLICY)
      .filter(([, rule]) => rule.treatment === "info" || rule.treatment === "written-out")
      .map(([key]) => key)
      .sort()
    const allowed = Object.entries(POLICY)
      .filter(([, rule]) => rule.treatment === "allowlist")
      .map(([key]) => key)
      .sort()

    expect(explained).toEqual(Object.keys(fr.abbreviations.terms).sort())
    expect(allowed).toEqual(["GPS", "Ko", "Mo", "OK", "PDF", "cm", "ex.", "ha", "km", "m"].sort())
  })

  it("keeps IBP written out where the owner wants it", () => {
    expect(findMissingDefinitions(files, POLICY, longForms)).toEqual([])
  })

  it("has no registered term that no catalogue string uses", () => {
    expect(findUnusedTerms(files, POLICY)).toEqual([])
  })

  it("has no abbreviation outside the registry", () => {
    const unexplained = [
      ...new Set(
        findUnexplainedAbbreviations(files, POLICY, longForms).map(
          ({ token, file }) =>
            `${token}@${path.relative(CATALOGUE_ROOT, file).split(path.sep).join("/")}`,
        ),
      ),
    ].sort()

    expect(unexplained).toEqual([])
  })
})
