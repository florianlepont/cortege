// Phase 3 (FLOW-04): the A->J horizontal pager and its fixed footer control.
export const factorPagerFr = {
  position: ({ index, total }: { index: number; total: number }) => `Facteur ${index}/${total}`,
  previous: "Facteur précédent",
  next: "Facteur suivant",
  nextIncomplete: "Facteur incomplet suivant",
  allComplete: "Tous les facteurs sont complets",
  jumpTo: ({ factor, title }: { factor: string; title: string }) =>
    `Aller au facteur ${factor} : ${title}`,
} as const
