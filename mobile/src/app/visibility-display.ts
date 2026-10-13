import type { Ionicons } from "@expo/vector-icons"
import type { SurveyVisibility } from "@cortege/ibp-domain"
import { fr } from "../i18n"

// Phase 29, D-02: the only UI-layer reader of the wire value "public" (it means "shared with the
// association"; the app never says it). No globe glyph is used: it suggests the open internet.
export type VisibilityKey = "shared" | "private"

export function visibilityKey(visibility: SurveyVisibility): VisibilityKey {
  return visibility === "public" ? "shared" : "private"
}

export function visibilityLabel(visibility: SurveyVisibility): string {
  return fr.surveyFinish.options[visibilityKey(visibility)].label
}

export function visibilityCaption(visibility: SurveyVisibility): string {
  return fr.surveyFinish.options[visibilityKey(visibility)].caption
}

export function visibilityIcon(visibility: SurveyVisibility): keyof typeof Ionicons.glyphMap {
  return visibility === "public" ? "people-outline" : "lock-closed-outline"
}
