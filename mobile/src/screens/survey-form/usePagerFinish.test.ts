jest.mock("react-native", () => ({
  Platform: { select: (opts: Record<string, unknown>) => opts.default ?? Object.values(opts)[0] },
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { SurveyFormDraftInput } from "../../hooks/useSurveyForm"
import type { LocalSurvey } from "../../storage"
import { isDraftComplete, usePagerFinish } from "./usePagerFinish"

afterEach(async () => {
  await cleanup()
})

const survey = (overrides: Partial<LocalSurvey> = {}): LocalSurvey =>
  ({
    id: "s-01",
    site_name: "Lisière",
    status: "draft",
    sync_state: "pending",
    sync_blocked: 0,
    ...overrides,
  }) as LocalSurvey

// The complete v3.0 draft of ibp-scoring.test.ts: ten scored factors and a parcel.
const COMPLETE: SurveyFormDraftInput = {
  site_name: "Lisière",
  region_version: "ACA",
  vegetation_stage: "collineen",
  factors: {
    A: { native_genus_count: 2 },
    B: { strata_count: 2, covered_autochthonous_percent: 80 },
    C: { bmg_count: 0, bmm_count: 1, surface_ha: 1 },
    D: { bmg_count: 0, bmm_count: 1, surface_ha: 1 },
    E: { tgb_count: 0, gb_count: 1, surface_ha: 1 },
    F: { trees_per_ha: 2 },
    G: { open_flowering_percent: 2 },
    H: { class_score: 2 },
    I: { type_count: 1 },
    J: { type_count: 1 },
  },
  parcel_ids: ["75056000AB0001"],
}
const WITHOUT_J: SurveyFormDraftInput = {
  ...COMPLETE,
  factors: { ...COMPLETE.factors, J: {} },
}

type Params = Parameters<typeof usePagerFinish>[0]

function params(overrides: Partial<Params> = {}): Params {
  return {
    survey: survey(),
    draft: COMPLETE,
    openFinish: jest.fn(),
    onFinished: jest.fn(),
    ...overrides,
  }
}

const renderFinish = (initial: Params) =>
  renderHook((props: Params) => usePagerFinish(props), { initialProps: initial })

describe("isDraftComplete (the package's readiness on the live form)", () => {
  test("ten scored factors and a parcel are complete", () => {
    expect(isDraftComplete(COMPLETE)).toBe(true)
  })

  test("a factor missing, or no parcel, is not complete", () => {
    expect(isDraftComplete(WITHOUT_J)).toBe(false)
    expect(isDraftComplete({ ...COMPLETE, parcel_ids: [] })).toBe(false)
  })
})

describe("usePagerFinish (D-26)", () => {
  test("offered only when canFinishSurvey holds: complete, named, not blocked, not finished", async () => {
    const cases: [Partial<Params>, boolean][] = [
      [{}, true],
      [{ draft: WITHOUT_J }, false],
      [{ survey: survey({ site_name: "  " }) }, false],
      [{ survey: survey({ sync_blocked: 1 }) }, false],
      [{ survey: survey({ status: "submitted" }) }, false],
      [{ survey: null }, false],
      // A finish is offered whatever the sync state (D-25): the finish sends the changes itself.
      [{ survey: survey({ sync_state: "failed" }) }, true],
    ]
    for (const [overrides, expected] of cases) {
      const { result } = await renderFinish(params(overrides))
      expect(result.current.offered).toBe(expected)
      await cleanup()
    }
  })

  test("a press opens the submission step once for this survey and submits nothing itself", async () => {
    const props = params()
    const { result } = await renderFinish(props)
    await act(async () => {
      result.current.finish()
    })
    expect(props.openFinish).toHaveBeenCalledTimes(1)
    expect(props.openFinish).toHaveBeenCalledWith("s-01")
    expect(props.onFinished).not.toHaveBeenCalled()
  })

  test("success: the survey turns submitted, onFinished is called once", async () => {
    const props = params()
    const { result, rerender } = await renderFinish(props)
    await act(async () => {
      result.current.finish()
    })
    expect(props.onFinished).not.toHaveBeenCalled()
    await rerender({ ...props, survey: survey({ status: "submitted" }) })
    expect(props.onFinished).toHaveBeenCalledTimes(1)
    // Not offered any more, and a later render does not call it again.
    expect(result.current.offered).toBe(false)
    await rerender({ ...props, survey: survey({ status: "submitted", sync_state: "synced" }) })
    expect(props.onFinished).toHaveBeenCalledTimes(1)
  })

  test("a sheet closed without finishing (still a draft) stays: no onFinished, still offered", async () => {
    const props = params()
    const { result, rerender } = await renderFinish(props)
    await act(async () => {
      result.current.finish()
    })
    await rerender({ ...props, survey: survey({ sync_state: "pending" }) })
    expect(props.onFinished).not.toHaveBeenCalled()
    expect(result.current.offered).toBe(true)
  })

  test("a survey finished without a press from here does not navigate", async () => {
    const props = params()
    const { rerender } = await renderFinish(props)
    await rerender({ ...props, survey: survey({ status: "submitted" }) })
    expect(props.onFinished).not.toHaveBeenCalled()
  })

  test("no survey: a press does nothing", async () => {
    const props = params({ survey: null })
    const { result } = await renderFinish(props)
    await act(async () => {
      result.current.finish()
    })
    expect(props.openFinish).not.toHaveBeenCalled()
  })
})
