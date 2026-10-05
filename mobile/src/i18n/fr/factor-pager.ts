import { IBP_MAX } from "@cortege/ibp-domain"

// Phase 3 (FLOW-04): the A->J horizontal pager and its fixed footer control. OA-30: the header is
// one slim row (the factor's name and the running total) over the A to J strip; the footer is two
// buttons.
export const factorPagerFr = {
  previous: "Précédent",
  next: "Facteur suivant",
  finish: "Terminer",
  total: (points: number) => `${points} / ${IBP_MAX.total}`,
  totalA11y: (points: number) => `Total du relevé ${points} sur ${IBP_MAX.total}`,
  jumpTo: ({ factor, title }: { factor: string; title: string }) =>
    `Aller au facteur ${factor} : ${title}`,
} as const
