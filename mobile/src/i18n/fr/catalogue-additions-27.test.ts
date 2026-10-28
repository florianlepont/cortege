import { fr } from "../index"

// Phase 27 (D-13, D-17, D-18): the additions to the existing catalogue modules.

describe("fr.factorDetail.strip", () => {
  const { doubt, note } = fr.factorDetail.strip

  test("the doubt pill states that the score does not change", () => {
    expect(doubt.label).toBe("Incertitude")
    expect(doubt.hint).toBe("Signale une incertitude sur ce facteur. Le score ne change pas.")
  })

  test("the note pill names the factor for a screen reader", () => {
    expect(note.label).toBe("Note")
    expect(note.withPreview("Sol humide")).toBe("Note : Sol humide")
    expect(note.addA11y("Genres")).toBe("Ajouter une note au facteur Genres")
    expect(note.editA11y("Genres")).toBe("Modifier la note du facteur Genres")
    expect(note.closeA11y("Genres")).toBe("Fermer la note du facteur Genres")
    expect(note.fieldLabel("Genres")).toBe("Note du facteur Genres")
  })

  test("the note field tells who can read it and how long it can be", () => {
    expect(note.visibility).toBe("Visible par les membres qui peuvent lire le relevé.")
    expect(note.hint).toBe(
      "300 caractères au plus. Visible par les membres qui peuvent lire le relevé.",
    )
    expect(note.placeholder).toBe("Ce que vous avez vu, pourquoi cette incertitude…")
  })

  test("the counter and its spoken twin share the shape of the survey note", () => {
    expect(note.counter({ count: 12, max: 300 })).toBe("12 / 300")
    expect(note.counterA11y({ count: 12, max: 300 })).toBe("12 caractères sur 300")
    expect(note.counter({ count: 12, max: 300 })).toBe(
      fr.conditions.note.counter({ count: 12, max: 300 }),
    )
  })
})

describe("fr.surveyDetail factor rows", () => {
  const { a11y, factors } = fr.surveyDetail
  const base = { title: "Bois morts", value: "3 sur 5" }

  test("the row texts of the doubt badge and the folded note", () => {
    expect(factors.doubtBadge).toBe("Incertitude")
    expect(factors.noteMore).toBe("Lire la suite")
    expect(factors.noteMoreA11y).toBe("Lire la suite, développe la note")
    expect(factors.noteLess).toBe("Réduire")
    expect(factors.noteLessA11y).toBe("Réduire la note")
  })

  test("openFactor is unchanged without flags, or with both false", () => {
    expect(a11y.openFactor(base)).toBe("Ouvrir le facteur Bois morts, 3 sur 5")
    expect(a11y.openFactor({ ...base, doubtful: false, hasNote: false })).toBe(
      "Ouvrir le facteur Bois morts, 3 sur 5",
    )
  })

  test("openFactor appends the doubt, then the note", () => {
    expect(a11y.openFactor({ ...base, doubtful: true })).toBe(
      "Ouvrir le facteur Bois morts, 3 sur 5, incertitude signalée",
    )
    expect(a11y.openFactor({ ...base, hasNote: true })).toBe(
      "Ouvrir le facteur Bois morts, 3 sur 5, avec une note",
    )
    expect(a11y.openFactor({ ...base, doubtful: true, hasNote: true })).toBe(
      "Ouvrir le facteur Bois morts, 3 sur 5, incertitude signalée, avec une note",
    )
  })

  test("factorReadOnly has the same four combinations and no Ouvrir", () => {
    expect(a11y.factorReadOnly(base)).toBe("Bois morts, 3 sur 5")
    expect(a11y.factorReadOnly({ ...base, doubtful: true })).toBe("Bois morts, 3 sur 5, incertitude signalée")
    expect(a11y.factorReadOnly({ ...base, hasNote: true })).toBe(
      "Bois morts, 3 sur 5, avec une note",
    )
    expect(a11y.factorReadOnly({ ...base, doubtful: true, hasNote: true })).toBe(
      "Bois morts, 3 sur 5, incertitude signalée, avec une note",
    )
  })
})

describe("fr.surveyExport conditions", () => {
  const { conditions, factors } = fr.surveyExport

  test("the headings and the factor badge and note captions", () => {
    expect(conditions.heading).toBe("Conditions du relevé")
    expect(conditions.weather).toBe("Météo")
    expect(conditions.source).toBe("Source de la météo")
    expect(conditions.note).toBe("Note du relevé")
    expect(factors.doubt).toBe("Incertitude")
    expect(factors.note).toBe("Note")
  })

  test("the weather sentence ends with the observation time when there is one", () => {
    expect(conditions.weatherSentence({ line: "Nuageux, 14 °C", time: "14:30" })).toBe(
      "Nuageux, 14 °C, observée à 14:30.",
    )
  })

  test("the weather sentence has no time clause without a time", () => {
    expect(conditions.weatherSentence({ line: "Nuageux", time: null })).toBe("Nuageux.")
  })

  test("the source values, Météo-France first (D-26, D-37)", () => {
    expect(conditions.sourceValue.provider).toBe("Météo-France")
    expect(conditions.sourceValue.providerObserverSky).toBe(
      "Météo-France, conditions saisies par l'observateur",
    )
    expect(conditions.sourceValue.manual).toBe("Conditions saisies par l'observateur")
  })

  test("the dated source values name the measurement (D-31)", () => {
    const stamp = { date: "12/10/2026", time: "04:00" }
    expect(conditions.sourceValue.providerDated(stamp)).toBe(
      "Météo-France, mesure du 12/10/2026 à 04:00",
    )
    expect(conditions.sourceValue.providerObserverSkyDated(stamp)).toBe(
      "Météo-France, mesure du 12/10/2026 à 04:00, conditions saisies par l'observateur",
    )
  })
})

describe("fr.parcelHistory and fr.search additions", () => {
  test("the history row label announces the note", () => {
    expect(fr.parcelHistory.page.list.noteA11y("Sol très sec")).toBe("note : Sol très sec")
  })

  test("a search result found through its note says so", () => {
    expect(fr.search.rows.matchedInNote).toBe("Trouvé dans la note")
    expect(fr.search.rows.matchedInNoteMeta("Brouillon · 5 oct.")).toBe(
      "Brouillon · 5 oct. · Trouvé dans la note",
    )
    expect(fr.search.rows.matchedInNoteA11y("Forêt, Brouillon")).toBe(
      "Forêt, Brouillon, Trouvé dans la note",
    )
  })
})
