/**
 * Follow-up of phase 32 (owner decision 2026-10-28): a capped survey now stores `F.dmh_counts` in
 * trees per hectare, with no `F.surface_ha`. The PDF export is not changed; this test only proves
 * that the existing F reader prints such a payload, so an export of a capped survey keeps working.
 */
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { buildFactorObservations } from "../../app/survey-pdf/factor-fields"

const t = fr.surveyExport.factors

describe("PDF export of a capped survey with counts per hectare", () => {
  const method = {
    version: IBP_METHOD_V3_2,
    ibpCas: 1,
    ibpCas3Scale: false,
    regionVersion: null,
    vegetationStage: null,
  } as const

  it("prints the derived total, the groups and the counts, and no surface line", () => {
    const lines = buildFactorObservations(
      "F",
      {
        F: {
          trees_per_ha: 3,
          dmh_groups: ["dmh_01", "dmh_05"],
          dmh_counts: { dmh_01: 2, dmh_05: 1 },
        },
      },
      { method, points: 2 },
    )
    const byCaption = (caption: string) => lines.find((line) => line.caption === caption)
    expect(byCaption(t.treesPerHa)?.value).toBe("3 arbres / ha")
    expect(byCaption(t.dmhGroups)?.items).toHaveLength(2)
    expect(byCaption(t.dmhCapCounts)?.items).toHaveLength(2)
    expect(byCaption(t.surface)).toBeUndefined()
  })
})
