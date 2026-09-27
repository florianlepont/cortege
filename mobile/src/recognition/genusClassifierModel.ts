import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as FileSystem from "expo-file-system/legacy"
import { loadTensorflowModel } from "react-native-fast-tflite"
import jpeg from "jpeg-js"
import {
  CNPF_FACTOR_A_GENUS_CODES,
  isCnpfFactorAGenusCode,
  type CnpfFactorAGenusCode,
} from "@cortege/ibp-domain"
import { base64ToUint8Array } from "../app/base64"
import { classifyConfidence, type GenusSuggestion } from "./calibration"
import rawManifest from "../../assets/models/genus_classifier_manifest.json"
// ADR-002 D-07/D-08 (bundled model, fail-closed on load failure): the model ships as a bundled
// asset, loaded through Metro's `.tflite` asset support (metro.config.js), never downloaded or
// fetched at runtime - this static import is what makes that a build-time, offline guarantee
// rather than a network call. See mobile/assets/models/README.md: the file at this path is
// currently a placeholder, so loading is expected to fail until the real artifact replaces it.
import MODEL_ASSET from "../../assets/models/genus_classifier.tflite"

type TensorflowModel = Awaited<ReturnType<typeof loadTensorflowModel>>

type ClassifierManifest = {
  labels: CnpfFactorAGenusCode[]
  inputSize: number
}

export type RecognitionUnavailableReason = "invalid_manifest" | "load_failed" | "inference_failed"

export type RecognitionOutcome =
  | { status: "ok"; suggestions: GenusSuggestion[] }
  | { status: "unavailable"; reason: RecognitionUnavailableReason }

/**
 * The manifest's `labels` must be exactly the 34 CNPF codes (D-04: none withheld) for the model's
 * output tensor to map onto a genus at all - anything else is a corrupt or mismatched bundle, and
 * must fail closed exactly like a load failure (ADR-002 D-08), not silently mis-map indices.
 */
function validateManifest(raw: unknown): ClassifierManifest | null {
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
    cachedModel = await loadTensorflowModel(MODEL_ASSET, [])
    return cachedModel
  } catch {
    modelLoadFailed = true
    return null
  }
}

/**
 * Resizes and re-encodes the photo to the model's expected square input, decodes it to raw RGB
 * pixels and normalizes to [0, 1] - the manifest's `preprocessing`/`inputSize` document the exact
 * contract, currently a documented best guess pending the real model's export report (see
 * mobile/assets/models/README.md).
 */
async function preprocessPhoto(uri: string, inputSize: number): Promise<Float32Array> {
  const resized = await ImageManipulator.manipulate(uri)
    .resize({ width: inputSize, height: inputSize })
    .renderAsync()
  const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 1 })
  const base64 = await FileSystem.readAsStringAsync(saved.uri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  const bytes = base64ToUint8Array(base64)
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true })

  const pixelCount = inputSize * inputSize
  const tensor = new Float32Array(pixelCount * 3)
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    tensor[pixel * 3] = decoded.data[pixel * 4] / 255
    tensor[pixel * 3 + 1] = decoded.data[pixel * 4 + 1] / 255
    tensor[pixel * 3 + 2] = decoded.data[pixel * 4 + 2] / 255
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
 * caller can show ADR-002's D-08 message and fall back to manual entry.
 */
export async function classifyGenusPhoto(uri: string): Promise<RecognitionOutcome> {
  const manifest = validateManifest(rawManifest)
  if (!manifest) return { status: "unavailable", reason: "invalid_manifest" }

  const model = await loadModel()
  if (!model) return { status: "unavailable", reason: "load_failed" }

  try {
    const tensor = await preprocessPhoto(uri, manifest.inputSize)
    const outputs = await model.run([tensor.buffer as ArrayBuffer])
    const scores = new Float32Array(outputs[0] as ArrayBuffer)
    return { status: "ok", suggestions: rankGenusSuggestions(scores, manifest.labels) }
  } catch {
    return { status: "unavailable", reason: "inference_failed" }
  }
}
