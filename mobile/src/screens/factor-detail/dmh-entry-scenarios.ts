import type { DmhGroupCode } from "@cortege/ibp-domain"

/**
 * Phase 32 (D-08, ROADMAP criterion 3): the two recording scenarios every speed test of factor F
 * replays, and the numbers the OLD flow (tick a chip, then press + on the separate counter block)
 * needed for them. The old numbers were measured by dmh-entry-cost.test.tsx before any change to
 * the F entry (plan 32-01); later plans import the same constants, so the new flow is compared to
 * the same scenarios and has to beat OLD_FLOW_PRESSES while writing OLD_FLOW_F_PAYLOAD again.
 */

export type DmhEntryScenarioId = "S1" | "S2"

export type DmhEntryScenario = {
  id: DmhEntryScenarioId
  /** The groups to record and their whole trees, in IBP order. */
  groups: readonly { code: DmhGroupCode; trees: number }[]
}

export const DMH_ENTRY_SCENARIOS: Record<DmhEntryScenarioId, DmhEntryScenario> = {
  // Research scenario S1: a few groups, a handful of trees.
  S1: {
    id: "S1",
    groups: [
      { code: "dmh_01", trees: 2 },
      { code: "dmh_05", trees: 2 },
      { code: "dmh_12", trees: 1 },
    ],
  },
  // Provisional "many" tally (9 groups, 20 trees). Plan 32-07 replaces it by the owner's real
  // survey tally.
  S2: {
    id: "S2",
    groups: [
      { code: "dmh_01", trees: 3 },
      { code: "dmh_02", trees: 2 },
      { code: "dmh_04", trees: 2 },
      { code: "dmh_05", trees: 3 },
      { code: "dmh_06", trees: 2 },
      { code: "dmh_07", trees: 3 },
      { code: "dmh_10", trees: 1 },
      { code: "dmh_12", trees: 3 },
      { code: "dmh_15", trees: 1 },
    ],
  },
}

/** The surface (ha) typed before the replay, so the form computes the density. */
export const DMH_ENTRY_SURFACE_HA = "1"

/** Presses the old flow needs: one per chip plus one + press per tree. Recorded by the test. */
export const OLD_FLOW_PRESSES: Record<DmhEntryScenarioId, number> = {
  S1: 8,
  S2: 29,
}

export type OldFlowFPayload = {
  trees_per_ha: number
  dmh_groups: string[]
  dmh_counts: Partial<Record<DmhGroupCode, number>>
  surface_ha: number
}

/**
 * The F payload the form builds after each old-flow replay (draftInput.factors.F), recorded from
 * the real components. The new flow has to write exactly this (stored data unchanged, D-08).
 * trees_per_ha is the package's derived value, never recomputed here (S2 holds 20 trees on 1 ha
 * and the package answers 16: each group counts for at most 2 per ha).
 */
export const OLD_FLOW_F_PAYLOAD: Record<DmhEntryScenarioId, OldFlowFPayload> = {
  S1: {
    trees_per_ha: 5,
    dmh_groups: ["dmh_01", "dmh_05", "dmh_12"],
    dmh_counts: { dmh_01: 2, dmh_05: 2, dmh_12: 1 },
    surface_ha: 1,
  },
  S2: {
    trees_per_ha: 16,
    dmh_groups: [
      "dmh_01",
      "dmh_02",
      "dmh_04",
      "dmh_05",
      "dmh_06",
      "dmh_07",
      "dmh_10",
      "dmh_12",
      "dmh_15",
    ],
    dmh_counts: {
      dmh_01: 3,
      dmh_02: 2,
      dmh_04: 2,
      dmh_05: 3,
      dmh_06: 2,
      dmh_07: 3,
      dmh_10: 1,
      dmh_12: 3,
      dmh_15: 1,
    },
    surface_ha: 1,
  },
}
