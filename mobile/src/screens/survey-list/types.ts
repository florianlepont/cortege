import type { SurveyDetailResponse } from "../../app/types"
import type { LocalSurvey } from "../../storage"

export type SurveyListScreenProps = {
  surveys: LocalSurvey[]
  selectedSurveyId: string | null
  /** LIST-01: the submitted surveys' canonical scores, keyed by survey id, when already loaded. */
  surveyDetails: Record<string, SurveyDetailResponse>
  /**
   * Android and the JS tabs: the screen draws its own title bar with the search and "+" buttons.
   * On iOS the native header carries the title and the "+", and search is its own tab.
   */
  showTitleBar: boolean
  onRefresh?: () => Promise<void>
  onDeleteSurvey: (surveyId: string) => void
  onOpenCreateSurvey: () => void
  onOpenSearch: () => void
  onOpenSurvey: (surveyId: string) => void
}
