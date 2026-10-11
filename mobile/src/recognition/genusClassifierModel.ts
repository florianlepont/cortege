import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as FileSystem from "expo-file-system/legacy"
import { Asset } from "expo-asset"
import { loadTensorflowModel } from "react-native-fast-tflite"
import jpeg from "jpeg-js"
import {
  CNPF_FACTOR_A_GENUS_CODES,
  isCnpfFactorAGenusCode,
  type CnpfFactorAGenusCode,
} from "@cortege/ibp-domain"
import { base64ToUint8Array } from "../app/base64"
import { classifyConfidence, type GenusSuggestion } from "./calibration"
import { deleteTempPhoto } from "./temp-files"
import { monotonicNow } from "./timing"
import rawManifest from "../../assets/models/genus_classifier_manifest.json"
// ADR-002 D-07/D-08 (bundled model, fail-closed on load failure): the model ships as a bundled
// asset, loaded through Metro's `.tflite` asset support (metro.config.js), never downloaded or
// fetched at runtime - this static import is what makes that a build-time, offline guarantee
// rather than a network call.
import MODEL_ASSET from "../../assets/models/genus_classifier.tflite"

type TensorflowModel = Awaited<ReturnType<typeof loadTensorflowModel>>

type ClassifierManifest = {
  labels: CnpfFactorAGenusCode[]
  inputSize: number
}

export type RecognitionUnavailableReason = "invalid_manifest" | "load_failed" | "inference_failed"

/**
 * Latency of one classification in milliseconds. `totalMs` is preprocessing plus inference, the
 * definition of the Phase 1 spike (docs/technical/species-recognition-spike-measurements-v1.md
 * section 7); `loadMs` is the model load, near 0 once the model is cached. A stage that was not
 * reached reports 0.
 */
export type RecognitionTimings = {
  loadMs: number
  preprocessMs: number
  inferenceMs: number
  totalMs: number
}

export type RecognitionOutcome =
  | { status: "ok"; suggestions: GenusSuggestion[]; timings: RecognitionTimings }
  | { status: "unavailable"; reason: RecognitionUnavailableReason; timings: RecognitionTimings }

/**
 * The manifest's `labels` must be exactly the 34 CNPF codes (D-04: none withheld) for the model's
 * output tensor to map onto a genus at all - anything else is a corrupt or mismatched bundle, and
 * must fail closed exactly like a load failure (ADR-002 D-08), not silently mis-map indices.
 */
export function validateManifest(raw: unknown): ClassifierManifest | null {
  if (!raw || typeof raw !== "object") return null
  const candidate = raw as { labels?: unknown; inputSize?: unknown }
  if (
    !Array.isArray(candidate.labels) ||
    candidate.labels.length !== CNPF_FACTOR_A_GENUS_CODES.length
  ) {
    return null
  }
  if (!candidate.labels.every((label) => isCnpfFactorAGenusCode(label))) return null
  if (
    typeof candidate.inputSize !== "number" ||
    !Number.isFinite(candidate.inputSize) ||
    candidate.inputSize <= 0
  ) {
    return null
  }
  return { labels: candidate.labels as CnpfFactorAGenusCode[], inputSize: candidate.inputSize }
}

let cachedModel: TensorflowModel | null = null
let modelLoadFailed = false

/** Resets the in-memory model cache; test-only (a fresh module state per test). */
export function __resetGenusClassifierModelForTests(): void {
  cachedModel = null
  modelLoadFailed = false
}

async function loadModel(): Promise<TensorflowModel | null> {
  if (cachedModel) return cachedModel
  if (modelLoadFailed) return null
  try {
    // The Android loader of react-native-fast-tflite reads its source with `URL(path).readBytes()`:
    // it accepts a real URL only. A `require()`d asset resolves to a bare resource name in an
    // Android Release build ("assets_models_genus_classifier"), so the model never loaded there
    // (found 2026-10-10 on the emulator). Copying the bundled asset to a local file first gives
    // every platform and build type a `file://` (or dev-server) URL; still no network at runtime.
    const asset = Asset.fromModule(MODEL_ASSET)
    await asset.downloadAsync()
    cachedModel = await loadTensorflowModel({ url: asset.localUri ?? asset.uri }, [])
    return cachedModel
  } catch {
    modelLoadFailed = true
    return null
  }
}

/**
 * Resizes and re-encodes the photo to the model's expected square input, then decodes it to raw
 * RGB pixels in [0, 255] - the manifest's `preprocessing: "raw_0_255"` documents that the model
 * itself embeds a Rescaling (1/255) and a Normalization (ImageNet mean/variance) layer ahead of
 * the backbone (confirmed by inspecting the SavedModel graph), so no scaling happens here.
 */
async function preprocessPhoto(uri: string, inputSize: number): Promise<Float32Array> {
  const resized = await ImageManipulator.manipulate(uri)
    .resize({ width: inputSize, height: inputSize })
    .renderAsync()
  const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 1 })
  let base64: string
  try {
    base64 = await FileSystem.readAsStringAsync(saved.uri, {
      encoding: FileSystem.EncodingType.Base64,
    })
  } finally {
    // The resized JPEG is only needed for this read (SC-7): decoding works on the base64 string.
    await deleteTempPhoto(saved.uri)
  }
  const bytes = base64ToUint8Array(base64)
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true })

  const pixelCount = inputSize * inputSize
  const tensor = new Float32Array(pixelCount * 3)
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    tensor[pixel * 3] = decoded.data[pixel * 4]
    tensor[pixel * 3 + 1] = decoded.data[pixel * 4 + 1]
    tensor[pixel * 3 + 2] = decoded.data[pixel * 4 + 2]
  }
  return tensor
}

/** Raw model outputs to a softmax distribution, tolerating a model that already applies softmax. */
function toProbabilities(scores: ArrayLike<number>): number[] {
  const values = Array.from(scores)
  const sum = values.reduce((total, value) => total + value, 0)
  const looksAlreadyNormalized = sum > 0.98 && sum < 1.02 && values.every((v) => v >= 0 && v <= 1)
  if (looksAlreadyNormalized) return values
  const exps = values.map((value) => Math.exp(value))
  const expSum = exps.reduce((total, value) => total + value, 0)
  return exps.map((value) => value / expSum)
}

/**
 * Every one of the 34 CNPF genera, most likely first (D-04: none withheld). The caller decides how
 * many to show as "alternatives" (D-11); this ranks the full set so that decision stays a display
 * choice, not a filtering one.
 */
export function rankGenusSuggestions(
  scores: ArrayLike<number>,
  labels: readonly CnpfFactorAGenusCode[],
): GenusSuggestion[] {
  const probabilities = toProbabilities(scores)
  return labels
    .map((genus, index) => {
      const confidence = probabilities[index] ?? 0
      return { genus, confidence, label: classifyConfidence(genus, confidence) }
    })
    .sort((a, b) => b.confidence - a.confidence)
}

/**
 * Classifies one recognition photo end to end. Never throws: any failure (missing/corrupt model,
 * bad manifest, a preprocessing or inference error) resolves to an `unavailable` outcome so the
 * caller can show ADR-002's D-08 message and fall back to manual entry. Every outcome carries its
 * timings; `now` is injectable so tests can drive the clock.
 */
export async function classifyGenusPhoto(
  uri: string,
  now: () => number = monotonicNow,
): Promise<RecognitionOutcome> {
  const manifest = validateManifest(rawManifest)
  if (!manifest) {
    return { status: "unavailable", reason: "invalid_manifest", timings: timingsOf(0, 0, 0) }
  }

  const startedAt = now()
  const model = await loadModel()
  const loaded = now()
  if (!model) {
    return {
      status: "unavailable",
      reason: "load_failed",
      timings: timingsOf(loaded - startedAt, 0, 0),
    }
  }

  let preprocessed: number | null = null
  try {
    const tensor = await preprocessPhoto(uri, manifest.inputSize)
    const afterPreprocess = now()
    preprocessed = afterPreprocess
    const outputs = await model.run([tensor.buffer as ArrayBuffer])
    const scores = new Float32Array(outputs[0] as ArrayBuffer)
    const finished = now()
    return {
      status: "ok",
      suggestions: rankGenusSuggestions(scores, manifest.labels),
      timings: timingsOf(loaded - startedAt, afterPreprocess - loaded, finished - afterPreprocess),
    }
  } catch {
    const failed = now()
    // A failure before the tensor existed spent its time in preprocessing, a later one in inference.
    const timings =
      preprocessed === null
        ? timingsOf(loaded - startedAt, failed - loaded, 0)
        : timingsOf(loaded - startedAt, preprocessed - loaded, failed - preprocessed)
    return { status: "unavailable", reason: "inference_failed", timings }
  }
}

function timingsOf(loadMs: number, preprocessMs: number, inferenceMs: number): RecognitionTimings {
  return { loadMs, preprocessMs, inferenceMs, totalMs: preprocessMs + inferenceMs }
}
