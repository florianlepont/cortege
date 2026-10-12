/**
 * The `beforeRemove` listener of the survey summary screen (the one `surveyDetail` of the survey
 * stack): leaving the summary drops the selected survey, so the next page starts from a clean
 * state. A RESET is the exception: the new-survey wizard resets the stack to
 * [surveysHome, surveyDetail] right after it selected the draft it created, and when the stack
 * still held an older summary (the wizard was launched from Accueil, a search or Explorer) the
 * removal of that old screen would otherwise clear the selection of the new one and leave it blank.
 * Sign-out and deletion clear the selection through their own actions, not through this listener.
 */
export type RemovalEvent = { data: { action: { type: string } } }

export function closeSelectionUnlessReset(
  closeSelection: () => void,
): (event: RemovalEvent) => void {
  return (event) => {
    if (event.data.action.type === "RESET") return
    closeSelection()
  }
}
