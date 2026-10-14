import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import type { HistoryRowDisplay } from "./history-row"
import { buildSummaryRowSections } from "./summary-rows"

// Phase 30 (plan 30-22, U-O9): the short route label sits on the "Parcelles et parcours" row
// (moved from the Contexte row on 2026-10-14).

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

type Extra = { routeLabel?: string | null; routePending?: boolean }

const build = (summary: ReturnType<typeof data>, extra: Extra = {}) =>
  buildSummaryRowSections({ ...summary, ...extra }, HISTORY, HANDLERS)[0].rows as Row[]

const contextRow = (summary: ReturnType<typeof data>, extra: Extra = {}) => build(summary, extra)[0]
const parcelsRow = (summary: ReturnType<typeof data>, extra: Extra = {}) => build(summary, extra)[1]

describe("buildSummaryRowSections context row", () => {
  test("the value is the method and the cas, whatever the route (moved to the parcels row)", () => {
    expect(contextRow(data()).value).toBe("v3.2 · cas 2")
    expect(contextRow(data(), { routeLabel: "Parcours en plein" }).value).toBe("v3.2 · cas 2")
    expect(contextRow(data(), { routePending: true }).value).toBe("v3.2 · cas 2")
  })

  test("a survey with no cas yet shows the method alone", () => {
    expect(contextRow(data({ ibp_cas: null })).value).toBe("v3.2")
  })

  test("a v3.0 survey says v3.0", () => {
    expect(contextRow(data({ ibp_method_version: null, ibp_cas: null })).value).toBe("v3.0")
  })
})

describe("buildSummaryRowSections parcels row (Parcelles et parcours)", () => {
  test("is named Parcelles et parcours", () => {
    expect(parcelsRow(data()).label).toBe("Parcelles et parcours")
  })

  test("without a route it shows the parcel count alone", () => {
    expect(parcelsRow(data()).value).toBe("1 parcelle")
    expect(parcelsRow({ ...data(), parcelIds: ["P1", "P2"] }, { routeLabel: null }).value).toBe(
      "2 parcelles",
    )
    expect(parcelsRow({ ...data(), parcelIds: [] }).value).toBe("Aucune")
  })

  test("the route label follows the count on one line, with a middle dot", () => {
    const value = parcelsRow(
      { ...data(), parcelIds: ["P1", "P2"] },
      { routeLabel: "Parcours en plein" },
    ).value as string
    expect(value).toBe("2 parcelles · Parcours en plein")
    expect(value).not.toContain("\n")
    expect(value).not.toContain("\u2014")
    expect(parcelsRow(data(), { routeLabel: "Parcours en plein" }).multiline).toBe(true)
  })

  test("a draft with no route says the parcours is still to choose", () => {
    expect(parcelsRow(data(), { routePending: true }).value).toBe("1 parcelle · Parcours à choisir")
  })

  test("a route label wins over the pending flag", () => {
    expect(parcelsRow(data(), { routeLabel: "Parcours en plein", routePending: true }).value).toBe(
      "1 parcelle · Parcours en plein",
    )
  })

  test("the rest of the rows and the handlers are untouched", () => {
    const rows = build(data(), { routeLabel: "Parcours en plein" })
    expect(rows.map((row) => row.key)).toEqual(["context", "parcels", "score", "history"])
    expect(rows[0].label).toBe(fr.surveyDetail.rows.context)
    expect(rows[0].onPress).toBe(HANDLERS.onOpenContext)
    expect(rows[1].onPress).toBe(HANDLERS.onOpenParcelsPage)
  })
})
