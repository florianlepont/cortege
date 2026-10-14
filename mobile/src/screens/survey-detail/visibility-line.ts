import type { Ionicons } from "@expo/vector-icons"
import { visibilityIcon, visibilityKey } from "../../app/visibility-display"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"

export type VisibilityLine = {
  icon: keyof typeof Ionicons.glyphMap
  text: string
  accessibilityLabel: string
}

/**
 * D-15: the read-only line under the status line of the owner's survey. Only a finished survey has
 * one: it says what the survey is, frozen, since it can no longer change. A draft has no line: the
 * choice is made in the finish sheet, which already shows it, so a line before that would only
 * repeat the sheet (owner decision 2026-10-14). The line carries no handler.
 */
export function resolveVisibilityLine(
  survey: Pick<LocalSurvey, "status" | "visibility">,
): VisibilityLine | null {
  if (survey.status !== "submitted") return null
  const key = visibilityKey(survey.visibility)
  const text = fr.surveyDetail.visibility.line.finished[key]
  const lowered = text.charAt(0).toLocaleLowerCase("fr-FR") + text.slice(1)
  return {
    icon: visibilityIcon(survey.visibility),
    text,
    accessibilityLabel: fr.surveyDetail.a11y.visibilityLine({ text: lowered }),
  }
}
