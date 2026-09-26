import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import {
  resolveHeroMetric,
  resolveHeroSubmitCopy,
  resolveHeroSubmitState,
  resolveSubScoreBands,
} from "./hero-state"

const m = fr.surveyDetail.metric
const bands = fr.surveyDetail.bands

const scores = (stand: number, context: number) => ({
  ibp_peuplement_gestion: stand,
  ibp_contexte: context,
  ibp_total: stand + context,
})

describe("resolveHeroMetric (D-03, D-11: totals out of 50)", () => {
  test("scores {35, 10, 45} read '45 / 50' with the /35 and /15 sub-scores", () => {
    const metric = resolveHeroMetric(scores(35, 10), false, null)
    expect(metric.caption).toBe(m.ibpTotal)
    expect(metric.value).toBe("45 / 50")
    expect(metric.meta).toContain("35 / 35")
    expect(metric.meta).toContain("10 / 15")
    expect(metric.stand?.text).toBe("P/G 35 / 35")
    expect(metric.context?.text).toBe("C 10 / 15")
  })

  test("a local draft uses the draft caption", () => {
    expect(resolveHeroMetric(scores(1, 1), true, null).caption).toBe(m.localDraftScore)
  })

  // The package cut-offs are lower-inclusive (7/14/21/28): 20 is moyenne, 21 already assez forte.
  test("stand 20 is moyenne (mid), 21 assez forte (high); context 10 is forte (high)", () => {
    const metric = resolveHeroMetric(scores(20, 10), false, null)
    expect(metric.stand).toMatchObject({ tone: "mid", bandLabel: "moyenne" })
    expect(metric.context).toMatchObject({ tone: "high", bandLabel: "forte" })
    expect(resolveHeroMetric(scores(21, 10), false, null).stand).toMatchObject({
      tone: "high",
      bandLabel: "assez forte",
    })
  })

  test("stand 6 is faible (low); context 4 is faible and 5 moyenne", () => {
    expect(resolveHeroMetric(scores(6, 4), false, null).stand).toMatchObject({
      tone: "low",
      bandLabel: "faible",
    })
    expect(resolveHeroMetric(scores(6, 4), false, null).context).toMatchObject({
      tone: "low",
      bandLabel: bands.context.faible,
    })
    expect(resolveHeroMetric(scores(6, 5), false, null).context?.tone).toBe("mid")
  })

  test("without scores it shows the factor count and no sub-scores", () => {
    const counted = resolveHeroMetric(null, false, 7)
    expect(counted).toMatchObject({
      caption: m.factorsReady,
      value: m.factorsCount(7),
      meta: m.requiredCompleted,
      stand: null,
      context: null,
    })
    const unknown = resolveHeroMetric(null, false, null)
    expect(unknown.value).toBe(m.unknown)
    expect(unknown.meta).toBe(m.readinessPending)
  })
})

describe("resolveSubScoreBands", () => {
  test("names every stand band and uses three tones", () => {
    const labels = [3, 7, 14, 21, 28].map((score) => resolveSubScoreBands(score, 0).stand)
    expect(labels.map((band) => band.bandLabel)).toEqual([
      "faible",
      "assez faible",
      "moyenne",
      "assez forte",
      "forte",
    ])
    expect(labels.map((band) => band.tone)).toEqual(["low", "low", "mid", "high", "high"])
  })
})

describe("hero submit state", () => {
  const survey = (overrides: Partial<LocalSurvey>) =>
    ({ status: "draft", sync_blocked: 0, ...overrides }) as LocalSurvey

  test("maps the survey state to the submit copy", () => {
    expect(resolveHeroSubmitState(survey({ status: "submitted" }), false, null)).toBe("submitted")
    expect(resolveHeroSubmitState(survey({}), true, true)).toBe("ready")
    expect(resolveHeroSubmitState(survey({}), false, true)).toBe("pending_sync")
    expect(resolveHeroSubmitState(survey({ sync_blocked: 1 }), false, true)).toBe("blocked")
    expect(resolveHeroSubmitState(survey({}), false, false)).toBe("progress")
    expect(resolveHeroSubmitCopy("ready")).toBe(fr.surveyDetail.submit.ready)
    expect(resolveHeroSubmitCopy("pending_sync")).toBe(fr.surveyDetail.submit.pendingSync)
    expect(resolveHeroSubmitCopy("blocked")).toBe(fr.surveyDetail.submit.blocked)
    expect(resolveHeroSubmitCopy("progress")).toBe(fr.surveyDetail.submit.progress)
  })
})
