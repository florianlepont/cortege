import React from "react"
import renderer, { act } from "react-test-renderer"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    if (message.includes("not configured to support act")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

const mockMarkOnboardingSeen = jest.fn(async () => undefined)
jest.mock("../../storage/onboarding-preference", () => ({
  markOnboardingSeen: () => mockMarkOnboardingSeen(),
}))

const mockCarouselProps: { onSkip?: () => void; onFinish?: () => void } = {}
jest.mock("./OnboardingCarouselScreen", () => ({
  OnboardingCarouselScreen: (props: { onSkip: () => void; onFinish: () => void }) => {
    mockCarouselProps.onSkip = props.onSkip
    mockCarouselProps.onFinish = props.onFinish
    return null
  },
}))

const mockPermissionsProps: { onDone?: () => void } = {}
jest.mock("./PermissionsPrimingScreen", () => ({
  PermissionsPrimingScreen: (props: { onDone: () => void }) => {
    mockPermissionsProps.onDone = props.onDone
    return null
  },
}))

import { OnboardingFlow } from "./OnboardingFlow"

beforeEach(() => {
  mockMarkOnboardingSeen.mockClear()
  delete mockCarouselProps.onSkip
  delete mockCarouselProps.onFinish
  delete mockPermissionsProps.onDone
})

describe("OnboardingFlow (ONB-01: carousel then permissions priming)", () => {
  test("starts on the carousel", () => {
    act(() => {
      renderer.create(<OnboardingFlow onDone={jest.fn()} />)
    })
    expect(mockCarouselProps.onSkip).toEqual(expect.any(Function))
    expect(mockPermissionsProps.onDone).toBeUndefined()
  })

  test("skipping the carousel marks onboarding seen and calls onDone directly", () => {
    const onDone = jest.fn()
    act(() => {
      renderer.create(<OnboardingFlow onDone={onDone} />)
    })
    act(() => {
      mockCarouselProps.onSkip?.()
    })
    expect(mockMarkOnboardingSeen).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  test("finishing the carousel moves to the permissions screen, not onDone yet", () => {
    const onDone = jest.fn()
    act(() => {
      renderer.create(<OnboardingFlow onDone={onDone} />)
    })
    act(() => {
      mockCarouselProps.onFinish?.()
    })
    expect(onDone).not.toHaveBeenCalled()
    expect(mockPermissionsProps.onDone).toEqual(expect.any(Function))
  })

  test("continuing past permissions marks onboarding seen and calls onDone", () => {
    const onDone = jest.fn()
    act(() => {
      renderer.create(<OnboardingFlow onDone={onDone} />)
    })
    act(() => {
      mockCarouselProps.onFinish?.()
    })
    act(() => {
      mockPermissionsProps.onDone?.()
    })
    expect(mockMarkOnboardingSeen).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
