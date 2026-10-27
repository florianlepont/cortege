import { IBP_METHOD_V3_0, IBP_METHOD_V3_2, DMH_GROUP_CODES } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { selectionLabel } from "../factor-selections"
import { dmhGroupContent } from "./content"
import { DMH_GUIDE_STRUCTURE } from "./structure"

describe("dmhGroupContent", () => {
  test("groups 6, 12 and 15 read their version 3.0 wording for a version 3.0 survey", () => {
    for (const code of ["dmh_06", "dmh_12", "dmh_15"] as const) {
      const v30 = fr.dmhGuide.groups[code].ibpRuleV30
      const v32 = fr.dmhGuide.groups[code].ibpRule
      for (const version of [null, undefined, "", IBP_METHOD_V3_0]) {
        expect(dmhGroupContent(code, version).rule).toEqual({ text: v30, versionNote: "v30" })
      }
      expect(dmhGroupContent(code, IBP_METHOD_V3_2).rule).toEqual({
        text: v32,
        versionNote: "v32",
      })
    }
    expect(dmhGroupContent("dmh_12", null).rule.text).toContain("Les fougères ne comptent pas")
  })

  test("every other group has one wording and no version note", () => {
    for (const code of DMH_GROUP_CODES) {
      if (["dmh_06", "dmh_12", "dmh_15"].includes(code)) continue
      for (const version of [null, IBP_METHOD_V3_2]) {
        expect(dmhGroupContent(code, version).rule).toEqual({
          text: fr.dmhGuide.groups[code].ibpRule,
          versionNote: null,
        })
      }
    }
  })

  test("the label is the list label of the survey's method, never retyped", () => {
    for (const code of DMH_GROUP_CODES) {
      for (const version of [null, IBP_METHOD_V3_2]) {
        expect(dmhGroupContent(code, version).label).toBe(selectionLabel("F", code, version))
      }
    }
    expect(dmhGroupContent("dmh_05", null).label).toBe("5. Aubier apparent")
  })

  test("form name, texts and types come from the catalogue", () => {
    const content = dmhGroupContent("dmh_06", IBP_METHOD_V3_2)
    expect(content.form).toBe("wounds")
    expect(content.formName).toBe("Blessures et bois apparent")
    expect(content.typesCounted).toEqual([
      "Cime brisée",
      "Bris de charpentière",
      "Fente",
      "Fente causée par la foudre",
      "Fente à l'insertion d'une fourche",
    ])
    expect(content.typesNotCounted).toEqual(["Entailles de castor"])
    expect(content.difference).toBe(fr.dmhGuide.groups.dmh_06.difference)
    expect(content.illustrationAlt).toBe(fr.dmhGuide.groups.dmh_06.illustrationAlt)
    expect(content.confusions).toBe(fr.dmhGuide.groups.dmh_06.confusions)
  })

  test("a group without a threshold difference has none", () => {
    expect(dmhGroupContent("dmh_01", null).difference).toBeNull()
    expect(dmhGroupContent("dmh_01", null).typesNotCounted).toEqual([])
  })

  test("group 9 lists the galls as described but not counted", () => {
    const content = dmhGroupContent("dmh_09", null)
    expect(content.typesCounted).toEqual(["Loupe", "Chancre"])
    expect(content.typesNotCounted).toEqual(["Galles"])
  })

  test("no type of the structure is missing a name", () => {
    for (const code of DMH_GROUP_CODES) {
      const content = dmhGroupContent(code, null)
      expect(content.typesCounted).toHaveLength(DMH_GUIDE_STRUCTURE[code].wslTypes.length)
      for (const name of [...content.typesCounted, ...content.typesNotCounted]) {
        expect(typeof name).toBe("string")
        expect(name.length).toBeGreaterThan(0)
      }
    }
  })
})
