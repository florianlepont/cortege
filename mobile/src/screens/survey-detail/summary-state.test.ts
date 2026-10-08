import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import {
  canFinishSurvey,
  resolveFinishCta,
  resolveStatusLine,
  resolveSubScoreBands,
} from "./summary-state"

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

  test("D-25: a finished, synced survey is just 'Terminé', with nothing after it", () => {
    expect(resolveStatusLine(survey({ status: "submitted" }), true)).toEqual({
      status: h.status.finished,
      sync: null,
      syncTone: "ok",
    })
  })

  test("D-25: a finished survey still sending says so discreetly", () => {
    expect(resolveStatusLine(survey({ status: "submitted", sync_state: "pending" }), true)).toEqual(
      { status: h.status.finished, sync: h.sync.sending, syncTone: "ok" },
    )
    expect(h.sync.sending).toBe("synchronisation en cours")
  })

  test("a finished survey keeps the error and blocked wording", () => {
    expect(
      resolveStatusLine(survey({ status: "submitted", sync_state: "failed" }), true),
    ).toMatchObject({ status: h.status.finished, sync: h.sync.error, syncTone: "danger" })
    expect(
      resolveStatusLine(
        survey({ status: "submitted", sync_state: "failed", sync_blocked: 1 }),
        true,
      ),
    ).toMatchObject({ status: h.status.finished, sync: h.sync.blocked, syncTone: "danger" })
  })
})

describe("resolveFinishCta (OA-40: one button, no lock, no deadline)", () => {
  test("a finished survey has no button", () => {
    expect(resolveFinishCta(survey({ status: "submitted" }), false, true, 0, null)).toEqual({
      kind: "hidden",
    })
  })

  test("a complete synced draft can be finished", () => {
    expect(resolveFinishCta(survey(), true, true, 10, null)).toEqual({
      kind: "ready",
      label: c.finish,
    })
  })

  test("D-25: a complete draft not synced yet can be finished too, with no sync wording", () => {
    for (const sync_state of ["pending", "failed"] as const) {
      const pending = survey({ sync_state })
      const cta = resolveFinishCta(pending, canFinishSurvey(pending, true), true, 10, null)
      expect(cta).toEqual({ kind: "ready", label: c.finish })
    }
    expect(c.finish.toLowerCase()).not.toContain("synchronis")
  })

  test("a complete draft whose sync is blocked says it is blocked", () => {
    const blocked = survey({ sync_state: "failed", sync_blocked: 1 })
    expect(resolveFinishCta(blocked, canFinishSurvey(blocked, true), true, 10, null)).toEqual({
      kind: "disabled",
      label: c.blocked,
    })
  })

  test("D-25: a complete but unnamed draft asks for a name instead of a sync", () => {
    for (const site_name of ["", "  "]) {
      const unnamed = survey({ site_name, sync_state: "pending" })
      const cta = resolveFinishCta(unnamed, canFinishSurvey(unnamed, true), true, 10, null)
      expect(cta).toEqual({ kind: "disabled", label: c.nameRequired })
    }
    expect(c.nameRequired).not.toMatch(/synchronis|—/i)
  })

  test("an incomplete draft opens the next factor: Commencer with none filled, then Continuer", () => {
    expect(resolveFinishCta(survey(), false, false, 0, "A")).toEqual({
      kind: "next",
      label: c.start,
      factor: "A",
    })
    expect(resolveFinishCta(survey(), false, false, 3, "D")).toEqual({
      kind: "next",
      label: c.continue,
      factor: "D",
    })
  })

  test("all ten factors filled but the context missing asks for the context", () => {
    expect(resolveFinishCta(survey(), false, false, 10, null)).toEqual({
      kind: "disabled",
      label: c.contextMissing,
    })
  })

  test("without a count it asks for the ten factors", () => {
    expect(resolveFinishCta(survey(), false, null, null, null)).toEqual({
      kind: "disabled",
      label: c.remainingUnknown,
    })
  })
})

describe("canFinishSurvey (D-25: complete, named, not blocked, not finished)", () => {
  test("a complete named draft can be finished whatever its sync state", () => {
    for (const sync_state of ["synced", "pending", "failed"] as const) {
      expect(canFinishSurvey(survey({ sync_state }), true)).toBe(true)
    }
  })

  test("not while incomplete, unread, finished, blocked or unnamed", () => {
    expect(canFinishSurvey(survey(), false)).toBe(false)
    expect(canFinishSurvey(survey(), null)).toBe(false)
    expect(canFinishSurvey(survey({ status: "submitted" }), true)).toBe(false)
    expect(canFinishSurvey(survey({ sync_blocked: 1 }), true)).toBe(false)
    expect(canFinishSurvey(survey({ site_name: " " }), true)).toBe(false)
    expect(canFinishSurvey(survey({ site_name: undefined }), true)).toBe(false)
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
