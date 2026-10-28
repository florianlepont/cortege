import fs from "fs"
import path from "path"

import { DMH_GROUP_CODES, type DmhGroupCode } from "@cortege/ibp-domain"

import { fr } from "../index"

// Phase 32 (plan 32-10, D-07): the catalogue of the dendromicrohabitat guide. The text rules of the
// spec (section 3) are checked here on every string of the module (the dash and abbreviation gates
// in src/__checks__ run on the whole catalogue): no snake case code, no type number, no
// abbreviation of an institution, units written out. The forbidden tokens are built from pieces so
// this file carries none of them. The last block ties every group text to the validated spec.

type Leaf = { path: string; text: string }

function collect(node: unknown, at: string, texts: Leaf[]): void {
  if (typeof node === "string") texts.push({ path: at, text: node })
  else if (typeof node === "function") return
  else if (node !== null && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) {
      collect(child, at === "" ? key : `${at}.${key}`, texts)
    }
  }
}

const join = (...pieces: string[]) => pieces.join("")

const guide = fr.dmhGuide
const texts: Leaf[] = []
collect(guide, "dmhGuide", texts)

const groupOf = (code: DmhGroupCode): Record<string, unknown> =>
  guide.groups[code] as unknown as Record<string, unknown>

describe("fr.dmhGuide groups", () => {
  test("every group has the required fields", () => {
    expect(Object.keys(guide.groups).sort()).toEqual([...DMH_GROUP_CODES].sort())
    for (const code of DMH_GROUP_CODES) {
      const group = guide.groups[code]
      for (const field of ["keywords", "definition", "ibpRule", "recognise"] as const) {
        expect([code, field, group[field].length > 0]).toEqual([code, field, true])
      }
      expect([code, group.illustrationAlt.length > 0]).toEqual([code, true])
      expect([code, group.confusions.length >= 2, group.confusions.length <= 4]).toEqual([
        code,
        true,
        true,
      ])
      for (const line of group.confusions) expect(line.length).toBeGreaterThan(0)
    }
  })

  test("the version 3.0 rule exists for groups 6, 12 and 15 only", () => {
    const withV30 = DMH_GROUP_CODES.filter((code) => "ibpRuleV30" in groupOf(code))
    expect(withV30).toEqual(["dmh_06", "dmh_12", "dmh_15"])
    for (const code of withV30) expect(groupOf(code).ibpRuleV30).not.toBe("")
  })

  test("the pocket guide difference exists for the nine groups of the spec only", () => {
    const withDifference = DMH_GROUP_CODES.filter((code) => "difference" in groupOf(code))
    expect(withDifference).toEqual([
      "dmh_03",
      "dmh_04",
      "dmh_05",
      "dmh_06",
      "dmh_07",
      "dmh_12",
      "dmh_13",
      "dmh_14",
      "dmh_15",
    ])
  })

  test("no group label is retyped in the module", () => {
    const labels: string[] = fr.factorInput.dmhGroupOptions.map((option) => option.label)
    expect(texts.filter(({ text }) => labels.includes(text)).map(({ path: at }) => at)).toEqual([])
  })

  test("the drawings credit is one static sentence and no key credits a drawing", () => {
    expect(guide.sources.drawings).toBe("Dessins originaux de l'association Etats Sauvages.")
    const keys = texts.map(({ path: at }) => at.toLowerCase())
    expect(keys.filter((at) => /credit|author|auteur/.test(at) && at.includes("groups."))).toEqual(
      [],
    )
    for (const code of DMH_GROUP_CODES) {
      expect(Object.keys(groupOf(code)).filter((key) => /credit|author|auteur/i.test(key))).toEqual(
        [],
      )
    }
  })
})

describe("fr.dmhGuide forms, types and sources", () => {
  test("the seven form ids carry their official names", () => {
    expect(Object.keys(guide.forms)).toEqual([
      "cavities",
      "wounds",
      "crown_deadwood",
      "growths",
      "fruiting_bodies",
      "epiphytic",
      "exudates",
    ])
    expect(guide.forms.fruiting_bodies).toBe("Sporophores de champignons et myxomycètes")
    expect(guide.forms.epiphytic).toBe("Structures épiphytiques, épixyliques ou parasites")
  })

  test("types has the keys 1 to 52, each a name", () => {
    const keys = Object.keys(guide.types).map(Number)
    expect(keys).toEqual(Array.from({ length: 52 }, (_, index) => index + 1))
    for (const name of Object.values(guide.types)) expect(name.length).toBeGreaterThan(0)
  })

  test("the sources page lists the three documents with every field", () => {
    expect(guide.sources.documents).toHaveLength(3)
    for (const document of guide.sources.documents) {
      for (const field of ["title", "authors", "publisher", "year", "usedFor"] as const) {
        expect([field, document[field].length > 0]).toEqual([field, true])
      }
    }
    expect(guide.sources.documents.map((document) => document.year)).toEqual([
      "2024",
      "2018",
      "2026",
    ])
  })

  test("the function leaves render clean sentences", () => {
    const rendered = [
      guide.sheet.groupAnnounce({ label: "5. Aubier apparent" }),
      guide.search.found({ count: 1 }),
      guide.search.found({ count: 7 }),
      guide.group.form({ form: guide.forms.cavities }),
      guide.group.typeCountedA11y({ name: "Fente" }),
      guide.group.typeNotCountedA11y({ name: "Galles" }),
    ]
    expect(rendered).toEqual([
      "Groupe 5. Aubier apparent",
      "1 groupe trouvé",
      "7 groupes trouvés",
      "Forme : Cavités",
      "Fente. Compté par l'IBP",
      "Galles. Non compté par l'IBP",
    ])
  })
})

const FORBIDDEN: { label: string; test: (text: string) => boolean }[] = [
  { label: "snake case token", test: (text) => /(^|[^\p{L}\p{N}_])[a-z]+_[a-z_]+/u.test(text) },
  { label: "group code", test: (text) => text.includes(join("dm", "h_")) },
  {
    label: "type number at the start of a string",
    test: (text) => /^\d+\. /.test(text),
  },
  {
    label: "abbreviation of the forest owners' centre",
    test: (text) => text.includes(join("CN", "PF")),
  },
  {
    label: "abbreviation of the national research institute",
    test: (text) => text.includes(join("IN", "RAE")),
  },
  {
    label: "abbreviation of the Swiss institute",
    test: (text) => new RegExp(`\\b${join("W", "SL")}\\b`).test(text),
  },
  {
    label: "abbreviation of dendromicrohabitat",
    test: (text) => new RegExp(`\\b${join("d", "mh")}\\b`, "i").test(text),
  },
  { label: "paper format", test: (text) => new RegExp(`\\b${join("A", "4")}\\b`).test(text) },
  { label: "em dash", test: (text) => text.includes("—") },
]

describe("fr.dmhGuide text rules", () => {
  test("the catalogue holds the module", () => {
    expect(texts.length).toBeGreaterThan(150)
  })

  test.each(FORBIDDEN.map((rule) => [rule.label, rule] as const))("no %s", (_label, rule) => {
    expect(texts.filter(({ text }) => rule.test(text)).map(({ path: at }) => at)).toEqual([])
  })

  test("the rules catch what they are meant to catch", () => {
    const byLabel = Object.fromEntries(FORBIDDEN.map((rule) => [rule.label, rule.test]))
    expect(byLabel["snake case token"]("le code crown_deadwood")).toBe(true)
    expect(byLabel["snake case token"]("une phrase normale")).toBe(false)
    expect(byLabel["group code"](join("dm", "h_01"))).toBe(true)
    expect(byLabel["type number at the start of a string"]("12. Dendrotelme")).toBe(true)
    expect(byLabel["type number at the start of a string"]("Dendrotelme")).toBe(false)
  })
})

// The texts equal the validated spec, character for character (threat T-32-23). Section 6 holds
// one block per group: "**Field** : text" lines, and the confusions as a bullet list.
const SPEC_PATH = path.resolve(__dirname, "../../../../docs/specs/dmh-guide-content-v1.md")

type SpecGroup = {
  label: string
  fields: Record<string, string>
  confusions: string[]
}

function readSpecGroups(): Record<string, SpecGroup> {
  const spec = fs.readFileSync(SPEC_PATH, "utf8")
  const start = spec.indexOf("\n## 6. ")
  const end = spec.indexOf("\n## 7. ")
  const section = spec.slice(start, end)
  const result: Record<string, SpecGroup> = {}
  const blocks = section.split(/\n### /).slice(1)
  for (const block of blocks) {
    const heading = /^`(dmh_\d\d)` (.+)$/m.exec(block)
    if (heading === null) continue
    const group: SpecGroup = { label: heading[2] as string, fields: {}, confusions: [] }
    for (const line of block.split("\n")) {
      const field = /^\*\*(.+?)\*\* : (.+)$/.exec(line)
      if (field !== null) group.fields[field[1] as string] = field[2] as string
      else if (line.startsWith("- ")) group.confusions.push(line.slice(2))
    }
    result[heading[1] as string] = group
  }
  return result
}

describe("fr.dmhGuide equals the validated spec", () => {
  const specGroups = readSpecGroups()

  test("the spec holds the fifteen groups and their labels are the list labels", () => {
    expect(Object.keys(specGroups)).toEqual([...DMH_GROUP_CODES])
    for (const option of fr.factorInput.dmhGroupOptions) {
      expect((specGroups[option.value] as SpecGroup).label).toBe(option.label)
    }
  })

  test.each([...DMH_GROUP_CODES])("%s: every text is the text of the spec", (code) => {
    const spec = specGroups[code] as SpecGroup
    const group = guide.groups[code] as unknown as Record<string, unknown>
    expect(group.keywords).toBe(spec.fields["Mots-clés"])
    expect(group.definition).toBe(spec.fields["Définition"])
    expect(group.ibpRule).toBe(spec.fields["Ce qui compte pour l'IBP (méthode 3.2)"])
    expect(group.ibpRuleV30).toBe(spec.fields["Méthode 3.0"])
    expect(group.recognise).toBe(spec.fields["Comment le reconnaître"])
    expect(group.confusions).toEqual(spec.confusions)
    expect(group.difference).toBe(spec.fields["Écart avec le guide de poche"])
    expect(group.illustrationAlt).toBe(spec.fields["Texte du dessin"])
  })
})
