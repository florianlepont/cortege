import type {
  CommunitySurveyItem,
  SearchMemberItem,
  SearchParcelItem,
  SearchPlaceItem,
} from "@cortege/ibp-domain"
import { formatDay, formatShortDateTime } from "../../app/formatters"
import type { BestResult } from "../../app/global-search"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import {
  bestResultLabels,
  communitySurveyLabels,
  memberLabels,
  ownSurveyLabels,
  parcelLabels,
  placeLabels,
} from "./result-labels"

const member: SearchMemberItem = { author_name: "Marie Dupont", survey_count: 3 }

function place(overrides: Partial<SearchPlaceItem> = {}): SearchPlaceItem {
  return {
    id: "p1",
    name: "Fontainebleau",
    kind: "municipality",
    context: "Seine-et-Marne (77)",
    lat: 48.4,
    lng: 2.7,
    score: 0.9,
    ...overrides,
  }
}

function parcel(overrides: Partial<SearchParcelItem> = {}): SearchParcelItem {
  return {
    parcel_id: "77186000AB0123",
    commune_code: "77186",
    commune_name: "Fontainebleau",
    section: "AB",
    number: "0123",
    centroid: { lat: 48.4, lng: 2.7 },
    bbox: null,
    survey_count: 1,
    ...overrides,
  }
}

function ownSurvey(overrides: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id: "s1",
    site_name: "  Forêt de la Reine  ",
    status: "draft",
    visibility: "private",
    sync_version: 1,
    sync_state: "synced",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-10-05T10:00:00.000Z",
    completion_rate: 40,
    factors_filled: 0,
    ...overrides,
  }
}

function communitySurvey(overrides: Partial<CommunitySurveyItem> = {}): CommunitySurveyItem {
  return {
    survey_id: "c1",
    site_name: "Bois des Brosses",
    author_name: "Camille Roy",
    submitted_at: "2026-09-12T08:00:00.000Z",
    ibp_total: 34,
    ...overrides,
  }
}

describe("memberLabels (25-09)", () => {
  test("gives the display name, the survey count and the member sentence", () => {
    expect(memberLabels(member)).toEqual({
      title: "Marie Dupont",
      meta: "3 relevés terminés",
      accessibilityLabel: "Membre : Marie Dupont, 3 relevés terminés",
    })
  })

  test("a single survey reads in the singular", () => {
    expect(memberLabels({ author_name: "Léo", survey_count: 1 }).meta).toBe("1 relevé terminé")
  })
})

describe("placeLabels (25-09)", () => {
  test("a municipality reads 'Commune · context'", () => {
    expect(placeLabels(place())).toEqual({
      title: "Fontainebleau",
      meta: "Commune · Seine-et-Marne (77)",
      accessibilityLabel: "Lieu : Fontainebleau, Commune · Seine-et-Marne (77)",
    })
  })

  test.each([
    ["locality", "Lieu-dit"],
    ["street", "Rue"],
    ["address", "Adresse"],
    ["other", "Lieu"],
  ] as const)("kind %s reads %s", (kind, label) => {
    expect(placeLabels(place({ kind })).meta).toBe(`${label} · Seine-et-Marne (77)`)
  })

  test("without a context the meta is the kind alone", () => {
    expect(placeLabels(place({ kind: "other", context: null })).meta).toBe("Lieu")
  })
})

describe("parcelLabels (25-09)", () => {
  test("gives 'Parcelle AB 0123' and the commune with its code and survey count", () => {
    expect(parcelLabels(parcel())).toEqual({
      title: "Parcelle AB 0123",
      meta: "Fontainebleau (77186) · 1 relevé",
      accessibilityLabel: "Parcelle AB 0123, Fontainebleau (77186) · 1 relevé",
    })
  })

  test("an unknown commune reads 'Commune {code}'", () => {
    expect(parcelLabels(parcel({ commune_name: null })).meta).toBe("Commune 77186 · 1 relevé")
  })

  test("several surveys read in the plural", () => {
    expect(parcelLabels(parcel({ survey_count: 4 })).meta).toBe("Fontainebleau (77186) · 4 relevés")
  })

  test("no survey leaves out the suffix, never '0 relevé'", () => {
    expect(parcelLabels(parcel({ survey_count: 0 })).meta).toBe("Fontainebleau (77186)")
    expect(parcelLabels(parcel({ survey_count: 0, commune_name: null })).meta).toBe("Commune 77186")
  })
})

describe("ownSurveyLabels (25-09)", () => {
  test("gives the trimmed name, the status with the update date and the Mes Relevés sentence", () => {
    const survey = ownSurvey()
    const updatedAt = formatShortDateTime(survey.updated_at)
    const labels = ownSurveyLabels(survey)
    expect(labels.title).toBe("Forêt de la Reine")
    expect(labels.meta).toBe(`Brouillon · ${updatedAt}`)
    expect(labels.accessibilityLabel).toBe(
      fr.surveyList.a11y.openSurvey({
        name: "Forêt de la Reine",
        status: "Brouillon",
        updatedAt,
      }),
    )
  })

  test("a blank name reads 'Relevé sans titre'", () => {
    const labels = ownSurveyLabels(ownSurvey({ site_name: "   " }))
    expect(labels.title).toBe(fr.common.untitledSurvey)
    expect(labels.accessibilityLabel).toContain(fr.common.untitledSurvey)
  })

  test("the status follows the survey", () => {
    expect(ownSurveyLabels(ownSurvey({ status: "submitted" })).meta).toMatch(/^Soumis · /)
  })
})

describe("communitySurveyLabels (25-09)", () => {
  test("gives the site name, 'par {author} · Terminé le {date}' and the score sentence", () => {
    const item = communitySurvey()
    expect(communitySurveyLabels(item)).toEqual({
      title: "Bois des Brosses",
      meta: `par Camille Roy · Terminé le ${formatDay(item.submitted_at, "short")}`,
      accessibilityLabel: "Bois des Brosses, Camille Roy, score 34 sur 50",
    })
  })

  test("a deleted author reads 'un ancien membre'", () => {
    const labels = communitySurveyLabels(communitySurvey({ author_name: null }))
    expect(labels.meta).toContain("par un ancien membre")
    expect(labels.accessibilityLabel).toContain("un ancien membre")
  })

  test("a blank author name reads 'un ancien membre' and a blank site name is untitled", () => {
    const labels = communitySurveyLabels(communitySurvey({ author_name: "  ", site_name: " " }))
    expect(labels.meta).toContain("un ancien membre")
    expect(labels.title).toBe(fr.common.untitledSurvey)
  })
})

describe("bestResultLabels (25-09)", () => {
  test.each<[BestResult, string, string]>([
    [{ kind: "parcel", item: parcel() }, "Parcelle AB 0123", "Fontainebleau (77186) · 1 relevé"],
    [{ kind: "member", item: member }, "Marie Dupont", "3 relevés terminés"],
    [{ kind: "place", item: place() }, "Fontainebleau", "Commune · Seine-et-Marne (77)"],
    [{ kind: "mine", survey: ownSurvey() }, "Forêt de la Reine", ownSurveyLabels(ownSurvey()).meta],
    [
      { kind: "community", item: communitySurvey() },
      "Bois des Brosses",
      communitySurveyLabels(communitySurvey()).meta,
    ],
  ])("the %o best result gives its kind, title and meta", (best, title, meta) => {
    expect(bestResultLabels(best)).toEqual({ kind: best.kind, title, meta })
  })
})
