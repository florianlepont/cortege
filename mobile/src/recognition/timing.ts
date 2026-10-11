import { isGenusTimingEnabled } from "../app/feature-flags"
import { logStatusDetail } from "../i18n/status"
import type { RecognitionTimings, RecognitionUnavailableReason } from "./genusClassifierModel"

/** Monotonic millisecond clock: `performance.now()` when the runtime has it, else `Date.now()`. */
export function monotonicNow(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance
  return typeof perf?.now === "function" ? perf.now() : Date.now()
}

/**
 * One recognition's latency for the Android device checks (DC-D-01 to DC-D-03). Numbers and the
 * outcome word only: never a photo URI, survey id or coordinate.
 */
export type GenusTimingReport = {
  timings: RecognitionTimings
  /** Shutter to suggestions shown, in milliseconds. */
  captureToSuggestionMs: number
  outcome: "ok" | RecognitionUnavailableReason
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function roundedPayload(report: GenusTimingReport): Record<string, number | string> {
  return {
    outcome: report.outcome,
    loadMs: round1(report.timings.loadMs),
    preprocessMs: round1(report.timings.preprocessMs),
    inferenceMs: round1(report.timings.inferenceMs),
    totalMs: round1(report.timings.totalMs),
    captureToSuggestionMs: round1(report.captureToSuggestionMs),
  }
}

/** The single log line of a measurement build: `[genus-timing] {json}`, numbers rounded to 0.1 ms. */
export function formatGenusTimingLine(report: GenusTimingReport): string {
  return `[genus-timing] ${JSON.stringify(roundedPayload(report))}`
}

type TimingSinks = {
  enabled: boolean
  info: (line: string) => void
  log: (context: string, detail: unknown) => void
}

/**
 * Reports one recognition's timings. The dev-console detail is always sent (it prints only in dev
 * builds); the line that reaches a Release log is printed only when the build sets
 * `EXPO_PUBLIC_GENUS_TIMING=true`.
 */
export function reportGenusTiming(
  report: GenusTimingReport,
  deps: TimingSinks = {
    enabled: isGenusTimingEnabled(),
    info: (line: string) => console.info(line),
    log: logStatusDetail,
  },
): void {
  deps.log("genus.timing", roundedPayload(report))
  if (deps.enabled) deps.info(formatGenusTimingLine(report))
}
