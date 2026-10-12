import { useEffect, useMemo, useState } from "react"
import { logStatusDetail } from "../i18n"
import { listLocalSurveyNotes } from "../storage/surveys"
import type { LocalSurvey } from "../storage/types"

const EMPTY_NOTES: ReadonlyMap<string, string> = new Map()

/**
 * The notes of the member's own surveys, survey id to note, for the global search (phase 27, D-07).
 * Read from the phone only while a search is active, never by the survey list (01.9 D-03): one SQL
 * read (`listLocalSurveyNotes`) when `active` turns true, read again when the surveys change
 * (their ids and update dates are the signature), and an empty map whenever the search is not
 * active. An answer that arrives after the search closed or the surveys changed is dropped, and a
 * failed read leaves an empty map (the search still matches names).
 */
export function useOwnSurveyNotes(
  active: boolean,
  surveys: readonly LocalSurvey[],
): ReadonlyMap<string, string> {
  const [notes, setNotes] = useState<ReadonlyMap<string, string>>(EMPTY_NOTES)
  const signature = useMemo(
    () => (active ? surveys.map((item) => `${item.id}:${item.updated_at}`).join("|") : ""),
    [active, surveys],
  )

  useEffect(() => {
    if (!active) {
      // A closed search forgets its notes, so a later one never starts from stale text.
      setNotes(EMPTY_NOTES)
      return undefined
    }
    let cancelled = false
    listLocalSurveyNotes()
      .then((rows) => {
        if (!cancelled) setNotes(new Map(rows.map((row) => [row.id, row.note])))
      })
      .catch((error: unknown) => {
        logStatusDetail("search.ownNotes", error)
        if (!cancelled) setNotes(EMPTY_NOTES)
      })
    return () => {
      cancelled = true
    }
  }, [active, signature])

  return active ? notes : EMPTY_NOTES
}
