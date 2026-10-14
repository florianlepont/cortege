import { fr } from "../index"

// Phase 29 (D-02, C6): the finish sheet strings and the read-only visibility line.

function collectStrings(value: unknown, out: string[]): string[] {
  if (typeof value === "string") out.push(value)
  else if (value && typeof value === "object") {
    for (const child of Object.values(value)) collectStrings(child, out)
  }
  return out
}

describe("fr.surveyFinish", () => {
  const f = fr.surveyFinish

  test("the sheet title, group label and the two choices", () => {
    expect(f.title).toBe("Qui peut voir ce relevé ?")
    expect(f.groupA11y).toBe("Visibilité du relevé")
    expect(f.options.shared.label).toBe("Partagé avec l'association")
    expect(f.options.shared.caption).toBe(
      "Les membres de l'association peuvent le consulter, avec votre nom.",
    )
    expect(f.options.private.label).toBe("Privé")
    expect(f.options.private.caption).toBe(
      "Vous seul le voyez : il reste invisible pour les autres membres.",
    )
  })

  test("the footnote and the buttons", () => {
    expect(f.footnote).toBe("Ce choix ne pourra plus être modifié une fois le relevé terminé.")
    expect(f.confirm).toBe("Terminer le relevé")
    expect(f.confirmOffline).toBe("Enregistrer le choix")
    expect(f.cancel).toBe("Annuler")
    expect(f.close).toBe("Fermer")
  })

  test("the spoken labels", () => {
    expect(f.confirmA11y({ name: "Forêt de Rambouillet", choice: "Privé" })).toBe(
      "Terminer le relevé Forêt de Rambouillet. Visibilité : Privé.",
    )
    expect(f.confirmOfflineA11y({ choice: "Privé" })).toBe(
      "Enregistrer le choix. Visibilité : Privé.",
    )
    expect(f.submittingA11y).toBe("Envoi du relevé en cours")
  })

  test("the offline notice and the two errors", () => {
    expect(f.offline).toBe(
      "Vous êtes hors connexion. Votre choix est enregistré sur ce relevé et vous pourrez le terminer dès que la connexion sera rétablie.",
    )
    expect(f.errors.saveFailed).toBe(
      "Impossible d'enregistrer votre choix sur cet appareil. Réessayez.",
    )
    expect(f.errors.frozen).toBe(
      "Ce relevé est déjà terminé : sa visibilité ne peut plus être modifiée.",
    )
  })

  test("words defined once are shared", () => {
    expect(f.confirm).toBe(fr.surveyDetail.cta.finish)
    expect(f.cancel).toBe(fr.common.actions.cancel)
    expect(f.close).toBe(fr.common.actions.close)
    expect(fr.surveyDetail.visibility.line.finished.shared).toBe(f.options.shared.label)
    expect(fr.surveyDetail.visibility.line.finished.private).toBe(f.options.private.label)
  })
})

describe("fr.surveyDetail visibility line", () => {
  const { line } = fr.surveyDetail.visibility

  test("a finished survey says what it is, a draft has no line", () => {
    expect(line.finished.shared).toBe("Partagé avec l'association")
    expect(line.finished.private).toBe("Privé")
    expect(Object.keys(line)).toEqual(["finished"])
  })

  test("the spoken label says the choice can no longer change", () => {
    const { visibilityLine } = fr.surveyDetail.a11y
    expect(visibilityLine({ text: "partagé avec l'association" })).toBe(
      "Visibilité : partagé avec l'association. Ne peut plus être modifiée.",
    )
  })
})

describe("the word public stays out of the user-facing strings (D-02)", () => {
  test("no string of the phase says public or holds an em dash", () => {
    const strings = [
      ...collectStrings(fr.surveyFinish, []),
      ...collectStrings(fr.surveyDetail.visibility, []),
      fr.surveyFinish.confirmA11y({ name: "Forêt", choice: "Privé" }),
      fr.surveyFinish.confirmOfflineA11y({ choice: "Privé" }),
      fr.surveyDetail.a11y.visibilityLine({ text: "privé" }),
    ]
    expect(strings.length).toBeGreaterThan(15)
    for (const text of strings) {
      expect(text).not.toMatch(/\bpublic\b/i)
      expect(text).not.toContain("—")
    }
  })
})
