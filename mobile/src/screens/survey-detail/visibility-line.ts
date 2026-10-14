import type { Ionicons } from "@expo/vector-icons"
import { visibilityIcon, visibilityKey } from "../../app/visibility-display"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"

export type VisibilityLine = {
  icon: keyof typeof Ionicons.glyphMap
  text: string
  accessibilityLabel: string
}

// The state phrase without its closing parenthesis: "Restera privé (choix à la fin)" is spoken
// "restera privé", the "choix à la fin" part being said by the label template.
const TRAILING_PARENTHESIS = /\s*\([^)]*\)\s*$/

/**
 * D-15: the read-only line under the status line of the owner's survey. A finished survey says
 * what it is (frozen, it can no longer change); a draft says what the choice made at the end will
 * be. The line carries no handler: the choice is made in the finish sheet.
 */
export function resolveVisibilityLine(
  survey: Pick<LocalSurvey, "status" | "visibility">,
): VisibilityLine {
  const finished = survey.status === "submitted"
  const key = visibilityKey(survey.visibility)
  const { line } = fr.surveyDetail.visibility
  const text = finished ? line.finished[key] : line.draft[key]
  const spoken = text.replace(TRAILING_PARENTHESIS, "")
  const lowered = spoken.charAt(0).toLocaleLowerCase("fr-FR") + spoken.slice(1)
  return {
    icon: visibilityIcon(survey.visibility),
    text,
    accessibilityLabel: fr.surveyDetail.a11y.visibilityLine({ text: lowered, frozen: finished }),
  }
}
