import fs from "fs"
import path from "path"

// OA-05: iOS finds an embedded font by the PostScript name written inside the file, Android by the
// file name. The app uses one string for both, so each font file must be named after its own
// PostScript name; otherwise iOS silently shows the system font in a normal weight.

const MOBILE_ROOT = path.resolve(__dirname, "../..")
const FONTS_DIR = path.join(MOBILE_ROOT, "assets/fonts")

/** The PostScript name (name ID 6) of a TrueType font, read from its `name` table. */
function postScriptName(file: string): string {
  const data = fs.readFileSync(file)
  const tableCount = data.readUInt16BE(4)
  for (let i = 0; i < tableCount; i += 1) {
    const entry = 12 + i * 16
    if (data.toString("ascii", entry, entry + 4) !== "name") continue
    const table = data.readUInt32BE(entry + 8)
    const recordCount = data.readUInt16BE(table + 2)
    const stringsAt = table + data.readUInt16BE(table + 4)
    for (let r = 0; r < recordCount; r += 1) {
      const record = table + 6 + r * 12
      if (data.readUInt16BE(record + 6) !== 6) continue
      const platform = data.readUInt16BE(record)
      const length = data.readUInt16BE(record + 8)
      const start = stringsAt + data.readUInt16BE(record + 10)
      const raw = data.subarray(start, start + length)
      return platform === 3 || platform === 0
        ? Buffer.from(raw).swap16().toString("utf16le")
        : raw.toString("latin1")
    }
  }
  throw new Error(`no PostScript name in ${file}`)
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : []
  })
}

const fontFiles = fs.readdirSync(FONTS_DIR).filter((name) => name.endsWith(".ttf"))

describe("embedded fonts (OA-05)", () => {
  test("there are font files to check", () => {
    expect(fontFiles.length).toBeGreaterThan(0)
  })

  test.each(fontFiles)("%s is named after its own PostScript name", (name) => {
    expect(postScriptName(path.join(FONTS_DIR, name))).toBe(name.replace(/\.ttf$/, ""))
  })

  test("app.json embeds exactly the font files of assets/fonts", () => {
    const config = JSON.parse(fs.readFileSync(path.join(MOBILE_ROOT, "app.json"), "utf8")) as {
      expo: { plugins: Array<string | [string, { fonts?: string[] }]> }
    }
    const plugin = config.expo.plugins.find(
      (entry): entry is [string, { fonts?: string[] }] =>
        Array.isArray(entry) && entry[0] === "expo-font",
    )
    const listed = (plugin?.[1].fonts ?? []).map((font) => path.basename(font)).sort()
    expect(listed).toEqual([...fontFiles].sort())
  })

  test("every fontFamily the app names is an embedded font", () => {
    const embedded = new Set(fontFiles.map((name) => name.replace(/\.ttf$/, "")))
    const used = new Set<string>()
    for (const file of sourceFiles(path.join(MOBILE_ROOT, "src"))) {
      const text = fs.readFileSync(file, "utf8")
      for (const match of text.matchAll(/fontFamily:\s*"([^"]+)"/g)) used.add(match[1])
      for (const match of text.matchAll(/brandDefaultFontFamily\s*=\s*"([^"]+)"/g)) {
        used.add(match[1])
      }
    }
    expect(used.size).toBeGreaterThan(0)
    const unknown = [...used].filter((family) => !embedded.has(family))
    expect(unknown).toEqual([])
  })
})
