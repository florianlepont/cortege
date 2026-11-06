import fs from "fs"
import path from "path"

import { DMH_GROUP_CODES } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { dmhGroupContent } from "./content"
import {
  DMH_GUIDE_STRUCTURE,
  DMH_LIST_ORDER,
  DMH_WSL_TYPES_WITHOUT_IBP_GROUP,
  type DmhFormId,
} from "./structure"

// Phase 32 (plan 32-10, T-32-23): the code equals the validated spec. This reads
// docs/specs/dmh-guide-content-v1.md and compares section 5 (the correspondence table, the forms and
// the type numbers), the sub-table of types without an IBP group, the validated list order of
// section 7 and the type names of the group sheets of section 6. A change of the spec or of the
// structure that is not made on both sides fails here. The spec must stay validated.

const SPEC_PATH = path.resolve(__dirname, "../../../../docs/specs/dmh-guide-content-v1.md")
const spec = fs.readFileSync(SPEC_PATH, "utf8")

function section(from: string, to: string): string {
  const start = spec.indexOf(from)
  const end = spec.indexOf(to, start + from.length)
  if (start === -1 || end === -1) throw new Error(`spec section not found: ${from}`)
  return spec.slice(start, end)
}

function typeNumbers(cell: string): number[] {
  if (cell.trim() === "aucun") return []
  return cell.split(" ; ").map((entry) => Number(/^(\d+)\./.exec(entry.trim())?.[1]))
}

type SpecRow = { form: string; counted: number[]; notCounted: number[] }

function readTable(): Record<string, SpecRow> {
  const rows: Record<string, SpecRow> = {}
  for (const line of section("\n## 5. ", "\n## 6. ").split("\n")) {
    if (!line.startsWith("| `dmh_")) continue
    const cells = line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim())
    rows[(cells[0] as string).replace(/`/g, "")] = {
      form: (cells[2] as string).replace(/`/g, ""),
      counted: typeNumbers(cells[3] as string),
      notCounted: typeNumbers(cells[4] as string),
    }
  }
  return rows
}

describe("the structure equals the validated spec", () => {
  test("the spec is validated", () => {
    expect(spec).toMatch(/^Statut : validée/m)
  })

  const table = readTable()

  test("section 5 holds the fifteen groups", () => {
    expect(Object.keys(table)).toEqual([...DMH_GROUP_CODES])
  })

  test.each([...DMH_GROUP_CODES])("%s: form and type numbers equal the table", (code) => {
    const row = table[code] as SpecRow
    const structure = DMH_GUIDE_STRUCTURE[code]
    expect(structure.form as string).toBe(row.form)
    expect([...structure.wslTypes]).toEqual(row.counted)
    expect([...structure.wslTypesOutsideIbp]).toEqual(row.notCounted)
  })

  test("the types without an IBP group equal the sub-table", () => {
    const block = section("### Types sans groupe IBP", "\n## 6. ")
    const numbers = block
      .split("\n")
      .filter((line) => /^\| \d+\. /.test(line))
      .map((line) => Number(/^\| (\d+)\./.exec(line)?.[1]))
    expect([...DMH_WSL_TYPES_WITHOUT_IBP_GROUP]).toEqual(numbers)
  })

  test("the list order is the validated order of section 7", () => {
    const line = section("\n## 7. ", "\n## 8. ")
      .split("\n")
      .find((entry) => entry.startsWith("Ordre validé"))
    const codes = [...(line ?? "").matchAll(/`(dmh_\d\d)`/g)].map((match) => match[1])
    expect([...DMH_LIST_ORDER]).toEqual(codes)
  })

  test("the form names of section 4 are the catalogue form names", () => {
    const names: Record<string, string> = {}
    for (const line of section("\n## 4. ", "\n## 5. ").split("\n")) {
      const match = /^\| `(\w+)`\s+\| (.+?)\s+\| .+? \| .+? \|$/.exec(line)
      if (match !== null) names[match[1] as string] = match[2] as string
    }
    expect(Object.keys(names)).toHaveLength(7)
    for (const [form, name] of Object.entries(names)) {
      expect(fr.dmhGuide.forms[form as DmhFormId]).toBe(name)
    }
  })

  test("the type names listed on each group sheet are those the page shows", () => {
    const sheets = section("\n## 6. ", "\n## 7. ")
      .split(/\n### /)
      .slice(1)
    for (const sheet of sheets) {
      const code = /^`(dmh_\d\d)`/.exec(sheet)?.[1] as (typeof DMH_GROUP_CODES)[number] | undefined
      if (code === undefined) continue
      const read = (title: string): string[] => {
        const value = new RegExp(`^\\*\\*${title}\\*\\* : (.+)$`, "m").exec(sheet)?.[1] ?? ""
        return value === "aucun" ? [] : value.split(" ; ")
      }
      const content = dmhGroupContent(code, null)
      expect([code, content.typesCounted]).toEqual([code, read("Types comptés")])
      expect([code, content.typesNotCounted]).toEqual([code, read("Types décrits, non comptés")])
    }
  })
})
