import type { IbpCas, IbpMethodVersion } from "@cortege/ibp-domain"

/**
 * The survey's IBP method as the wizard sees it (01.8-13): the form state and its setters, grouped
 * so the screen takes one prop. `version` null is an untagged legacy draft, scored as v3.0 (D-02).
 */
export type SurveyFormMethod = {
  version: IbpMethodVersion | null
  cas: IbpCas | null
  cas3Scale: boolean
  /** The version is fixed once the survey is submitted (D-02). */
  locked: boolean
  setVersion: (next: IbpMethodVersion) => void
  setCas: (next: IbpCas) => void
  setCas3Scale: (next: boolean) => void
}
