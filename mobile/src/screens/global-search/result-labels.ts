import type {
  CommunitySurveyItem,
  DmhGroupCode,
  SearchMemberItem,
  SearchParcelItem,
  SearchPlaceItem,
} from "@cortege/ibp-domain"
import { formOf } from "../../app/dmh-guide/structure"
import { selectionLabel } from "../../app/factor-selections"
import { formatDay, formatShortDateTime } from "../../app/formatters"
import type { BestResult, OwnSurveyMatch } from "../../app/global-search"
import { formatSurveyUiStatusLabel, resolveSurveyUiStatus } from "../../app/survey-logic"
import { fr } from "../../i18n"

// What every search result says about itself (25-09, UI-SPEC 3a and 3b): the title, the meta line
// and the accessibility sentence of the five result types. Pure: the summary page, the best-result
// card and the full lists all read the same words from here, built from the catalogue only.

const t = fr.search
const surveyText = fr.surveyList

export type ResultLabels = {
  title: string
  meta: string
  accessibilityLabel: string
}

/** A member: the display name and how many finished surveys carry it. */
export function memberLabels(item: SearchMemberItem): ResultLabels {
  const meta = t.rows.memberMeta({ count: item.survey_count })
  return {
    title: item.author_name,
    meta,
    accessibilityLabel: t.rows.memberA11y({ name: item.author_name, meta }),
  }
}

/** A place: the name, then "Commune · Seine-et-Marne (77)" (the kind alone without a context). */
export function placeLabels(item: SearchPlaceItem): ResultLabels {
  const meta = t.rows.placeMeta({ kind: t.rows.placeKind[item.kind], context: item.context })
  return {
    title: item.name,
    meta,
    accessibilityLabel: t.rows.placeA11y({ name: item.name, meta }),
  }
}

/** A parcel: "Parcelle AB 0123", then the commune and its code, and the survey count when known. */
export function parcelLabels(item: SearchParcelItem): ResultLabels {
  const title = t.rows.parcelTitle({ section: item.section, number: item.number })
  const meta = t.rows.parcelMeta({
    commune: item.commune_name,
    code: item.commune_code,
    surveyCount: item.survey_count > 0 ? item.survey_count : null,
  })
  return { title, meta, accessibilityLabel: t.rows.parcelA11y({ title, meta }) }
}

/** A group of the dendromicrohabitat guide: its name, then the official form it belongs to. */
export function guideLabels(code: DmhGroupCode): ResultLabels {
  const title = selectionLabel("F", code) ?? code
  const meta = fr.dmhGuide.forms[formOf(code)]
  return { title, meta, accessibilityLabel: t.rows.guideA11y({ name: title, meta }) }
}

/**
 * One of the member's own surveys: the sentence is the one of the Mes Relevés rows. A survey found
 * through its note and not its name says so, after the date (27-15, D-07, UI-SPEC 3.5).
 */
export function ownSurveyLabels(survey: OwnSurveyMatch): ResultLabels {
  const title = survey.site_name?.trim() || fr.common.untitledSurvey
  const status = formatSurveyUiStatusLabel(resolveSurveyUiStatus(survey))
  const updatedAt = formatShortDateTime(survey.updated_at)
  const meta = `${status} ${surveyText.row.updatedMeta(updatedAt)}`
  const sentence = surveyText.a11y.openSurvey({ name: title, status, updatedAt })
  if (!survey.matchedInNote) return { title, meta, accessibilityLabel: sentence }
  return {
    title,
    meta: t.rows.matchedInNoteMeta(meta),
    accessibilityLabel: t.rows.matchedInNoteA11y(sentence),
  }
}

/** A finished survey of another member: "par {author} · Terminé le {date}". */
export function communitySurveyLabels(item: CommunitySurveyItem): ResultLabels {
  const title = item.site_name.trim() || fr.common.untitledSurvey
  const author = item.author_name?.trim() || surveyText.community.unknownAuthor
  return {
    title,
    meta: surveyText.community.meta({ author, date: formatDay(item.submitted_at, "short") }),
    accessibilityLabel: surveyText.community.a11y({ name: title, author, score: item.ibp_total }),
  }
}

/** The title and meta of the "Meilleur résultat" card, by result type. */
export function bestResultLabels(best: BestResult): {
  kind: BestResult["kind"]
  title: string
  meta: string
} {
  const labels = bestLabels(best)
  return { kind: best.kind, title: labels.title, meta: labels.meta }
}

function bestLabels(best: BestResult): ResultLabels {
  switch (best.kind) {
    case "parcel":
      return parcelLabels(best.item)
    case "member":
      return memberLabels(best.item)
    case "place":
      return placeLabels(best.item)
    case "mine":
      return ownSurveyLabels(best.survey)
    case "community":
      return communitySurveyLabels(best.item)
  }
}
