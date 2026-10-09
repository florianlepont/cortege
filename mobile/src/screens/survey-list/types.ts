import type { SurveyDetailResponse } from "../../app/types"
import type { LocalSurvey } from "../../storage"

export type SurveyListScreenProps = {
  surveys: LocalSurvey[]
  selectedSurveyId: string | null
  /** LIST-01: the submitted surveys' canonical scores, keyed by survey id, when already loaded. */
  surveyDetails: Record<string, SurveyDetailResponse>
  /**
   * Android and the JS tabs: the screen draws its own title bar with the "+" button. On iOS the
   * native header carries the title and the "+". Search is its own tab on every platform (D-01).
   */
  showTitleBar: boolean
  onRefresh?: () => Promise<void>
  onDeleteSurvey: (surveyId: string) => void
  onOpenCreateSurvey: () => void
  onOpenSurvey: (surveyId: string) => void
}
