import React from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"

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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)

  type PressableRenderProp<T> = T | ((state: { pressed: boolean }) => T)
  const resolvePressableProp = <T,>(prop: PressableRenderProp<T> | undefined): T | undefined =>
    typeof prop === "function"
      ? (prop as (state: { pressed: boolean }) => T)({ pressed: false })
      : prop

  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Pressable: ({
      children,
      style,
      ...props
    }: {
      children?: PressableRenderProp<React.ReactNode>
      style?: PressableRenderProp<unknown>
    }) =>
      ReactRef.createElement(
        "Pressable",
        { ...props, style: resolvePressableProp(style) },
        resolvePressableProp(children),
      ),
    Linking: { openSettings: jest.fn(async () => undefined) },
    StyleSheet: { create: <T,>(value: T): T => value },
  }
})

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

const mockRequestForegroundPermissionsAsync = jest.fn()
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: (...args: unknown[]) =>
    mockRequestForegroundPermissionsAsync(...args),
}))

const mockRequestCameraPermissionsAsync = jest.fn()
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: (...args: unknown[]) => mockRequestCameraPermissionsAsync(...args),
}))

import { Linking } from "react-native"
import { permissionIconColors } from "./permission-icons"
import { PermissionsPrimingScreen } from "./PermissionsPrimingScreen"

const t = fr.onboarding.permissions

function hasGlassFill(node: renderer.ReactTestInstance): boolean {
  const fill = defaultTheme.visual.glassCta.flat
  return (
    node.findAll((n) => {
      const style = ([] as unknown[]).concat(n.props.style ?? []).flat(Infinity)
      return style.some(
        (entry) => (entry as { backgroundColor?: string } | null)?.backgroundColor === fill,
      )
    }).length > 0
  )
}

function render(props: Partial<React.ComponentProps<typeof PermissionsPrimingScreen>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<PermissionsPrimingScreen onDone={jest.fn()} {...props} />)
  })
  return tree!
}

beforeEach(() => {
  mockRequestForegroundPermissionsAsync.mockReset()
  mockRequestCameraPermissionsAsync.mockReset()
})

describe("PermissionsPrimingScreen (ONB-01: location + camera priming)", () => {
  test("requesting location shows granted, on success", async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ granted: true })
    const tree = render()
    const action = tree.root.findByProps({ accessibilityLabel: t.location.action })
    await act(async () => {
      await action.props.onPress()
    })
    expect(tree.root.findByProps({ children: t.location.granted })).toBeTruthy()
  })

  test("a refused location permission shows a settings link", async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ granted: false })
    const tree = render()
    const action = tree.root.findByProps({ accessibilityLabel: t.location.action })
    await act(async () => {
      await action.props.onPress()
    })
    expect(tree.root.findByProps({ children: t.location.denied })).toBeTruthy()
    const link = tree.root.findByProps({ children: t.openSettings })
    act(() => {
      link.props.onPress()
    })
    expect(Linking.openSettings).toHaveBeenCalledTimes(1)
  })

  test("requesting the camera permission shows granted, on success", async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    const tree = render()
    const action = tree.root.findByProps({ accessibilityLabel: t.camera.action })
    await act(async () => {
      await action.props.onPress()
    })
    expect(tree.root.findByProps({ children: t.camera.granted })).toBeTruthy()
  })

  test("a refused camera permission shows a settings link", async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false })
    const tree = render()
    const action = tree.root.findByProps({ accessibilityLabel: t.camera.action })
    await act(async () => {
      await action.props.onPress()
    })
    expect(tree.root.findByProps({ children: t.camera.denied })).toBeTruthy()
  })

  test("the location and camera icons use the readable tokens, not the brand forest", () => {
    const tree = render()
    const colors = permissionIconColors(defaultTheme)
    for (const name of ["location-outline", "camera-outline"]) {
      expect(tree.root.findByProps({ name }).props.color).toBe(colors.icon)
    }
  })

  test("the granted check and the denied cross use the readable tokens", async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ granted: true })
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false })
    const tree = render()
    await act(async () => {
      await tree.root.findByProps({ accessibilityLabel: t.location.action }).props.onPress()
      await tree.root.findByProps({ accessibilityLabel: t.camera.action }).props.onPress()
    })
    const colors = permissionIconColors(defaultTheme)
    expect(tree.root.findByProps({ name: "checkmark-circle" }).props.color).toBe(colors.grantedIcon)
    expect(tree.root.findByProps({ name: "close-circle" }).props.color).toBe(colors.deniedIcon)
  })

  test("Continuer is the green glass button (D-27c)", () => {
    const tree = render()
    expect(hasGlassFill(tree.root.findByProps({ accessibilityLabel: t.continue }))).toBe(true)
  })

  test("Continuer calls onDone regardless of permission outcome", () => {
    const onDone = jest.fn()
    const tree = render({ onDone })
    const button = tree.root.findByProps({ accessibilityLabel: t.continue })
    act(() => {
      button.props.onPress()
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
