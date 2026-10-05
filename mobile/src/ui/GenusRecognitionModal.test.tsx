import React from "react"
import renderer, { act } from "react-test-renderer"
import { GenusRecognitionModal } from "./GenusRecognitionModal"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
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
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Modal: mockComponent("Modal"),
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

jest.mock("./AppButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppButton: ({
      label,
      onPress,
      testID,
    }: {
      label: string
      onPress: () => void
      testID?: string
    }) => ReactRef.createElement("AppButton", { label, onPress, testID }),
  }
})

jest.mock("./AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})

jest.mock("./AppText", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppText: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Text", props, children),
  }
})

const requestCameraPermissionsAsync = jest.fn()
const launchCameraAsync = jest.fn()
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: () => requestCameraPermissionsAsync(),
  launchCameraAsync: (...args: unknown[]) => launchCameraAsync(...args),
}))

const classifyGenusPhoto = jest.fn()
jest.mock("../recognition/genusClassifierModel", () => ({
  classifyGenusPhoto: (...args: unknown[]) => classifyGenusPhoto(...args),
}))

function findByTestID(tree: renderer.ReactTestRenderer, testID: string) {
  return tree.root.findAll((n) => n.props.testID === testID)[0]
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve()
  })
}

describe("GenusRecognitionModal", () => {
  beforeEach(() => {
    requestCameraPermissionsAsync.mockReset()
    launchCameraAsync.mockReset()
    classifyGenusPhoto.mockReset()
  })

  it("shows the manual-fallback message when camera permission is refused", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: false })
    const onClose = jest.fn()
    let tree: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <GenusRecognitionModal visible onClose={onClose} onConfirmGenus={jest.fn()} />,
      )
    })

    // OA-33: the camera opens as soon as the sheet does.
    await flushMicrotasks()

    expect(findByTestID(tree!, "genus-recognition-fallback")).toBeDefined()
    expect(launchCameraAsync).not.toHaveBeenCalled()
  })

  it("opens the camera straight away and closes the sheet when that first capture is cancelled", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    launchCameraAsync.mockResolvedValue({ canceled: true, assets: [] })
    const onClose = jest.fn()
    act(() => {
      renderer.create(
        <GenusRecognitionModal visible onClose={onClose} onConfirmGenus={jest.fn()} />,
      )
    })

    await flushMicrotasks()

    expect(launchCameraAsync).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(classifyGenusPhoto).not.toHaveBeenCalled()
  })

  it("does not open the camera while the sheet is hidden", async () => {
    act(() => {
      renderer.create(
        <GenusRecognitionModal visible={false} onClose={jest.fn()} onConfirmGenus={jest.fn()} />,
      )
    })

    await flushMicrotasks()

    expect(requestCameraPermissionsAsync).not.toHaveBeenCalled()
  })

  it("shows the unavailable message and never applies a suggestion when the model can't classify", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///mock/photo.jpg" }],
    })
    classifyGenusPhoto.mockResolvedValue({ status: "unavailable", reason: "load_failed" })
    const onConfirmGenus = jest.fn()
    let tree: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <GenusRecognitionModal visible onClose={jest.fn()} onConfirmGenus={onConfirmGenus} />,
      )
    })

    // OA-33: the camera opens as soon as the sheet does.
    await flushMicrotasks()

    expect(findByTestID(tree!, "genus-recognition-fallback")).toBeDefined()
    expect(onConfirmGenus).not.toHaveBeenCalled()
  })

  it("shows ranked results and only calls onConfirmGenus once the surveyor confirms one", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///mock/photo.jpg" }],
    })
    classifyGenusPhoto.mockResolvedValue({
      status: "ok",
      suggestions: [
        { genus: "Fagus", confidence: 0.9, label: "strong" },
        { genus: "Acer", confidence: 0.05, label: "very-weak" },
      ],
    })
    const onConfirmGenus = jest.fn()
    const onClose = jest.fn()
    let tree: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <GenusRecognitionModal visible onClose={onClose} onConfirmGenus={onConfirmGenus} />,
      )
    })

    // OA-33: the camera opens as soon as the sheet does.
    await flushMicrotasks()

    // A suggestion never applies itself (D-11) until this confirm button is pressed.
    expect(onConfirmGenus).not.toHaveBeenCalled()

    act(() => {
      findByTestID(tree!, "genus-recognition-confirm-Fagus").props.onPress()
    })

    expect(onConfirmGenus).toHaveBeenCalledWith("Fagus")
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
