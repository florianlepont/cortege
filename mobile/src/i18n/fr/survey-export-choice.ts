import { commonFr } from "./common"

// Phase 33, D-05, D-09, D-14 and D-15: the export choice sheet that opens from the header
// "Partager" button. The member picks the complete PDF or the one-page summary. "PDF" is an allowed
// abbreviation. The card captions carry the page count (UI-SPEC U-03); the stand-alone draft
// sentence explains the disabled summary card (U-04). The page count of the complete PDF is only
// approximate: the estimate comes from the block heights, not from a render.
export const surveyExportChoiceFr = {
  title: "Quel PDF voulez-vous ?",
  groupA11y: "Type de PDF",
  options: {
    complete: {
      label: "Complet",
      caption: ({ count }: { count: number }) =>
        `Tout le relevé : identité, conditions, parcours, facteurs, carte, évolution et photos. Environ ${count} ${count > 1 ? "pages" : "page"}.`,
    },
    summary: {
      label: "Résumé",
      caption:
        "Une page à présenter aux partenaires et aux financeurs : score, parcelle, facteurs et évolution. 1 page.",
    },
  },
  summaryDraft: "Le résumé est réservé aux relevés terminés. Terminez le relevé pour l'obtenir.",
  summaryDraftA11y: "Résumé, indisponible. Le résumé est réservé aux relevés terminés.",
  confirm: "Exporter le PDF",
  confirmA11y: {
    complete: ({ name }: { name: string }) => `Exporter le PDF complet du relevé ${name}.`,
    summary: ({ name }: { name: string }) => `Exporter le PDF résumé du relevé ${name}.`,
  },
  cancel: commonFr.actions.cancel,
} as const
