import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"

const mockNavigation = { setOptions: jest.fn(), dispatch: jest.fn() }
type PreventCallback = (event: { data: { action: { type: string } } }) => void
const mockPrevent: { enabled?: boolean; callback?: PreventCallback } = {}

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockNavigation,
  usePreventRemove: (enabled: boolean, callback: PreventCallback) => {
    mockPrevent.enabled = enabled
    mockPrevent.callback = callback
  },
}))

import { WizardNativeHeader } from "./WizardNativeHeader"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  mockNavigation.setOptions.mockClear()
  mockNavigation.dispatch.mockClear()
  delete mockPrevent.enabled
  delete mockPrevent.callback
})

function mount(props: React.ComponentProps<typeof WizardNativeHeader>) {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(<WizardNativeHeader {...props} />)
  })
  return tree
}

describe("WizardNativeHeader (12.2-17)", () => {
  test("renders nothing and puts the step counter in the native bar", () => {
    const tree = mount({ title: "Étape 1 sur 4", canStepBack: false, onStepBack: jest.fn() })
    expect(tree.toJSON()).toBeNull()
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({ title: "Étape 1 sur 4" })
    act(() => {
      tree.update(<WizardNativeHeader title="Étape 2 sur 4" canStepBack onStepBack={jest.fn()} />)
    })
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({ title: "Étape 2 sur 4" })
  })

  test("on the first question the system back leaves the wizard (nothing is prevented)", () => {
    mount({ title: "Étape 1 sur 4", canStepBack: false, onStepBack: jest.fn() })
    expect(mockPrevent.enabled).toBe(false)
  })

  test.each(["GO_BACK", "POP"])(
    "past it, a %s (back button, edge swipe) returns to the previous question",
    (type) => {
      const onStepBack = jest.fn()
      mount({ title: "Étape 3 sur 4", canStepBack: true, onStepBack })
      expect(mockPrevent.enabled).toBe(true)
      mockPrevent.callback?.({ data: { action: { type } } })
      expect(onStepBack).toHaveBeenCalledTimes(1)
      expect(mockNavigation.dispatch).not.toHaveBeenCalled()
    },
  )

  test("any other removal (the parcel step's reset once the draft exists) goes through", () => {
    const onStepBack = jest.fn()
    mount({ title: "Étape 3 sur 4", canStepBack: true, onStepBack })
    const action = { type: "RESET" }
    mockPrevent.callback?.({ data: { action } })
    expect(onStepBack).not.toHaveBeenCalled()
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(action)
  })
})
