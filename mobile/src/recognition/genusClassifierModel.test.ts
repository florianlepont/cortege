import { CNPF_FACTOR_A_GENUS_CODES } from "@cortege/ibp-domain"

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
} from "./genusClassifierModel"

const GENUS_COUNT = CNPF_FACTOR_A_GENUS_CODES.length

function fakeDecodedImage(inputSize: number): { data: Uint8Array; width: number; height: number } {
  const data = new Uint8Array(inputSize * inputSize * 4)
  data.fill(128)
  return { data, width: inputSize, height: inputSize }
}

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
    __resetGenusClassifierModelForTests()
    loadTensorflowModel.mockReset()
    jpegDecode.mockReset()
  })

  it("resolves 'unavailable'/load_failed when the bundled model fails to load", async () => {
    // The real repository state today: mobile/assets/models/genus_classifier.tflite is a
    // documented placeholder, not a valid TFLite flatbuffer (see its README.md) - this is the
    // actual fail-closed path ADR-002 D-08 requires, exercised for real rather than assumed.
    loadTensorflowModel.mockRejectedValue(new Error("invalid flatbuffer"))

    const outcome = await classifyGenusPhoto("file:///mock/cache/photo.jpg")

    expect(outcome).toEqual({ status: "unavailable", reason: "load_failed" })
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

    expect(outcome).toEqual({ status: "unavailable", reason: "inference_failed" })
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
})
