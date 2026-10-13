jest.mock("react-native", () => ({
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  Platform: { select: (opts: Record<string, unknown>) => opts.default ?? Object.values(opts)[0] },
}))
jest.mock("../../ui/feedback", () => ({
  feedback: { notify: { error: jest.fn() }, selection: jest.fn() },
}))
jest.mock("../../i18n", () => ({
  ...jest.requireActual("../../i18n"),
  logStatusDetail: jest.fn(),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { SurveyVisibility } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage"
import { feedback } from "../../ui/feedback"
import { useFinishSheet } from "./useFinishSheet"

afterEach(async () => {
  await cleanup()
  jest.clearAllMocks()
})

const survey = (overrides: Partial<LocalSurvey> = {}): LocalSurvey =>
  ({
    id: "s-01",
    site_name: "Lisière",
    status: "draft",
    visibility: "public",
    ...overrides,
  }) as LocalSurvey

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

type Params = Parameters<typeof useFinishSheet>[0]

async function setup(overrides: Partial<Params> = {}) {
  const calls: string[] = []
  const params: Params = {
    survey: survey(),
    offline: false,
    flushDraft: jest.fn(async () => {
      calls.push("flush")
      return true
    }),
    setDraftVisibility: jest.fn(async (_id: string, visibility: SurveyVisibility) => {
      calls.push(`store:${visibility}`)
      return "stored" as const
    }),
    submitSurvey: jest.fn(async () => {
      calls.push("submit")
      return "submitted" as const
    }),
    onClose: jest.fn(),
    announce: jest.fn(),
    ...overrides,
  }
  const view = await renderHook((props: Params) => useFinishSheet(props), { initialProps: params })
  // Not spread: the render result is a thenable, which would be unwrapped by the async return.
  return { result: view.result, params, calls }
}

describe("useFinishSheet initial state", () => {
  test("a shared draft opens on shared, a private one on private", async () => {
    expect((await setup()).result.current.choice).toBe("public")
    const privateDraft = await setup({ survey: survey({ visibility: "private" }) })
    expect(privateDraft.result.current.choice).toBe("private")
    expect((await setup()).result.current.phase).toBe("idle")
  })

  test("a submitted survey opens frozen", async () => {
    const { result } = await setup({ survey: survey({ status: "submitted" }) })
    expect(result.current.phase).toBe("frozen")
  })

  test("a null survey closes the sheet", async () => {
    const { params } = await setup({ survey: null })
    expect(params.onClose).toHaveBeenCalledTimes(1)
  })
})

describe("select", () => {
  test("changes the choice while idle and stores nothing", async () => {
    const { result, params } = await setup()
    await act(async () => result.current.select("private"))
    expect(result.current.choice).toBe("private")
    expect(params.setDraftVisibility).not.toHaveBeenCalled()
  })

  test("does nothing while frozen", async () => {
    const { result } = await setup({ survey: survey({ status: "submitted" }) })
    await act(async () => result.current.select("private"))
    expect(result.current.choice).toBe("public")
  })

  test("does nothing while submitting", async () => {
    const pending = deferred<"submitted">()
    const { result } = await setup({ submitSurvey: jest.fn(() => pending.promise) })
    await act(async () => {
      result.current.confirm()
    })
    expect(result.current.phase).toBe("submitting")
    await act(async () => result.current.select("private"))
    expect(result.current.choice).toBe("public")
    await act(async () => pending.resolve("submitted"))
  })
})

describe("confirm sequence", () => {
  test("flushes, stores the changed choice, then submits, in that order", async () => {
    const { result, params, calls } = await setup()
    await act(async () => result.current.select("private"))
    await act(async () => {
      result.current.confirm()
    })
    expect(calls).toEqual(["flush", "store:private", "submit"])
    expect(params.submitSurvey).toHaveBeenCalledWith("s-01")
    expect(params.setDraftVisibility).toHaveBeenCalledWith("s-01", "private")
    expect(params.announce).toHaveBeenCalledTimes(1)
    expect(params.announce).toHaveBeenCalledWith(fr.surveyFinish.submittingA11y)
    expect(params.onClose).toHaveBeenCalledTimes(1)
  })

  test("an unchanged choice is not stored again", async () => {
    const { result, calls } = await setup()
    await act(async () => {
      result.current.confirm()
    })
    expect(calls).toEqual(["flush", "submit"])
  })

  test("a second confirm while one runs is ignored", async () => {
    const pending = deferred<"submitted">()
    const { result, params } = await setup({ submitSurvey: jest.fn(() => pending.promise) })
    await act(async () => {
      result.current.confirm()
    })
    await act(async () => {
      result.current.confirm()
    })
    expect(params.flushDraft).toHaveBeenCalledTimes(1)
    expect(params.submitSurvey).toHaveBeenCalledTimes(1)
    expect(params.announce).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve("submitted"))
  })

  test("a failed flush shows the save error and never submits", async () => {
    const { result, params } = await setup({ flushDraft: jest.fn().mockResolvedValue(false) })
    await act(async () => {
      result.current.confirm()
    })
    expect(result.current.phase).toBe("saveError")
    expect(feedback.notify.error).toHaveBeenCalledTimes(1)
    expect(params.setDraftVisibility).not.toHaveBeenCalled()
    expect(params.submitSurvey).not.toHaveBeenCalled()
    expect(params.onClose).not.toHaveBeenCalled()
  })

  test("a rejected store shows the save error and never submits, then a retry works", async () => {
    const setDraftVisibility = jest
      .fn()
      .mockRejectedValueOnce(new Error("disk"))
      .mockResolvedValue("stored")
    const { result, params } = await setup({ setDraftVisibility })
    await act(async () => result.current.select("private"))
    await act(async () => {
      result.current.confirm()
    })
    expect(result.current.phase).toBe("saveError")
    expect(feedback.notify.error).toHaveBeenCalledTimes(1)
    expect(params.submitSurvey).not.toHaveBeenCalled()
    await act(async () => result.current.select("public"))
    expect(result.current.choice).toBe("public")
    await act(async () => result.current.select("private"))
    await act(async () => {
      result.current.confirm()
    })
    expect(params.submitSurvey).toHaveBeenCalledTimes(1)
    expect(params.onClose).toHaveBeenCalledTimes(1)
  })

  test("a frozen answer from the store locks the sheet and never submits", async () => {
    const { result, params } = await setup({
      setDraftVisibility: jest.fn().mockResolvedValue("frozen"),
    })
    await act(async () => result.current.select("private"))
    await act(async () => {
      result.current.confirm()
    })
    expect(result.current.phase).toBe("frozen")
    expect(params.submitSurvey).not.toHaveBeenCalled()
    expect(params.onClose).not.toHaveBeenCalled()
  })
})

describe("outcomes", () => {
  test("not submitted offline closes", async () => {
    const { result, params } = await setup({
      offline: true,
      submitSurvey: jest.fn().mockResolvedValue("not_submitted"),
    })
    await act(async () => {
      result.current.confirm()
    })
    expect(params.onClose).toHaveBeenCalledTimes(1)
  })

  test("not submitted online stays open with a new outcome key", async () => {
    const { result, params } = await setup({
      submitSurvey: jest.fn().mockResolvedValue("not_submitted"),
    })
    const before = result.current.outcomeKey
    await act(async () => {
      result.current.confirm()
    })
    expect(result.current.phase).toBe("notFinished")
    expect(result.current.outcomeKey).toBe(before + 1)
    expect(params.onClose).not.toHaveBeenCalled()
    // The controls are live again and a new attempt is possible.
    await act(async () => {
      result.current.confirm()
    })
    expect(params.submitSurvey).toHaveBeenCalledTimes(2)
    expect(result.current.outcomeKey).toBe(before + 2)
  })

  test("busy goes back to idle", async () => {
    const { result, params } = await setup({ submitSurvey: jest.fn().mockResolvedValue("busy") })
    await act(async () => {
      result.current.confirm()
    })
    expect(result.current.phase).toBe("idle")
    expect(params.onClose).not.toHaveBeenCalled()
  })

  test("a rejected submit is shown as not finished", async () => {
    const { result } = await setup({ submitSurvey: jest.fn().mockRejectedValue(new Error("boom")) })
    await act(async () => {
      result.current.confirm()
    })
    expect(result.current.phase).toBe("notFinished")
  })
})
