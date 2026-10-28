import React from "react"
import renderer, { act } from "react-test-renderer"
import { AppText as Text } from "./AppText"
import { defaultTheme } from "../app/theme"
import { DMH_STEPPER_SIZE, DmhCounterStepper } from "./DmhCounterStepper"

const mockSelection = jest.fn()
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./feedback", () => ({ feedback: { selection: () => mockSelection() } }))

const originalConsoleError = console.error

beforeEach(() => {
  mockSelection.mockClear()
})

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
  jest.useFakeTimers()
})

afterAll(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

type Node = renderer.ReactTestInstance
type Style = Record<string, unknown>

const flatten = (style: unknown): Style =>
  typeof style === "function"
    ? flatten(style({ pressed: false }))
    : Array.isArray(style)
      ? style.reduce<Style>((acc, item) => ({ ...acc, ...flatten(item) }), {})
      : ((style as Style | null | undefined) ?? {})

function render(props: Partial<React.ComponentProps<typeof DmhCounterStepper>> = {}) {
  const onStep = jest.fn()
  const onSubmitText = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <DmhCounterStepper
        label="5. Aubier apparent"
        value={3}
        onStep={onStep}
        onSubmitText={onSubmitText}
        testID="s"
        {...props}
      />,
    )
  })
  const root = tree!.root
  const findAllByTestID = (id: string): Node[] => root.findAll((n) => n.props.testID === id)
  const findByTestID = (id: string): Node => findAllByTestID(id)[0]
  // The outer element: its testID is also on the component itself, so take the host View.
  const findOuter = (): Node => findAllByTestID("s").find((n) => (n.type as unknown) === "View")!
  const rerender = (next: Partial<React.ComponentProps<typeof DmhCounterStepper>>): void => {
    act(() => {
      tree!.update(
        <DmhCounterStepper
          label="5. Aubier apparent"
          value={3}
          onStep={onStep}
          onSubmitText={onSubmitText}
          testID="s"
          {...props}
          {...next}
        />,
      )
    })
  }
  const press = (id: string): void => {
    act(() => {
      findByTestID(id).props.onPressIn()
    })
    act(() => {
      findByTestID(id).props.onPressOut()
    })
  }
  return {
    tree: tree!,
    onStep,
    onSubmitText,
    findByTestID,
    findAllByTestID,
    findOuter,
    press,
    rerender,
  }
}

describe("DmhCounterStepper", () => {
  test("one 112 x 48 capsule of two 56 x 48 segments, the count plain text of 44 x 48 at least (O-32-1)", () => {
    expect(DMH_STEPPER_SIZE).toBe(48)
    const { findByTestID, tree } = render()
    for (const id of ["s-decrease", "s-increase"]) {
      const style = flatten(findByTestID(id).props.style)
      expect(style.width).toBe(56)
      expect(style.height).toBe(DMH_STEPPER_SIZE)
      // No box of its own: the capsule carries the fill.
      expect(style.backgroundColor).toBeUndefined()
      expect(style.borderWidth).toBeUndefined()
    }
    const count = flatten(findByTestID("s-value").props.style)
    expect(count.minWidth).toBe(44)
    expect(count.height).toBe(DMH_STEPPER_SIZE)
    expect(count.backgroundColor).toBeUndefined()
    expect(count.borderWidth).toBeUndefined()
    const capsule = tree.root.findAll((n) => {
      const style = flatten(n.props.style)
      return style.width === 112
    })[0]
    const capsuleStyle = flatten(capsule.props.style)
    expect(capsuleStyle.height).toBe(48)
    expect(capsuleStyle.borderRadius).toBe(999)
    expect(capsuleStyle.backgroundColor).toBe(defaultTheme.visual.control.fill)
  })

  test("the glyphs use the call-to-action ink, the pressed half takes the soft fill", () => {
    const { findByTestID, tree } = render()
    const glyphs = tree.root.findAll((n) => (n.type as unknown) === "Ionicons")
    expect(glyphs).toHaveLength(2)
    for (const glyph of glyphs) {
      expect(glyph.props.color).toBe(defaultTheme.semanticColors.ctaPrimary)
      expect(glyph.props.size).toBe(22)
    }
    const pressed = findByTestID("s-increase").props.style({ pressed: true })
    expect(flatten(pressed).backgroundColor).toBe(defaultTheme.colors.surfaceSoft)
  })

  test("each single tap of - or + gives a selection tick, a repeat does not, and - at 0 none", () => {
    const { press, findByTestID, rerender } = render({ value: 3 })
    press("s-increase")
    expect(mockSelection).toHaveBeenCalledTimes(1)
    press("s-decrease")
    expect(mockSelection).toHaveBeenCalledTimes(2)
    mockSelection.mockClear()
    act(() => {
      findByTestID("s-increase").props.onPressIn()
    })
    act(() => {
      jest.advanceTimersByTime(120 * 8)
    })
    act(() => {
      findByTestID("s-increase").props.onPressOut()
    })
    expect(mockSelection).toHaveBeenCalledTimes(1)
    mockSelection.mockClear()
    rerender({ value: 0 })
    press("s-decrease")
    expect(mockSelection).not.toHaveBeenCalled()
  })

  test("pressing + steps up by one, pressing - steps down by one", () => {
    const { onStep, press, rerender } = render({ value: 3 })
    press("s-increase")
    expect(onStep).toHaveBeenLastCalledWith(4)
    rerender({ value: 4 })
    press("s-decrease")
    expect(onStep).toHaveBeenLastCalledWith(3)
    expect(onStep).toHaveBeenCalledTimes(2)
  })

  test("- at 0 is disabled and calls nothing", () => {
    const { onStep, press, findByTestID } = render({ value: 0 })
    press("s-decrease")
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(onStep).not.toHaveBeenCalled()
    const button = findByTestID("s-decrease")
    expect(button.props.accessibilityState).toEqual({ disabled: true })
    // The glyph alone dims; the capsule keeps its fill.
    const glyph = button.findAll((n) => (n.type as unknown) === "Ionicons")[0]
    expect(flatten(glyph.props.style).opacity).toBe(0.4)
    expect(flatten(button.props.style({ pressed: true })).backgroundColor).toBeUndefined()
  })

  test("holding + repeats and releasing stops", () => {
    const { onStep, findByTestID } = render({ value: 0 })
    act(() => {
      findByTestID("s-increase").props.onPressIn()
    })
    act(() => {
      jest.advanceTimersByTime(120 * 3)
    })
    act(() => {
      findByTestID("s-increase").props.onPressOut()
    })
    const calls = onStep.mock.calls.length
    expect(calls).toBeGreaterThan(3)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(onStep).toHaveBeenCalledTimes(calls)
  })

  test("tapping the count opens a numeric field prefilled with the count", () => {
    const { findByTestID, findAllByTestID } = render({ value: 7 })
    expect(findAllByTestID("s-input")).toHaveLength(0)
    act(() => {
      findByTestID("s-value").props.onPress()
    })
    const input = findByTestID("s-input")
    expect(input.props.value).toBe("7")
    expect(input.props.keyboardType).toBe("numeric")
    expect(input.props.inputAccessoryViewButtonLabel).toBe("Terminé")
    expect(input.props.autoFocus).toBe(true)
    // The same metrics as the plain count, with a 2 pt underline while editing.
    const style = flatten(input.props.style)
    expect(style.minWidth).toBe(44)
    expect(style.borderBottomWidth).toBe(2)
    expect(style.borderBottomColor).toBe(defaultTheme.colors.inputBorder)
  })

  test("blur hands the typed text back as is and closes the field", () => {
    const { onSubmitText, findByTestID, findAllByTestID } = render({ value: 7 })
    act(() => {
      findByTestID("s-value").props.onPress()
    })
    act(() => {
      findByTestID("s-input").props.onChangeText("12,5")
    })
    act(() => {
      findByTestID("s-input").props.onBlur()
    })
    expect(onSubmitText).toHaveBeenCalledTimes(1)
    expect(onSubmitText).toHaveBeenCalledWith("12,5")
    expect(findAllByTestID("s-input")).toHaveLength(0)
  })

  test("submit passes an empty text as is, and a blur after it does not commit twice", () => {
    const { onSubmitText, findByTestID } = render({ value: 7 })
    act(() => {
      findByTestID("s-value").props.onPress()
    })
    act(() => {
      findByTestID("s-input").props.onChangeText("")
    })
    const input = findByTestID("s-input")
    act(() => {
      input.props.onSubmitEditing()
      input.props.onBlur()
    })
    expect(onSubmitText).toHaveBeenCalledTimes(1)
    expect(onSubmitText).toHaveBeenCalledWith("")
  })

  test("the outer element is one adjustable accessibility element", () => {
    const { findOuter } = render({ value: 3 })
    const outer = findOuter()
    expect(outer.props.accessible).toBe(true)
    expect(outer.props.accessibilityRole).toBe("adjustable")
    expect(outer.props.accessibilityLabel).toBe("Nombre d'arbres, 5. Aubier apparent")
    expect(outer.props.accessibilityValue).toEqual({ text: "3 arbres" })
    expect(outer.props.accessibilityHint).toBe("Double-tapez pour saisir le nombre")
    expect(outer.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual([
      "increment",
      "decrement",
      "activate",
    ])
    const inner = outer.findAll(
      (n) => n.props.importantForAccessibility === "no-hide-descendants",
    )[0]
    expect(inner.props.accessibilityElementsHidden).toBe(true)
  })

  test("the value text reads 1 arbre for one tree", () => {
    const { findOuter } = render({ value: 1 })
    expect(findOuter().props.accessibilityValue).toEqual({ text: "1 arbre" })
  })

  test("increment and decrement actions step; decrement does nothing at 0", () => {
    const { onStep, findOuter } = render({ value: 3 })
    const fire = (actionName: string): void => {
      act(() => {
        findOuter().props.onAccessibilityAction({ nativeEvent: { actionName } })
      })
    }
    fire("increment")
    expect(onStep).toHaveBeenLastCalledWith(4)
    fire("decrement")
    expect(onStep).toHaveBeenLastCalledWith(2)
    expect(onStep).toHaveBeenCalledTimes(2)

    const zero = render({ value: 0 })
    act(() => {
      zero.findOuter().props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } })
    })
    expect(zero.onStep).not.toHaveBeenCalled()
  })

  test("the activate action opens the typed entry", () => {
    const { findOuter, findAllByTestID } = render({ value: 3 })
    act(() => {
      findOuter().props.onAccessibilityAction({ nativeEvent: { actionName: "activate" } })
    })
    expect(
      findAllByTestID("s-input").filter((n) => (n.type as unknown) === "TextInput"),
    ).toHaveLength(1)
  })

  test("editable false: only the count as text, no buttons, no actions, no field", () => {
    const { findByTestID, findAllByTestID, findOuter } = render({ value: 4, editable: false })
    expect(findAllByTestID("s-decrease")).toHaveLength(0)
    expect(findAllByTestID("s-increase")).toHaveLength(0)
    const count = findByTestID("s-value")
    expect(String(count.findAllByType(Text)[0]?.props.children ?? count.props.children)).toBe("4")
    const outer = findOuter()
    expect(outer.props.accessibilityRole).not.toBe("adjustable")
    expect(outer.props.accessibilityActions).toBeUndefined()
    expect(outer.props.onAccessibilityAction).toBeUndefined()
    expect(outer.props.accessibilityValue).toEqual({ text: "4 arbres" })
    expect(count.props.onPress).toBeUndefined()
  })
})
