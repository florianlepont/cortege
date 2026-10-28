import { IBP_MAX } from "@cortege/ibp-domain"

import { labelsFr } from "./labels"

// Phase 3 (FLOW-04): the A->J horizontal pager. OA-98: a slim title row (the factor's name and the
// running total) on top; at the bottom a glass bar of A to J letters and a round "next" button.
const classLabel = ({ retainedClass }: { retainedClass: string }): string =>
  `Classe ${retainedClass.replace(/^S/, "")}`

export const factorPagerFr = {
  next: "Facteur suivant",
  finish: "Terminer",
  // D-26: beside the "Terminer le relevé" pill, the round button only goes back to the summary.
  close: "Revenir au relevé sans le terminer",
  // The title at the top of a factor page. Only F differs from `labels.factorTitles`: the owner
  // asked for the short "DMH" there (2026-10-28; the abbreviation gate allows it in this file only,
  // without an info button). The header's spoken label stays the full factor title.
  pageTitles: { ...labelsFr.factorTitles, F: "DMH" },
  total: (points: number) => `${points} / ${IBP_MAX.total}`,
  totalA11y: (points: number) => `Total du relevé ${points} sur ${IBP_MAX.total}`,
  // Follow-up 32-24: the active factor's class sits in the header beside the total, for A to J.
  // The package's class label is "S5"; the app says "Classe 5" (the class number is the score).
  classLabel,
  classWithTotalA11y: ({ retainedClass, points }: { retainedClass: string; points: number }) =>
    `${classLabel({ retainedClass })}, total du relevé ${points} sur ${IBP_MAX.total}`,
  // OA-111: the A to J strip is one adjustable control for VoiceOver (swipe up or down to change).
  indexLabel: "Navigation entre les facteurs",
  indexValue: ({ factor, title }: { factor: string; title: string }) =>
    `Facteur ${factor}, ${title}`,
} as const
