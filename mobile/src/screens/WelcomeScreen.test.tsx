jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  const value = () => ({ setValue: jest.fn() })
  return {
    Animated: {
      Value: jest.fn(value),
      Image: mockComponent("Animated.Image"),
      spring: jest.fn(() => ({})),
      parallel: jest.fn(() => ({ start: jest.fn() })),
    },
    AccessibilityInfo: { isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)) },
    Easing: {},
    Image: mockComponent("Image"),
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: {} },
    useWindowDimensions: () => ({ width: 390, height: 800 }),
    View: mockComponent("View"),
    Text: mockComponent("Text"),
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}))
jest.mock("../ui/GlassButton", () => ({ GlassButton: "GlassButton" }))
jest.mock("../ui/AppText", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppText: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Text", props, children),
  }
})
jest.mock("../ui/BrandHighlight", () => ({ BrandHighlight: "BrandHighlight" }))
jest.mock("../ui/ConfettiBurst", () => ({ ConfettiBurst: "ConfettiBurst" }))

import renderer, { act } from "react-test-renderer"
import { AccessibilityInfo, Animated } from "react-native"
import { notificationAsync } from "expo-haptics"
import { fr } from "../i18n"
import { WelcomeScreen } from "./WelcomeScreen"

const reduceMotion = AccessibilityInfo.isReduceMotionEnabled as jest.Mock

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

afterAll(() => jest.restoreAllMocks())

beforeEach(() => {
  ;(notificationAsync as jest.Mock).mockClear()
  ;(Animated.parallel as jest.Mock).mockClear()
  ;(Animated.spring as jest.Mock).mockClear()
  reduceMotion.mockReset().mockImplementation(() => Promise.resolve(false))
})

async function mount(props: { name: string; onContinue?: () => void }) {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<WelcomeScreen onContinue={jest.fn()} {...props} />)
  })
  return tree
}

function texts(tree: renderer.ReactTestRenderer): string[] {
  return tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
}

describe("WelcomeScreen (OA-08)", () => {
  test("greets the new member by first name", async () => {
    const tree = await mount({ name: "Marie" })
    expect(texts(tree)).toContain(fr.welcome.title({ name: "Marie" }))
    expect(texts(tree)).toContain(fr.welcome.body)
    expect(tree.root.findByProps({ accessibilityRole: "header" })).toBeTruthy()
  })

  test("greets without a name when there is none", async () => {
    const tree = await mount({ name: "" })
    expect(texts(tree)).toContain(fr.welcome.titleNoName)
  })

  test("the button starts the app", async () => {
    const onContinue = jest.fn()
    const tree = await mount({ name: "Marie", onContinue })
    const button = tree.root.findByType("GlassButton" as never)
    expect(button.props.label).toBe(fr.welcome.start)
    button.props.onPress()
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  test("a success tap is felt on arrival", async () => {
    await mount({ name: "Marie" })
    expect(notificationAsync).toHaveBeenCalledTimes(1)
  })

  test("the animals pop in one after another and the confetti falls", async () => {
    const tree = await mount({ name: "Marie" })
    expect(Animated.spring).toHaveBeenCalledTimes(4)
    expect(Animated.parallel).toHaveBeenCalledTimes(1)
    expect(tree.root.findAllByType("ConfettiBurst" as never)).toHaveLength(1)
    expect(tree.root.findAllByType("Animated.Image" as never)).toHaveLength(4)
    // The marten is a plain image, decoration only.
    const images = tree.root.findAllByType("Image" as never)
    expect(images).toHaveLength(1)
    expect(images[0].props.accessible).toBe(false)
  })

  test("with Reduce Motion the animals are simply there and nothing falls", async () => {
    reduceMotion.mockImplementation(() => Promise.resolve(true))
    const tree = await mount({ name: "Marie" })
    expect(Animated.spring).not.toHaveBeenCalled()
    expect(tree.root.findAllByType("ConfettiBurst" as never)).toHaveLength(0)
    expect(tree.root.findAllByType("Animated.Image" as never)).toHaveLength(4)
  })

  test("leaving before the setting is read starts nothing", async () => {
    let resolve!: (value: boolean) => void
    reduceMotion.mockImplementation(() => new Promise<boolean>((done) => (resolve = done)))
    let tree!: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<WelcomeScreen name="Marie" onContinue={jest.fn()} />)
    })
    act(() => tree.unmount())
    await act(async () => {
      resolve(false)
    })
    expect(Animated.spring).not.toHaveBeenCalled()
  })
})
