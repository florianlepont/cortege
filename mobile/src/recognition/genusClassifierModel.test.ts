import { CNPF_FACTOR_A_GENUS_CODES } from "@cortege/ibp-domain"
import {
  __listMockFiles,
  __resetMockFileSystem,
  __setMockFile,
} from "../../test/expo-file-system-legacy.mock"

const loadTensorflowModel = jest.fn()

jest.mock("react-native-fast-tflite", () => ({
  loadTensorflowModel: (...args: unknown[]) => loadTensorflowModel(...args),
}))

const jpegDecode = jest.fn()
jest.mock("jpeg-js", () => ({ decode: (...args: unknown[]) => jpegDecode(...args) }))

import {
  __resetGenusClassifierModelForTests,
  classifyGenusPhoto,
  rankGenusSuggestions,
  validateManifest,
} from "./genusClassifierModel"

const CAPTURE_URI = "file:///mock/cache/Camera/p.jpg"

function resizedFilesLeft(): string[] {
  return __listMockFiles().filter((uri) => uri.startsWith("file:///mock/cache/manipulated-"))
}

/** A clock that returns the given values in call order. */
function fakeClock(...values: number[]): () => number {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]
}

const GENUS_COUNT = CNPF_FACTOR_A_GENUS_CODES.length
const VALID_LABELS = [...CNPF_FACTOR_A_GENUS_CODES]

function fakeDecodedImage(inputSize: number): { data: Uint8Array; width: number; height: number } {
  const data = new Uint8Array(inputSize * inputSize * 4)
  data.fill(128)
  return { data, width: inputSize, height: inputSize }
}

describe("validateManifest", () => {
  it("accepts a manifest with exactly the 34 CNPF codes and a positive inputSize", () => {
    expect(validateManifest({ labels: VALID_LABELS, inputSize: 224 })).toEqual({
      labels: VALID_LABELS,
      inputSize: 224,
    })
  })

  it("rejects a non-object manifest", () => {
    expect(validateManifest(null)).toBeNull()
    expect(validateManifest("not-an-object")).toBeNull()
  })

  it("rejects a labels array of the wrong length (a corrupt or mismatched bundle)", () => {
    expect(validateManifest({ labels: VALID_LABELS.slice(0, 5), inputSize: 224 })).toBeNull()
    expect(validateManifest({ labels: "not-an-array", inputSize: 224 })).toBeNull()
  })

  it("rejects a labels array containing a code outside the CNPF list", () => {
    const withInvalidLabel = [...VALID_LABELS.slice(1), "Not_A_Genus"]
    expect(validateManifest({ labels: withInvalidLabel, inputSize: 224 })).toBeNull()
  })

  it("rejects a non-positive or non-finite inputSize", () => {
    expect(validateManifest({ labels: VALID_LABELS, inputSize: 0 })).toBeNull()
    expect(validateManifest({ labels: VALID_LABELS, inputSize: -1 })).toBeNull()
    expect(validateManifest({ labels: VALID_LABELS, inputSize: Infinity })).toBeNull()
    expect(validateManifest({ labels: VALID_LABELS, inputSize: "224" })).toBeNull()
  })
})

describe("rankGenusSuggestions", () => {
  it("suggests all 34 genera, most likely first, none withheld (D-04/D-11)", () => {
    const scores = new Float32Array(GENUS_COUNT).fill(1 / GENUS_COUNT)
    scores[3] = 0.9 // an arbitrary genus made confidently top
    const remaining = (1 - 0.9) / (GENUS_COUNT - 1)
    for (let i = 0; i < GENUS_COUNT; i++) if (i !== 3) scores[i] = remaining

    const suggestions = rankGenusSuggestions(scores, CNPF_FACTOR_A_GENUS_CODES)

    expect(suggestions).toHaveLength(GENUS_COUNT)
    expect(new Set(suggestions.map((s) => s.genus)).size).toBe(GENUS_COUNT)
    expect(suggestions[0].genus).toBe(CNPF_FACTOR_A_GENUS_CODES[3])
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence)
    }
  })

  it("normalizes raw (non-softmax) logits before labelling confidence", () => {
    const logits = new Float32Array(GENUS_COUNT).fill(0)
    logits[0] = 10 // dominates after softmax
    const suggestions = rankGenusSuggestions(logits, CNPF_FACTOR_A_GENUS_CODES)
    expect(suggestions[0].genus).toBe(CNPF_FACTOR_A_GENUS_CODES[0])
    expect(suggestions[0].confidence).toBeGreaterThan(0.9)
  })
})

describe("classifyGenusPhoto", () => {
  beforeEach(() => {
    __resetMockFileSystem()
    __setMockFile(CAPTURE_URI, 400000)
    __resetGenusClassifierModelForTests()
    loadTensorflowModel.mockReset()
    jpegDecode.mockReset()
  })

  it("resolves 'unavailable'/load_failed when the bundled model fails to load", async () => {
    // `loadTensorflowModel` is mocked module-wide, so this exercises the fail-closed path ADR-002
    // D-08 requires (a corrupt or unparseable bundle) regardless of the real .tflite's contents.
    loadTensorflowModel.mockRejectedValue(new Error("invalid flatbuffer"))

    const outcome = await classifyGenusPhoto("file:///mock/cache/photo.jpg")

    expect(outcome).toMatchObject({ status: "unavailable", reason: "load_failed" })
  })

  it("loads the model from a local file URL, never from a bare require() id", async () => {
    // Android Release resolves a require()d asset to a bare resource name that the library's
    // `URL(path).readBytes()` loader cannot open: the bundled model is copied to a file first.
    loadTensorflowModel.mockResolvedValue({
      run: jest
        .fn()
        .mockResolvedValue([new Float32Array(GENUS_COUNT).fill(1 / GENUS_COUNT).buffer]),
    })
    jpegDecode.mockReturnValue(fakeDecodedImage(224))

    await classifyGenusPhoto("file:///mock/cache/photo.jpg")

    const source = loadTensorflowModel.mock.calls[0][0] as { url: string }
    expect(typeof source).toBe("object")
    expect(source.url).toMatch(/^file:\/\//)
  })

  it("does not retry loading the model once it has already failed to load", async () => {
    loadTensorflowModel.mockRejectedValue(new Error("invalid flatbuffer"))

    const first = await classifyGenusPhoto("file:///mock/cache/photo-1.jpg")
    const second = await classifyGenusPhoto("file:///mock/cache/photo-2.jpg")

    expect(first).toMatchObject({ status: "unavailable", reason: "load_failed" })
    expect(second).toMatchObject({ status: "unavailable", reason: "load_failed" })
    expect(loadTensorflowModel).toHaveBeenCalledTimes(1)
  })

  it("resolves 'ok' with 34 ranked suggestions once the model loads and runs", async () => {
    loadTensorflowModel.mockResolvedValue({
      run: jest
        .fn()
        .mockResolvedValue([new Float32Array(GENUS_COUNT).fill(1 / GENUS_COUNT).buffer]),
    })
    jpegDecode.mockReturnValue(fakeDecodedImage(224))

    const outcome = await classifyGenusPhoto("file:///mock/cache/photo.jpg")

    expect(outcome.status).toBe("ok")
    if (outcome.status === "ok") {
      expect(outcome.suggestions).toHaveLength(GENUS_COUNT)
    }
  })

  it("resolves 'unavailable'/inference_failed when the model throws while running", async () => {
    loadTensorflowModel.mockResolvedValue({
      run: jest.fn().mockRejectedValue(new Error("shape mismatch")),
    })
    jpegDecode.mockReturnValue(fakeDecodedImage(224))

    const outcome = await classifyGenusPhoto("file:///mock/cache/photo.jpg")

    expect(outcome).toMatchObject({ status: "unavailable", reason: "inference_failed" })
  })

  it("caches a successfully loaded model across calls (no repeat load)", async () => {
    loadTensorflowModel.mockResolvedValue({
      run: jest
        .fn()
        .mockResolvedValue([new Float32Array(GENUS_COUNT).fill(1 / GENUS_COUNT).buffer]),
    })
    jpegDecode.mockReturnValue(fakeDecodedImage(224))

    await classifyGenusPhoto("file:///mock/cache/photo-1.jpg")
    await classifyGenusPhoto("file:///mock/cache/photo-2.jpg")

    expect(loadTensorflowModel).toHaveBeenCalledTimes(1)
  })

  it("deletes the resized JPEG after a successful classification (SC-7)", async () => {
    loadTensorflowModel.mockResolvedValue({
      run: jest
        .fn()
        .mockResolvedValue([new Float32Array(GENUS_COUNT).fill(1 / GENUS_COUNT).buffer]),
    })
    jpegDecode.mockReturnValue(fakeDecodedImage(224))

    const outcome = await classifyGenusPhoto(CAPTURE_URI)

    expect(outcome.status).toBe("ok")
    expect(resizedFilesLeft()).toEqual([])
    // the capture itself is the caller's to delete: the classifier leaves it alone
    expect(__listMockFiles()).toContain(CAPTURE_URI)
  })

  it("deletes the resized JPEG when decoding fails", async () => {
    loadTensorflowModel.mockResolvedValue({ run: jest.fn() })
    jpegDecode.mockImplementation(() => {
      throw new Error("bad jpeg")
    })

    const outcome = await classifyGenusPhoto(CAPTURE_URI)

    expect(outcome).toMatchObject({ status: "unavailable", reason: "inference_failed" })
    expect(resizedFilesLeft()).toEqual([])
  })

  it("deletes the resized JPEG when the model run rejects", async () => {
    loadTensorflowModel.mockResolvedValue({
      run: jest.fn().mockRejectedValue(new Error("shape mismatch")),
    })
    jpegDecode.mockReturnValue(fakeDecodedImage(224))

    const outcome = await classifyGenusPhoto(CAPTURE_URI)

    expect(outcome).toMatchObject({ status: "unavailable", reason: "inference_failed" })
    expect(resizedFilesLeft()).toEqual([])
  })

  it("deletes the resized JPEG when reading it fails", async () => {
    const FileSystem = jest.requireMock("expo-file-system/legacy") as {
      readAsStringAsync: jest.Mock
    }
    FileSystem.readAsStringAsync.mockRejectedValueOnce(new Error("read failed"))
    loadTensorflowModel.mockResolvedValue({ run: jest.fn() })

    const outcome = await classifyGenusPhoto(CAPTURE_URI)

    expect(outcome).toMatchObject({ status: "unavailable", reason: "inference_failed" })
    expect(resizedFilesLeft()).toEqual([])
  })

  it("reports timings: load 10, preprocessing 30, inference 60, total 90 (clock 0, 10, 40, 100)", async () => {
    loadTensorflowModel.mockResolvedValue({
      run: jest
        .fn()
        .mockResolvedValue([new Float32Array(GENUS_COUNT).fill(1 / GENUS_COUNT).buffer]),
    })
    jpegDecode.mockReturnValue(fakeDecodedImage(224))

    const outcome = await classifyGenusPhoto(CAPTURE_URI, fakeClock(0, 10, 40, 100))

    expect(outcome.timings).toEqual({ loadMs: 10, preprocessMs: 30, inferenceMs: 60, totalMs: 90 })
  })

  it("books a preprocessing failure to preprocessing, none to inference", async () => {
    loadTensorflowModel.mockResolvedValue({ run: jest.fn() })
    jpegDecode.mockImplementation(() => {
      throw new Error("bad jpeg")
    })

    const outcome = await classifyGenusPhoto(CAPTURE_URI, fakeClock(0, 10, 40))

    expect(outcome.timings).toEqual({ loadMs: 10, preprocessMs: 30, inferenceMs: 0, totalMs: 30 })
  })

  it("books a model run failure to inference", async () => {
    loadTensorflowModel.mockResolvedValue({
      run: jest.fn().mockRejectedValue(new Error("shape mismatch")),
    })
    jpegDecode.mockReturnValue(fakeDecodedImage(224))

    const outcome = await classifyGenusPhoto(CAPTURE_URI, fakeClock(0, 10, 40, 100))

    expect(outcome.timings).toEqual({ loadMs: 10, preprocessMs: 30, inferenceMs: 60, totalMs: 90 })
  })

  it("reports a load failure with the load time and nothing for the later stages", async () => {
    loadTensorflowModel.mockRejectedValue(new Error("invalid flatbuffer"))

    const outcome = await classifyGenusPhoto(CAPTURE_URI, fakeClock(5, 25))

    expect(outcome.timings).toEqual({ loadMs: 20, preprocessMs: 0, inferenceMs: 0, totalMs: 0 })
  })

  it("times with the real monotonic clock by default", async () => {
    loadTensorflowModel.mockResolvedValue({
      run: jest
        .fn()
        .mockResolvedValue([new Float32Array(GENUS_COUNT).fill(1 / GENUS_COUNT).buffer]),
    })
    jpegDecode.mockReturnValue(fakeDecodedImage(224))

    const { timings } = await classifyGenusPhoto(CAPTURE_URI)

    expect(timings.totalMs).toBeGreaterThanOrEqual(0)
    expect(timings.totalMs).toBe(timings.preprocessMs + timings.inferenceMs)
  })

  it("resolves 'unavailable'/invalid_manifest for a corrupt or mismatched bundled manifest", async () => {
    // A fresh module registry: the bundled manifest is a static import, so this is the only way
    // to exercise a build where it and the real .tflite have drifted out of sync (D-08's "corrupt
    // or mismatched bundle" case, distinct from a model that loads but the manifest disagrees with).
    await jest.isolateModulesAsync(async () => {
      jest.doMock("../../assets/models/genus_classifier_manifest.json", () => ({
        labels: ["Not_A_Genus"],
        inputSize: 224,
      }))
      const isolated = await import("./genusClassifierModel")
      const outcome = await isolated.classifyGenusPhoto("file:///mock/cache/photo.jpg")
      expect(outcome).toEqual({
        status: "unavailable",
        reason: "invalid_manifest",
        timings: { loadMs: 0, preprocessMs: 0, inferenceMs: 0, totalMs: 0 },
      })
    })
  })
})
