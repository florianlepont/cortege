import type { ConfidenceLabel } from "../recognition/calibration"
import { fr } from "../i18n"

// The catalogue holds the two parts as plain data (fr.genusRecognition.confidence/confidenceHint);
// composing them into one display line is app logic, not text, so it lives here rather than as a
// catalogue function - keeps the i18n French-catalogue test's generic leaf-function check (any
// catalogue function must return sensible text for an arbitrary sample argument) meaningful instead
// of exercising a lookup keyed by an argument the test can't supply a valid enum value for.
export function confidenceLine(label: ConfidenceLabel): string {
  const t = fr.genusRecognition
  return `${t.confidence[label]} — ${t.confidenceHint[label]}`
}
