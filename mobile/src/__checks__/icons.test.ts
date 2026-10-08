import fs from "fs"
import os from "os"
import path from "path"

// Phase 12.2 icon gate (D-07): `@expo/vector-icons` stays the only icon library and every Ionicons
// glyph the app names is an outline variant (`-outline`), so the whole app draws one stroke style.
// The native iOS tab bar's SF Symbols and the Android PNG tab icons are not Ionicons and are not
// scanned. The finder reads source text (comments stripped) and collects glyph names from:
// 1. the `name` of every `<Ionicons>` element, `name="x"` or string literals inside `name={...}`;
// 2. the `icon`, `leadingIcon` and `trailingIcon` JSX attributes, the same two forms;
// 3. object properties `icon: "x"`;
// 4. in files naming `Ionicons.glyphMap` (or an alias of its key type): string values of a
//    `Record<_, glyph>`, keys of a `Record<glyph, _>` (the native SF Symbol map of `GlassButton`)
//    and a variable typed as a glyph and initialised with a literal.
// A glyph is reported when it does not end with `-outline`.

type IconFinding = { file: string; glyph: string }
type Hit = { index: number; glyph: string }

const OUTLINE_SUFFIX = "-outline"
/** Glyph-shaped strings only: a colour such as "#D2E8A8" under an `icon` key is not a glyph. */
const GLYPH_SHAPE = /^[a-z][a-z0-9-]*$/
const ICON_PROPS = ["icon", "leadingIcon", "trailingIcon"]

/** Removes block comments and `//` line comments (a `//` after a colon, as in a URL, is kept). */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/(^|[^:\\])\/\/.*$/gm, "$1")
}

/** Index of the `}` closing the `{` at `open`, or the end of the text. */
function closingBrace(text: string, open: number): number {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1
    if (text[index] === "}") {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return text.length - 1
}

/**
 * String literals of an expression that can be its value: an operand of a comparison
 * (`kind === "unavailable" ? ...`) is a condition, not a glyph.
 */
function stringLiterals(text: string, offset: number): Hit[] {
  return [...text.matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)]
    .filter((match) => {
      const start = match.index ?? 0
      const before = text.slice(0, start).trimEnd()
      const after = text.slice(start + match[0].length).trimStart()
      return !/[=!]=$/.test(before) && !/^[=!]=/.test(after)
    })
    .map((match) => ({ index: offset + (match.index ?? 0), glyph: match[1] ?? match[2] }))
}

/** Glyphs of a JSX attribute value starting at `start`: `"x"` or every literal inside `{...}`. */
function attributeValue(text: string, start: number): Hit[] {
  if (text[start] === "{") {
    const end = closingBrace(text, start)
    return stringLiterals(text.slice(start, end + 1), start)
  }
  const quoted = /^"([^"]*)"|^'([^']*)'/.exec(text.slice(start))
  return quoted ? [{ index: start, glyph: quoted[1] ?? quoted[2] }] : []
}

/** The opening `<Ionicons ...>` tags, each up to its closing `>` outside braces. */
function ioniconsTags(text: string): { start: number; tag: string }[] {
  const tags: { start: number; tag: string }[] = []
  for (const match of text.matchAll(/<Ionicons\b/g)) {
    const start = match.index ?? 0
    let depth = 0
    let end = start
    for (; end < text.length; end += 1) {
      if (text[end] === "{") depth += 1
      if (text[end] === "}") depth -= 1
      if (text[end] === ">" && depth === 0) break
    }
    tags.push({ start, tag: text.slice(start, end + 1) })
  }
  return tags
}

function ioniconsNames(text: string): Hit[] {
  return ioniconsTags(text).flatMap(({ start, tag }) =>
    [...tag.matchAll(/\bname=/g)].flatMap((match) =>
      attributeValue(text, start + (match.index ?? 0) + match[0].length),
    ),
  )
}

function iconAttributes(text: string): Hit[] {
  const pattern = new RegExp(`(?<![\\w.])(?:${ICON_PROPS.join("|")})=`, "g")
  return [...text.matchAll(pattern)].flatMap((match) =>
    attributeValue(text, (match.index ?? 0) + match[0].length),
  )
}

/** A hit for a match ending with a quoted literal, placed at the literal's opening quote. */
function quotedHit(match: RegExpMatchArray, offset = 0): Hit {
  const glyph = match[1] ?? match[2]
  return { index: offset + (match.index ?? 0) + match[0].length - glyph.length - 2, glyph }
}

function iconProperties(text: string): Hit[] {
  return [...text.matchAll(/(?<![\w.])icon:\s*(?:"([^"\n]*)"|'([^'\n]*)')/g)].map((match) =>
    quotedHit(match),
  )
}

/** `keyof typeof Ionicons.glyphMap` and every type alias of it declared in the file. */
function glyphTypePattern(text: string): string {
  const aliases = [...text.matchAll(/type\s+(\w+)\s*=\s*keyof\s+typeof\s+Ionicons\.glyphMap\b/g)]
  return [String.raw`keyof\s+typeof\s+Ionicons\.glyphMap`, ...aliases.map((match) => match[1])]
    .map((alternative) => `(?:${alternative})`)
    .join("|")
}

function objectBody(text: string, match: RegExpMatchArray): { body: string; offset: number } {
  const open = (match.index ?? 0) + match[0].length - 1
  return { body: text.slice(open, closingBrace(text, open) + 1), offset: open }
}

function glyphMapLiterals(text: string): Hit[] {
  if (!/Ionicons\.glyphMap\b/.test(text)) return []
  const glyph = `(?:${glyphTypePattern(text)})`
  const valueRecord = new RegExp(
    String.raw`:\s*(?:Partial<\s*)?Record<\s*[^,<>]+,\s*${glyph}\s*>\s*>?\s*=\s*\{`,
    "g",
  )
  const keyRecord = new RegExp(
    String.raw`:\s*(?:Partial<\s*)?Record<\s*${glyph}\s*,\s*[^<>]+>\s*>?\s*=\s*\{`,
    "g",
  )
  const variable = new RegExp(String.raw`:\s*${glyph}\s*=\s*(?:"([^"\n]*)"|'([^'\n]*)')`, "g")
  const values = [...text.matchAll(valueRecord)].flatMap((match) => {
    const { body, offset } = objectBody(text, match)
    return [...body.matchAll(/:\s*(?:"([^"\n]*)"|'([^'\n]*)')/g)].map((value) =>
      quotedHit(value, offset),
    )
  })
  const keys = [...text.matchAll(keyRecord)].flatMap((match) => {
    const { body, offset } = objectBody(text, match)
    return [...body.matchAll(/[{,]\s*(?:"([^"\n]+)"|'([^'\n]+)'|([A-Za-z_$][\w$]*))\s*:/g)].map(
      (key) => ({ index: offset + (key.index ?? 0), glyph: key[1] ?? key[2] ?? key[3] }),
    )
  })
  const variables = [...text.matchAll(variable)].map((match) => quotedHit(match))
  return [...values, ...keys, ...variables]
}

function findNonOutlineIcons(files: string[]): IconFinding[] {
  return files.flatMap((file) => {
    const text = stripComments(fs.readFileSync(file, "utf8"))
    const hits = [
      ...ioniconsNames(text),
      ...iconAttributes(text),
      ...iconProperties(text),
      ...glyphMapLiterals(text),
    ]
    const seen = new Set<number>()
    return hits
      .filter(({ glyph }) => GLYPH_SHAPE.test(glyph) && !glyph.endsWith(OUTLINE_SUFFIX))
      .sort((a, b) => a.index - b.index)
      .filter(({ index }) => !seen.has(index) && Boolean(seen.add(index)))
      .map(({ glyph }) => ({ file, glyph }))
  })
}

const SRC_ROOT = path.resolve(__dirname, "..")
const CHECKS_DIR = path.join(SRC_ROOT, "__checks__")

function sourceFiles(target: string): string[] {
  if (fs.statSync(target).isFile()) return [target]
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(target, entry.name)
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
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "icon-gate-"))
})

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
})

describe("findNonOutlineIcons", () => {
  it("reports a filled Ionicons name and accepts its outline variant", () => {
    const filled = writeFixture(
      "src/ui/Close.tsx",
      'export const A = () => <Ionicons name="close" size={20} color="red" />\n',
    )
    const outline = writeFixture(
      "src/ui/CloseOutline.tsx",
      'export const A = () => <Ionicons name="close-outline" size={20} color="red" />\n',
    )

    expect(findNonOutlineIcons([filled, outline])).toEqual([{ file: filled, glyph: "close" }])
  })

  it("reports both literals of a ternary name and accepts outline ones", () => {
    const filled = writeFixture(
      "src/screens/Pager.tsx",
      [
        "export const P = ({ done }: { done: boolean }) => (",
        "  <Ionicons",
        '    name={done ? "checkmark" : "arrow-forward"}',
        "    size={20}",
        "    style={{ marginLeft: done ? 4 : 0 }}",
        "  />",
        ")",
      ].join("\n"),
    )
    const outline = writeFixture(
      "src/screens/PagerOutline.tsx",
      'export const P = ({ done }) => <Ionicons name={done ? "checkmark-outline" : "arrow-forward-outline"} />\n',
    )

    expect(findNonOutlineIcons([filled, outline])).toEqual([
      { file: filled, glyph: "checkmark" },
      { file: filled, glyph: "arrow-forward" },
    ])
  })

  it("reports icon properties and attributes, not colours, conditions or outline names", () => {
    const file = writeFixture(
      "src/screens/Rows.tsx",
      [
        'export const rows = [{ icon: "mail", label: x }, { icon: "key-outline" }]',
        'export const tokens = { icon: "#D2E8A8" }',
        'export const B = () => <AppButton leadingIcon="add" label={l} />',
        'export const C = () => <AppNotice icon={ok ? "checkmark-circle-outline" : "alert-circle"} />',
        'export const D = () => <Chip trailingIcon="chevron-forward-outline" />',
        'export const E = () => <Ionicons name={kind === "unavailable" ? "image-outline" : "x-outline"} />',
        'export const F = () => <AppNotice icon={"success" !== tone ? "flag-outline" : "leaf"} />',
      ].join("\n"),
    )

    expect(findNonOutlineIcons([file])).toEqual([
      { file, glyph: "mail" },
      { file, glyph: "add" },
      { file, glyph: "alert-circle" },
      { file, glyph: "leaf" },
    ])
  })

  it("ignores names of other elements and glyphs written in comments", () => {
    const file = writeFixture(
      "src/navigation/Tabs.tsx",
      [
        '// <Ionicons name="close" /> was the old glyph',
        '/** e.g. `icon: "mail"` */',
        'export const T = () => <Tab.Screen name="home" options={{ title: "x" }} />',
        'export const url = "https://example.org/icon"',
      ].join("\n"),
    )

    expect(findNonOutlineIcons([file])).toEqual([])
  })

  it("reads glyph maps typed with the glyph map key, values and keys", () => {
    const file = writeFixture(
      "src/ui/maps.ts",
      [
        "type IoniconName = keyof typeof Ionicons.glyphMap",
        "const ICONS: Record<Key, keyof typeof Ionicons.glyphMap> = {",
        '  home: "home",',
        '  list: "list-outline",',
        "}",
        "const SYMBOLS: Partial<Record<IoniconName, string>> = {",
        '  checkmark: "checkmark",',
        '  "arrow-forward-outline": "arrow.right",',
        "}",
        'const FALLBACK: IoniconName = "leaf"',
        'const LABELS: Record<Key, string> = { home: "Accueil" }',
      ].join("\n"),
    )

    expect(findNonOutlineIcons([file])).toEqual([
      { file, glyph: "home" },
      { file, glyph: "checkmark" },
      { file, glyph: "leaf" },
    ])
  })
})

describe("icon gate on mobile/src (D-07)", () => {
  const files = sourceFiles(SRC_ROOT)

  it("scans a real set of source files", () => {
    expect(files.length).toBeGreaterThan(200)
  })

  it("names outline Ionicons glyphs only", () => {
    expect(findNonOutlineIcons(files)).toEqual([])
  })
})
