import { IBP_MAX } from "@cortege/ibp-domain"

// Phase 3 (FLOW-04): the A->J horizontal pager. OA-98: a slim title row (the factor's name and the
// running total) on top; at the bottom a glass bar of A to J letters and a round "next" button.
export const factorPagerFr = {
  next: "Facteur suivant",
  finish: "Terminer",
  total: (points: number) => `${points} / ${IBP_MAX.total}`,
  totalA11y: (points: number) => `Total du relevé ${points} sur ${IBP_MAX.total}`,
  jumpTo: ({ factor, title }: { factor: string; title: string }) =>
    `Aller au facteur ${factor} : ${title}`,
} as const
