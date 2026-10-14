import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import type { HistoryRowDisplay } from "./history-row"
import { buildSummaryRowSections } from "./summary-rows"

// Phase 30 (plan 30-22, U-O9): the Contexte row of the summary carries the short route label.

const HISTORY: HistoryRowDisplay = { value: "", accessibilityLabel: "", pressable: false }
const HANDLERS = {
  onOpenContext: jest.fn(),
  onOpenParcelsPage: jest.fn(),
  onOpenScore: jest.fn(),
  onOpenHistory: jest.fn(),
}

function data(over: { ibp_method_version?: string | null; ibp_cas?: 1 | 2 | 3 | 4 | null } = {}) {
  return {
    scoringContext: {
      ibp_method_version: IBP_METHOD_V3_2 as string | null,
      ibp_cas: 2 as 1 | 2 | 3 | 4 | null,
      ibp_cas3_scale: false,
      ...over,
    },
    parcelIds: ["P1"],
    filledFactorCount: 4,
  }
}

type Row = { key: string; label: string; value?: string; multiline?: boolean; onPress?: unknown }

const build = (summary: ReturnType<typeof data>, routeLabel?: string | null) =>
  buildSummaryRowSections({ ...summary, routeLabel }, HISTORY, HANDLERS)[0].rows as Row[]

const contextRow = (summary: ReturnType<typeof data>, routeLabel?: string | null) =>
  build(summary, routeLabel)[0]

describe("buildSummaryRowSections context row", () => {
  test("without a route label the value is unchanged", () => {
    expect(contextRow(data()).value).toBe("v3.2 · cas 2")
    expect(contextRow(data(), null).value).toBe("v3.2 · cas 2")
  })

  test("the route label follows the cas, separated by a middle dot", () => {
    expect(contextRow(data(), "Parcours en plein").value).toBe("v3.2 · cas 2 · Parcours en plein")
  })

  test("a survey with no cas yet puts the route label right after the method", () => {
    expect(contextRow(data({ ibp_cas: null }), "Parcours en plein").value).toBe(
      "v3.2 · Parcours en plein",
    )
  })

  test("a v3.0 survey says v3.0 before the route label", () => {
    expect(
      contextRow(data({ ibp_method_version: null, ibp_cas: null }), "Parcours partiel par bande")
        .value,
    ).toBe("v3.0 · Parcours partiel par bande")
  })

  test("the value stays on one line, with a middle dot and no em dash", () => {
    const value = contextRow(data(), "Parcours en plein").value as string
    expect(value).not.toContain("\n")
    expect(value).not.toContain("—")
    expect(value).toContain("·")
    expect(contextRow(data(), "Parcours en plein").multiline).toBeUndefined()
  })

  test("the rest of the rows and the handlers are untouched", () => {
    const rows = build(data(), "Parcours en plein")
    expect(rows.map((row) => row.key)).toEqual(["context", "parcels", "score", "history"])
    expect(rows[0].label).toBe(fr.surveyDetail.rows.context)
    expect(rows[0].onPress).toBe(HANDLERS.onOpenContext)
  })
})
