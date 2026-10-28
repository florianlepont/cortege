import { IBP_MAX } from "@cortege/ibp-domain"

import { labelsFr } from "./labels"

// Phase 3 (FLOW-04): the A->J horizontal pager. OA-98: a slim title row (the factor's name, its score and the
// running total) on top; at the bottom a glass bar of A to J letters and a round "next" button.
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
  // Follow-up 32-26: the active factor's score and the survey total are one capsule in the header,
  // for A to J. Never the word "classe": a factor is scored out of its highest allowed score.
  factorScore: ({ score, max }: { score: number; max: number }) => `${score} / ${max}`,
  factorCaption: "Facteur",
  totalCaption: "Total",
  scoreWithTotalA11y: ({ score, max, points }: { score: number; max: number; points: number }) =>
    `Score du facteur ${score} sur ${max}, total du relevé ${points} sur ${IBP_MAX.total}`,
  // The toast over the pager's bottom bar when factor F's sum first reaches the top score.
  maxScoreToast: "Score maximal atteint : inutile de compter davantage.",
  maxScoreToastHint: "Touchez pour fermer",
  // OA-111: the A to J strip is one adjustable control for VoiceOver (swipe up or down to change).
  indexLabel: "Navigation entre les facteurs",
  indexValue: ({ factor, title }: { factor: string; title: string }) =>
    `Facteur ${factor}, ${title}`,
} as const
