import type { SurveyDetailResponse } from "../../app/types"
import type { LocalSurvey } from "../../storage/types"

/**
 * The total (/50) a survey row shows in its ring, or null for no score (12.2-14). The canonical
 * detail, when the survey was opened this session, is the fresher value; otherwise the total the
 * local list read took from the stored payload (`LocalSurvey.ibp_total`), so a ring shows at once
 * after a fresh launch. Shared by Mes Relevés, the search page and the recent surveys of Accueil.
 */
export function resolveRowScore(
  survey: Pick<LocalSurvey, "id" | "ibp_total">,
  surveyDetails: Readonly<Record<string, SurveyDetailResponse | undefined>>,
): number | null {
  return surveyDetails[survey.id]?.scores?.ibp_total ?? survey.ibp_total ?? null
}
