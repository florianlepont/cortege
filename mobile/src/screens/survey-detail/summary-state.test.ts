import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import { resolveFinishCta, resolveStatusLine, resolveSubScoreBands } from "./summary-state"

const h = fr.surveyDetail.header
const c = fr.surveyDetail.cta

const survey = (overrides: Partial<LocalSurvey> = {}): LocalSurvey =>
  ({
    id: "s-01",
    site_name: "Site",
    status: "draft",
    sync_state: "synced",
    sync_blocked: 0,
    ...overrides,
  }) as LocalSurvey

describe("resolveStatusLine (OA-37: the status in words)", () => {
  test("an incomplete synced draft is 'Brouillon', synchronised", () => {
    expect(resolveStatusLine(survey(), false)).toEqual({
      status: h.status.draft,
      sync: h.sync.synced,
      syncTone: "ok",
    })
  })

  test("a complete draft is 'Brouillon complet'", () => {
    expect(resolveStatusLine(survey(), true).status).toBe(h.status.draftComplete)
  })

  test("a draft whose completeness is not read yet stays 'Brouillon'", () => {
    expect(resolveStatusLine(survey(), null).status).toBe(h.status.draft)
  })

  test("a draft not yet sent says it is not synchronised", () => {
    expect(resolveStatusLine(survey({ sync_state: "pending" }), false)).toMatchObject({
      sync: h.sync.pending,
      syncTone: "pending",
    })
  })

  test("a failed sync and a blocked sync are danger lines", () => {
    expect(resolveStatusLine(survey({ sync_state: "failed" }), false)).toMatchObject({
      sync: h.sync.error,
      syncTone: "danger",
    })
    expect(
      resolveStatusLine(survey({ sync_state: "failed", sync_blocked: 1 }), false),
    ).toMatchObject({ sync: h.sync.blocked, syncTone: "danger" })
  })

  test("a submitted survey is 'Terminé'", () => {
    expect(resolveStatusLine(survey({ status: "submitted" }), true).status).toBe(h.status.finished)
  })
})

describe("resolveFinishCta (OA-40: one button, no lock, no deadline)", () => {
  test("a finished survey has no button", () => {
    expect(resolveFinishCta(survey({ status: "submitted" }), false, true, 0)).toEqual({
      kind: "hidden",
    })
  })

  test("a complete synced draft can be finished", () => {
    expect(resolveFinishCta(survey(), true, true, 0)).toEqual({
      kind: "ready",
      label: c.finish,
    })
  })

  test("a complete draft not synced waits for the sync, or says it is blocked", () => {
    expect(resolveFinishCta(survey({ sync_state: "pending" }), false, true, 0)).toEqual({
      kind: "disabled",
      label: c.pendingSync,
    })
    expect(resolveFinishCta(survey({ sync_blocked: 1 }), false, true, 0)).toEqual({
      kind: "disabled",
      label: c.blocked,
    })
  })

  test("an incomplete draft says how many factors are missing", () => {
    expect(resolveFinishCta(survey(), false, false, 1)).toEqual({
      kind: "disabled",
      label: c.remaining(1),
    })
    expect(resolveFinishCta(survey(), false, false, 3)).toEqual({
      kind: "disabled",
      label: c.remaining(3),
    })
  })

  test("without a count it asks for the ten factors", () => {
    expect(resolveFinishCta(survey(), false, null, null)).toEqual({
      kind: "disabled",
      label: c.remainingUnknown,
    })
  })
})

describe("resolveSubScoreBands", () => {
  // The package cut-offs are lower-inclusive (7/14/21/28): 20 is moyenne, 21 already assez forte.
  test("stand 20 is moyenne (mid), 21 assez forte (high); context 10 is forte (high)", () => {
    expect(resolveSubScoreBands(20, 10).stand).toMatchObject({ tone: "mid", bandLabel: "moyenne" })
    expect(resolveSubScoreBands(21, 10).stand).toMatchObject({
      tone: "high",
      bandLabel: "assez forte",
    })
    expect(resolveSubScoreBands(20, 10).context).toMatchObject({ tone: "high", bandLabel: "forte" })
  })

  test("stand 6 and context 4 are faible (low)", () => {
    expect(resolveSubScoreBands(6, 4)).toMatchObject({
      stand: { tone: "low", bandLabel: "faible" },
      context: { tone: "low", bandLabel: "faible" },
    })
  })
})
