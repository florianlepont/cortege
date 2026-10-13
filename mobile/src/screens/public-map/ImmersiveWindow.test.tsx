import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    StyleSheet: {
      create: <T,>(value: T): T => value,
      absoluteFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    },
  }
})

import type { SharedValue } from "react-native-reanimated"
import { brandElevation, brandRadius } from "../../app/brand-tokens"
import { buildTheme, defaultTheme, type BrandTheme } from "../../app/theme"

let mockTheme: BrandTheme = defaultTheme
jest.mock("../../app/theme", () => ({
  ...jest.requireActual("../../app/theme"),
  useBrandTheme: () => mockTheme,
}))

import { BUTTON_FADE_IN_DELAY_MS, BUTTON_FADE_MS } from "../../map/swipe-machine"
import { BUTTON_RESET_SETTLE_MS, ImmersiveButtons, ImmersiveWindow } from "./ImmersiveWindow"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  mockTheme = defaultTheme
})

const shared = (value: number) => ({ value }) as unknown as SharedValue<number>
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function render(element: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  return tree
}
const TARGET = { scaleX: 0.8, scaleY: 0.76, shiftY: -48 }
const byTestId = (tree: renderer.ReactTestRenderer, id: string): ReactTestInstance =>
  tree.root.findByProps({ testID: id })

describe("ImmersiveWindow, light", () => {
  it("receded: scales 0.8 by 0.76 moved up 48 pt, radius 22, canvas background and the soft shadow", () => {
    const tree = render(
      <ImmersiveWindow progress={shared(1)} applied target={TARGET}>
        <></>
      </ImmersiveWindow>,
    )
    const outer = flat(byTestId(tree, "immersive-window").props.style)
    const { shadow } = buildTheme("light").visual.immersive
    expect(outer.transform).toEqual([{ translateY: -48 }, { scaleX: 0.8 }, { scaleY: 0.76 }])
    expect(outer.borderRadius).toBe(brandRadius.card)
    expect(outer.backgroundColor).toBe(defaultTheme.colors.canvas)
    expect(outer.shadowColor).toBe(shadow.color)
    expect(outer.shadowOpacity).toBe(shadow.opacity)
    expect(outer.shadowRadius).toBe(shadow.radius)
    expect(outer.shadowOffset).toEqual({ width: 0, height: shadow.offsetY })
    expect(outer.elevation).toBe(brandElevation.level3.elevation)
    expect(tree.root.findAllByProps({ testID: "immersive-window-ring" })).toHaveLength(0)
  })

  it("the clip rounds the same radius and clips its children, which it renders", () => {
    const tree = render(
      <ImmersiveWindow progress={shared(1)} applied target={TARGET}>
        <ChildProbe />
      </ImmersiveWindow>,
    )
    const clip = clipOf(tree)
    const style = flat(clip.props.style)
    expect(style.borderRadius).toBe(brandRadius.card)
    expect(style.overflow).toBe("hidden")
  })

  it("halfway: the values follow the progress", () => {
    const tree = render(<ImmersiveWindow progress={shared(0.5)} applied target={TARGET} />)
    const outer = flat(byTestId(tree, "immersive-window").props.style)
    const { shadow } = buildTheme("light").visual.immersive
    const [shift, zoomX, zoomY] = outer.transform as [
      { translateY: number },
      { scaleX: number },
      { scaleY: number },
    ]
    expect(shift.translateY).toBe(-24)
    expect(zoomX.scaleX).toBeCloseTo(0.9, 5)
    expect(zoomY.scaleY).toBeCloseTo(0.88, 5)
    expect(outer.borderRadius).toBe(brandRadius.card / 2)
    expect(outer.shadowOpacity).toBeCloseTo(shadow.opacity / 2, 5)
    expect(outer.elevation).toBe(brandElevation.level3.elevation / 2)
  })

  it("at rest: full size, no radius, no shadow, and a plain full-size clip", () => {
    const tree = render(
      <ImmersiveWindow progress={shared(0)} applied target={TARGET}>
        <ChildProbe />
      </ImmersiveWindow>,
    )
    const root = byTestId(tree, "immersive-window")
    const outer = flat(root.props.style)
    // At rest the tree is the plain full-size view of before the effect: no transform, no
    // background, no shadow, and no clipping (native glass below samples a plain tree).
    expect(outer.transform).toEqual([])
    expect(outer.backgroundColor).toBe("transparent")
    expect(outer.borderRadius).toBe(0)
    expect(outer.shadowOpacity).toBe(0)
    expect(outer.elevation).toBe(0)
    const clip = clipOf(tree)
    const style = flat(clip.props.style)
    // Same frame as the parent (absolute fill), no radius, and no touch of its own.
    expect(style).toMatchObject({ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 })
    expect(style.borderRadius).toBe(0)
    expect(style.overflow).toBe("visible")
    expect(clip.props.pointerEvents).toBe("box-none")
    expect(root.props.pointerEvents).toBe("box-none")
  })

  it("not applied: no scale, no radius, no shadow and no ring at any progress", () => {
    for (const progress of [0, 0.5, 1]) {
      const tree = render(
        <ImmersiveWindow progress={shared(progress)} applied={false} target={TARGET}>
          <ChildProbe />
        </ImmersiveWindow>,
      )
      const outer = flat(byTestId(tree, "immersive-window").props.style)
      expect(outer.transform).toBeUndefined()
      expect(outer.borderRadius).toBeUndefined()
      expect(outer.shadowOpacity).toBeUndefined()
      expect(outer.elevation).toBeUndefined()
      const clip = clipOf(tree)
      expect(flat(clip.props.style).borderRadius).toBeUndefined()
      expect(tree.root.findAllByProps({ testID: "immersive-window-ring" })).toHaveLength(0)
    }
  })
})

describe("ImmersiveWindow, dark", () => {
  beforeEach(() => {
    mockTheme = buildTheme("dark")
  })

  it("receded: the canvas background, the faint shadow and the 1 pt ring", () => {
    const tree = render(<ImmersiveWindow progress={shared(1)} applied target={TARGET} />)
    const { shadow, ring } = buildTheme("dark").visual.immersive
    const outer = flat(byTestId(tree, "immersive-window").props.style)
    expect(outer.backgroundColor).toBe(buildTheme("dark").colors.canvas)
    expect(outer.shadowOpacity).toBe(shadow.opacity)
    const ringNode = byTestId(tree, "immersive-window-ring")
    const style = flat(ringNode.props.style)
    expect(style.borderWidth).toBe(1)
    expect(style.borderColor).toBe(ring)
    expect(style.opacity).toBe(1)
    expect(style.borderRadius).toBe(brandRadius.card)
    expect(ringNode.props.pointerEvents).toBe("none")
  })

  it("the ring shows at the progress' opacity and is invisible at rest", () => {
    const half = render(<ImmersiveWindow progress={shared(0.5)} applied target={TARGET} />)
    expect(flat(byTestId(half, "immersive-window-ring").props.style).opacity).toBe(0.5)
    const rest = render(<ImmersiveWindow progress={shared(0)} applied target={TARGET} />)
    expect(flat(byTestId(rest, "immersive-window-ring").props.style).opacity).toBe(0)
  })

  it("not applied: no ring", () => {
    const tree = render(<ImmersiveWindow progress={shared(1)} applied={false} target={TARGET} />)
    expect(tree.root.findAllByProps({ testID: "immersive-window-ring" })).toHaveLength(0)
  })
})

describe("ImmersiveButtons", () => {
  it("shown: absolute fill, passes touches through to its children, at the given opacity", () => {
    const tree = render(
      <ImmersiveButtons opacity={shared(1)} hidden={false}>
        <ChildProbe />
      </ImmersiveButtons>,
    )
    const node = byTestId(tree, "immersive-buttons")
    expect(node.props.pointerEvents).toBe("box-none")
    expect(node.props.accessibilityElementsHidden).toBe(false)
    expect(node.props.importantForAccessibility).toBe("auto")
    // At rest the wrapper carries no opacity property at all.
    expect(flat(node.props.style)).toMatchObject({ position: "absolute" })
    expect(flat(node.props.style)).not.toHaveProperty("opacity")
    expect(tree.root.findAllByType("Child" as never)).toHaveLength(1)
  })

  it("stuck faded out with the mode off (the animation never finished): the value is forced back to 1, then the opacity is dropped", () => {
    jest.useFakeTimers()
    try {
      const stuck = shared(0)
      const make = (hidden: boolean) => (
        <ImmersiveButtons opacity={stuck} hidden={hidden}>
          <ChildProbe />
        </ImmersiveButtons>
      )
      const tree = render(make(true))
      act(() => tree.update(make(false)))
      // The fade-in was meant to run; here it never moved the value.
      expect(stuck.value).toBe(0)
      act(() => {
        jest.advanceTimersByTime(BUTTON_FADE_IN_DELAY_MS + BUTTON_FADE_MS + 40)
      })
      expect(stuck.value).toBe(1)
      // The animated style stays until the forced value had a moment to reach the view.
      expect(flat(byTestId(tree, "immersive-buttons").props.style)).toHaveProperty("opacity")
      act(() => {
        jest.advanceTimersByTime(BUTTON_RESET_SETTLE_MS)
      })
      expect(flat(byTestId(tree, "immersive-buttons").props.style)).not.toHaveProperty("opacity")
    } finally {
      jest.useRealTimers()
    }
  })

  it("hiding again during the fade-in cancels the reset: the buttons fade out as asked", () => {
    jest.useFakeTimers()
    try {
      const value = shared(0)
      const make = (hidden: boolean) => (
        <ImmersiveButtons opacity={value} hidden={hidden}>
          <ChildProbe />
        </ImmersiveButtons>
      )
      const tree = render(make(true))
      act(() => tree.update(make(false)))
      act(() => {
        jest.advanceTimersByTime(BUTTON_FADE_IN_DELAY_MS)
      })
      act(() => tree.update(make(true)))
      act(() => {
        jest.advanceTimersByTime(5000)
      })
      expect(value.value).toBe(0)
      expect(byTestId(tree, "immersive-buttons").props.pointerEvents).toBe("none")
    } finally {
      jest.useRealTimers()
    }
  })

  it("the fade exists only while the buttons are hidden or coming back, then the opacity is dropped", () => {
    jest.useFakeTimers()
    try {
      const make = (hidden: boolean) => (
        <ImmersiveButtons opacity={shared(hidden ? 0 : 1)} hidden={hidden}>
          <ChildProbe />
        </ImmersiveButtons>
      )
      const tree = render(make(false))
      act(() => tree.update(make(true)))
      expect(flat(byTestId(tree, "immersive-buttons").props.style).opacity).toBe(0)
      act(() => tree.update(make(false)))
      // Fading back in: the animated opacity is still there.
      expect(flat(byTestId(tree, "immersive-buttons").props.style)).toHaveProperty("opacity")
      act(() => {
        jest.advanceTimersByTime(
          BUTTON_FADE_IN_DELAY_MS + BUTTON_FADE_MS + 40 + BUTTON_RESET_SETTLE_MS,
        )
      })
      expect(flat(byTestId(tree, "immersive-buttons").props.style)).not.toHaveProperty("opacity")
    } finally {
      jest.useRealTimers()
    }
  })

  it("hidden: no touch, out of the accessibility tree, at the given opacity", () => {
    const tree = render(
      <ImmersiveButtons opacity={shared(0.25)} hidden>
        <ChildProbe />
      </ImmersiveButtons>,
    )
    const node = byTestId(tree, "immersive-buttons")
    expect(node.props.pointerEvents).toBe("none")
    expect(node.props.accessibilityElementsHidden).toBe(true)
    expect(node.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(flat(node.props.style).opacity).toBe(0.25)
  })
})

// The host view directly around the child: the walk skips the composite wrappers in between.
function clipOf(tree: renderer.ReactTestRenderer): ReactTestInstance {
  let node = tree.root.findByType("Child" as never).parent as ReactTestInstance
  while (typeof node.type !== "string") node = node.parent as ReactTestInstance
  return node
}

function ChildProbe() {
  return React.createElement("Child")
}
