import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../i18n"
import {
  __listMockFiles,
  __resetMockFileSystem,
  __setMockFile,
} from "../../test/expo-file-system-legacy.mock"
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
jest.mock("expo-camera", () => ({
  Camera: { requestCameraPermissionsAsync: () => requestCameraPermissionsAsync() },
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}))

// The live camera has its own test; here it is a stand-in that hands its callbacks to the test.
type CameraProps = { onCapture: (uri: string) => void; onClose: () => void; onError: () => void }
const cameraProps: { current: CameraProps | null } = { current: null }
jest.mock("./GenusCameraView", () => ({
  GenusCameraView: (props: CameraProps) => {
    cameraProps.current = props
    return null
  },
}))

const classifyGenusPhoto = jest.fn()
jest.mock("../recognition/genusClassifierModel", () => ({
  classifyGenusPhoto: (...args: unknown[]) => classifyGenusPhoto(...args),
}))

// Timing is observed through the reporter; the clock stays real.
const reportGenusTiming = jest.fn()
jest.mock("../recognition/timing", () => ({
  ...jest.requireActual("../recognition/timing"),
  reportGenusTiming: (...args: unknown[]) => reportGenusTiming(...args),
}))

const TIMINGS = { loadMs: 0, preprocessMs: 30, inferenceMs: 60, totalMs: 90 }
const CAPTURE_URI = "file:///mock/cache/Camera/p.jpg"

function findByTestID(tree: renderer.ReactTestRenderer, testID: string) {
  return tree.root.findAll((n) => n.props.testID === testID)[0]
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve()
  })
}

const t = fr.genusRecognition

function mountModal(overrides: Partial<React.ComponentProps<typeof GenusRecognitionModal>> = {}) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <GenusRecognitionModal
        visible
        onClose={jest.fn()}
        onConfirmGenus={jest.fn()}
        {...overrides}
      />,
    )
  })
  return tree
}

describe("GenusRecognitionModal", () => {
  beforeEach(() => {
    requestCameraPermissionsAsync.mockReset()
    classifyGenusPhoto.mockReset()
    reportGenusTiming.mockReset()
    __resetMockFileSystem()
    cameraProps.current = null
  })

  it("shows the manual-fallback message when camera permission is refused", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: false })
    const tree = mountModal()

    // OA-33: the camera opens as soon as the sheet does.
    await flushMicrotasks()

    expect(findByTestID(tree, "genus-recognition-fallback")).toBeDefined()
    expect(cameraProps.current).toBeNull()
  })

  it("opens the live camera straight away and closes the sheet when it is closed", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    const onClose = jest.fn()
    mountModal({ onClose })

    await flushMicrotasks()

    expect(cameraProps.current).not.toBeNull()
    act(() => cameraProps.current!.onClose())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(classifyGenusPhoto).not.toHaveBeenCalled()
  })

  it("does not open the camera while the sheet is hidden", async () => {
    mountModal({ visible: false })

    await flushMicrotasks()

    expect(requestCameraPermissionsAsync).not.toHaveBeenCalled()
  })

  it("says the photo failed when the camera cannot take it", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    const tree = mountModal()
    await flushMicrotasks()

    act(() => cameraProps.current!.onError())

    expect(findByTestID(tree, "genus-recognition-fallback")).toBeDefined()
    expect(tree.root.findAll((n) => n.props.children === t.captureFailed).length).toBeGreaterThan(0)
  })

  it("shows the unavailable message and never applies a suggestion when the model can't classify", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    classifyGenusPhoto.mockResolvedValue({
      status: "unavailable",
      reason: "load_failed",
      timings: TIMINGS,
    })
    const onConfirmGenus = jest.fn()
    const tree = mountModal({ onConfirmGenus })
    await flushMicrotasks()

    await act(async () => cameraProps.current!.onCapture("file:///mock/photo.jpg"))
    await flushMicrotasks()

    expect(classifyGenusPhoto).toHaveBeenCalledWith("file:///mock/photo.jpg")
    expect(findByTestID(tree, "genus-recognition-fallback")).toBeDefined()
    expect(onConfirmGenus).not.toHaveBeenCalled()
  })

  it("shows ranked results and only calls onConfirmGenus once the surveyor confirms one", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    classifyGenusPhoto.mockResolvedValue({
      status: "ok",
      suggestions: [
        { genus: "Fagus", confidence: 0.9, label: "strong" },
        { genus: "Acer", confidence: 0.05, label: "very-weak" },
      ],
      timings: TIMINGS,
    })
    const onConfirmGenus = jest.fn()
    const onClose = jest.fn()
    const tree = mountModal({ onClose, onConfirmGenus })
    await flushMicrotasks()
    await act(async () => cameraProps.current!.onCapture("file:///mock/photo.jpg"))
    await flushMicrotasks()

    // A suggestion never applies itself (D-11) until this confirm button is pressed.
    expect(onConfirmGenus).not.toHaveBeenCalled()

    act(() => {
      findByTestID(tree, "genus-recognition-confirm-Fagus").props.onPress()
    })

    expect(onConfirmGenus).toHaveBeenCalledWith("Fagus")
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("a retake opens the camera again, and closing it returns to the results", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    classifyGenusPhoto.mockResolvedValue({
      status: "ok",
      suggestions: [{ genus: "Fagus", confidence: 0.9, label: "strong" }],
      timings: TIMINGS,
    })
    const onClose = jest.fn()
    const tree = mountModal({ onClose })
    await flushMicrotasks()
    await act(async () => cameraProps.current!.onCapture("file:///mock/photo.jpg"))
    await flushMicrotasks()

    const retake = tree.root.findAll(
      (n) => (n.type as unknown) === "AppButton" && n.props.label === t.tryAnotherPhoto,
    )[0]
    await act(async () => retake.props.onPress())
    await flushMicrotasks()
    act(() => cameraProps.current!.onClose())

    expect(onClose).not.toHaveBeenCalled()
    expect(findByTestID(tree, "genus-recognition-confirm-Fagus")).toBeDefined()
  })

  it("the unavailable screen offers a retake, and the close button closes the sheet", async () => {
    requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false })
    const onClose = jest.fn()
    const tree = mountModal({ onClose })
    await flushMicrotasks()

    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    const retake = tree.root.findAll(
      (n) => (n.type as unknown) === "AppButton" && n.props.label === t.retakePhoto,
    )[0]
    await act(async () => retake.props.onPress())
    await flushMicrotasks()
    expect(cameraProps.current).not.toBeNull()

    act(() => cameraProps.current!.onClose())
    // Back on the unavailable screen it came from; its close button closes the sheet.
    act(() => findByTestID(tree, "genus-recognition-close").props.onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("keeps the classifier's confidence order, no alphabetical sort (decision D-07)", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    classifyGenusPhoto.mockResolvedValue({
      status: "ok",
      suggestions: [
        { genus: "Ulmus", confidence: 0.62, label: "strong" },
        { genus: "Abies", confidence: 0.2, label: "weak" },
        { genus: "Quercus_deciduae", confidence: 0.1, label: "very-weak" },
        { genus: "Betula", confidence: 0.05, label: "very-weak" },
        { genus: "Acer", confidence: 0.03, label: "very-weak" },
      ],
      timings: TIMINGS,
    })
    const tree = mountModal()
    await flushMicrotasks()
    await act(async () => cameraProps.current!.onCapture(CAPTURE_URI))
    await flushMicrotasks()

    const order = tree.root
      .findAll(
        (n) =>
          (n.type as unknown) === "AppButton" &&
          String(n.props.testID ?? "").startsWith("genus-recognition-confirm-"),
      )
      .map((n) => n.props.testID)

    expect(order).toEqual([
      "genus-recognition-confirm-Ulmus",
      "genus-recognition-confirm-Abies",
      "genus-recognition-confirm-Quercus_deciduae",
      "genus-recognition-confirm-Betula",
      "genus-recognition-confirm-Acer",
    ])
  })

  it("deletes the camera capture once an ok classification ends (SC-7)", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    classifyGenusPhoto.mockResolvedValue({
      status: "ok",
      suggestions: [{ genus: "Fagus", confidence: 0.9, label: "strong" }],
      timings: TIMINGS,
    })
    __setMockFile(CAPTURE_URI, 400000)
    const tree = mountModal()
    await flushMicrotasks()

    await act(async () => cameraProps.current!.onCapture(CAPTURE_URI))
    await flushMicrotasks()

    expect(findByTestID(tree, "genus-recognition-confirm-Fagus")).toBeDefined()
    expect(__listMockFiles()).toEqual([])
  })

  it("deletes the camera capture when the model is unavailable", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    classifyGenusPhoto.mockResolvedValue({
      status: "unavailable",
      reason: "inference_failed",
      timings: TIMINGS,
    })
    __setMockFile(CAPTURE_URI, 400000)
    const tree = mountModal()
    await flushMicrotasks()

    await act(async () => cameraProps.current!.onCapture(CAPTURE_URI))
    await flushMicrotasks()

    expect(findByTestID(tree, "genus-recognition-fallback")).toBeDefined()
    expect(__listMockFiles()).toEqual([])
  })

  it("closed while classifying: stays closed, shows no stale step, still deletes the capture", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    let resolveClassify!: (outcome: unknown) => void
    classifyGenusPhoto.mockReturnValue(
      new Promise((resolve) => {
        resolveClassify = resolve
      }),
    )
    __setMockFile(CAPTURE_URI, 400000)
    const onClose = jest.fn()
    const tree = mountModal({ onClose })
    await flushMicrotasks()
    await act(async () => cameraProps.current!.onCapture(CAPTURE_URI))
    await flushMicrotasks()

    act(() => findByTestID(tree, "genus-recognition-close").props.onPress())
    await act(async () => {
      resolveClassify({
        status: "ok",
        suggestions: [{ genus: "Fagus", confidence: 0.9, label: "strong" }],
        timings: TIMINGS,
      })
    })
    await flushMicrotasks()

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(findByTestID(tree, "genus-recognition-confirm-Fagus")).toBeUndefined()
    expect(findByTestID(tree, "genus-recognition-fallback")).toBeUndefined()
    expect(__listMockFiles()).toEqual([])
  })

  it("closed while classifying with an unavailable outcome: no stale unavailable step", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    let resolveClassify!: (outcome: unknown) => void
    classifyGenusPhoto.mockReturnValue(
      new Promise((resolve) => {
        resolveClassify = resolve
      }),
    )
    const tree = mountModal()
    await flushMicrotasks()
    await act(async () => cameraProps.current!.onCapture(CAPTURE_URI))
    await flushMicrotasks()

    act(() => findByTestID(tree, "genus-recognition-close").props.onPress())
    await act(async () => {
      resolveClassify({ status: "unavailable", reason: "load_failed", timings: TIMINGS })
    })
    await flushMicrotasks()

    expect(findByTestID(tree, "genus-recognition-fallback")).toBeUndefined()
  })

  it("reports the timings once per classified photo", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    classifyGenusPhoto.mockResolvedValueOnce({
      status: "ok",
      suggestions: [{ genus: "Fagus", confidence: 0.9, label: "strong" }],
      timings: TIMINGS,
    })
    mountModal()
    await flushMicrotasks()

    await act(async () => cameraProps.current!.onCapture(CAPTURE_URI))
    await flushMicrotasks()

    expect(reportGenusTiming).toHaveBeenCalledTimes(1)
    const report = reportGenusTiming.mock.calls[0][0] as {
      timings: unknown
      outcome: string
      captureToSuggestionMs: number
    }
    expect(report.timings).toEqual(TIMINGS)
    expect(report.outcome).toBe("ok")
    expect(report.captureToSuggestionMs).toBeGreaterThanOrEqual(0)
  })

  it("reports the unavailable reason as the outcome", async () => {
    requestCameraPermissionsAsync.mockResolvedValue({ granted: true })
    classifyGenusPhoto.mockResolvedValueOnce({
      status: "unavailable",
      reason: "load_failed",
      timings: TIMINGS,
    })
    mountModal()
    await flushMicrotasks()

    await act(async () => cameraProps.current!.onCapture(CAPTURE_URI))
    await flushMicrotasks()

    expect(reportGenusTiming).toHaveBeenCalledTimes(1)
    expect(reportGenusTiming.mock.calls[0][0]).toMatchObject({ outcome: "load_failed" })
  })
})
