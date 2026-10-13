import { commonFr } from "./common"

// Phase 29, D-02: the observer chooses who can read a survey before it is finished. The wire
// value "public" means "shared with the association" and is never shown: the two choices are
// keyed `shared` and `private` here, and only app/visibility-display.ts maps one to the other.
// `confirm` is a literal (pinned equal to surveyDetail.cta.finish by a test) because this module
// must not import survey-detail.ts, which imports it.
export const surveyFinishFr = {
  title: "Qui peut voir ce relevé ?",
  groupA11y: "Visibilité du relevé",
  options: {
    shared: {
      label: "Partagé avec l'association",
      caption: "Les membres de l'association peuvent le consulter, avec votre nom.",
    },
    private: {
      label: "Privé",
      caption: "Vous seul le voyez : il reste invisible pour les autres membres.",
    },
  },
  footnote: "Ce choix ne pourra plus être modifié une fois le relevé terminé.",
  confirm: "Terminer le relevé",
  confirmOffline: "Enregistrer le choix",
  confirmA11y: ({ name, choice }: { name: string; choice: string }) =>
    `Terminer le relevé ${name}. Visibilité : ${choice}.`,
  confirmOfflineA11y: ({ choice }: { choice: string }) =>
    `Enregistrer le choix. Visibilité : ${choice}.`,
  cancel: commonFr.actions.cancel,
  close: commonFr.actions.close,
  offline:
    "Vous êtes hors connexion. Votre choix est enregistré sur ce relevé et vous pourrez le terminer dès que la connexion sera rétablie.",
  submittingA11y: "Envoi du relevé en cours",
  errors: {
    saveFailed: "Impossible d'enregistrer votre choix sur cet appareil. Réessayez.",
    frozen: "Ce relevé est déjà terminé : sa visibilité ne peut plus être modifiée.",
  },
} as const
