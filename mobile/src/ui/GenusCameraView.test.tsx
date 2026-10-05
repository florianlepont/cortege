import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../i18n"
import { GenusCameraView } from "./GenusCameraView"

const t = fr.genusRecognition

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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent = (name: string) => {
    const Component = ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
    Component.displayName = name
    return Component
  }
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}))
jest.mock("./AppText", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppText: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Text", props, children),
  }
})

const takePictureAsync = jest.fn()
jest.mock("expo-camera", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    CameraView: ReactRef.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      ReactRef.useImperativeHandle(ref, () => ({
        takePictureAsync: (...args: unknown[]) => takePictureAsync(...args),
      }))
      return ReactRef.createElement("CameraView", props)
    }),
  }
})

const byTestID = (tree: renderer.ReactTestRenderer, testID: string) =>
  tree.root.findAll((n) => n.props.testID === testID)[0]

function mount(overrides: Partial<React.ComponentProps<typeof GenusCameraView>> = {}) {
  const props = { onCapture: jest.fn(), onClose: jest.fn(), onError: jest.fn(), ...overrides }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<GenusCameraView {...props} />)
  })
  return { tree, props }
}

describe("GenusCameraView", () => {
  beforeEach(() => takePictureAsync.mockReset())

  it("shows the back camera with the framing guide and what to photograph", () => {
    const { tree } = mount()
    const camera = tree.root.findAll((n) => (n.type as unknown) === "CameraView")[0]
    expect(camera.props.facing).toBe("back")
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === t.guideA11y)).not.toHaveLength(0)
    expect(tree.root.findAll((n) => n.props.children === t.captureHint)).not.toHaveLength(0)
  })

  it("takes the picture and hands back its file", async () => {
    takePictureAsync.mockResolvedValue({ uri: "file:///mock/photo.jpg" })
    const { tree, props } = mount()
    await act(async () => {
      await byTestID(tree, "genus-camera-shutter").props.onPress()
    })
    expect(takePictureAsync).toHaveBeenCalledWith({ quality: 0.8 })
    expect(props.onCapture).toHaveBeenCalledWith("file:///mock/photo.jpg")
    expect(props.onError).not.toHaveBeenCalled()
  })

  it("reports a failed capture, and ignores a second press while one is under way", async () => {
    let rejectPicture: (error: Error) => void = () => undefined
    takePictureAsync.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectPicture = reject
        }),
    )
    const { tree, props } = mount()
    let first: Promise<void> = Promise.resolve()
    act(() => {
      first = byTestID(tree, "genus-camera-shutter").props.onPress()
    })
    await act(async () => {
      await byTestID(tree, "genus-camera-shutter").props.onPress()
    })
    expect(takePictureAsync).toHaveBeenCalledTimes(1)

    await act(async () => {
      rejectPicture(new Error("no camera"))
      await first
    })
    expect(props.onError).toHaveBeenCalledTimes(1)
    expect(props.onCapture).not.toHaveBeenCalled()
  })

  it("closes", () => {
    const { tree, props } = mount()
    act(() => byTestID(tree, "genus-camera-close").props.onPress())
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})
