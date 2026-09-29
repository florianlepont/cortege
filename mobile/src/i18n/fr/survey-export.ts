import { IBP_MAX } from "@cortege/ibp-domain"

// Texts baked into the on-device PDF export (REQ-C-pdf-export, ROADMAP Phase 10). This HTML is
// rendered by expo-print, never shown as an app screen, so it has its own small catalogue section
// rather than reusing survey-detail's (whose strings are written for on-screen labels/subtitles).

export const surveyExportFr = {
  documentTitle: (siteName: string) => `Relevé IBP : ${siteName}`,
  identity: {
    site: "Site",
    parcels: "Parcelle(s) cadastrale(s)",
    noParcel: "Non renseignée",
    observationYear: "Année d'observation",
    versionNumber: "Version du relevé",
    date: "Date",
    method: "Méthode IBP",
    unknown: "—",
  },
  scores: {
    title: "Score IBP",
    total: (points: number) => `${points} / ${IBP_MAX.total}`,
    stand: (points: number) => `Peuplement et gestion : ${points} / ${IBP_MAX.stand}`,
    context: (points: number) => `Contexte : ${points} / ${IBP_MAX.context}`,
    factorHeader: "Facteur",
    classHeader: "Classe",
    notFilled: "Non renseigné",
  },
  footer: (generatedAt: string) => `Généré le ${generatedAt} par l'application Cortège.`,
  shareDialogTitle: (siteName: string) => `Partager le relevé ${siteName}`,
} as const
