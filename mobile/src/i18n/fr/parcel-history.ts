// Texts of the parcel survey history (REQ-B-survey-detail, REQ-C-versioning, REQ-C-history-split),
// shared by the Explorer map panel (screens/public-map/ParcelHistoryCard.tsx), the parcel history
// page of a survey and the community history page. Parameters are counts, scores, years, totals,
// letters and display names only, never survey ids.
import { IBP_MAX } from "@cortege/ibp-domain"

const signed = (value: number): string => (value > 0 ? `+${value}` : String(value))

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`

const spokenDelta = (delta: number | null): string => {
  if (delta === null) return "pas de comparaison"
  if (delta > 0) return `plus ${delta}`
  if (delta < 0) return `moins ${Math.abs(delta)}`
  return "inchangé"
}

export const parcelHistoryFr = {
  title: "Historique de la parcelle",
  loading: "Chargement de l'historique…",
  loadFailed: "Impossible de charger l'historique de cette parcelle.",
  empty: "Aucun relevé précédent sur cette parcelle.",
  entry: ({
    year,
    version,
    isLatest,
  }: {
    year: number | null
    version: number | null
    isLatest: boolean
  }) =>
    [
      year !== null ? `${year}` : null,
      // "version 3", never "v3": that reads like a method (v3.2).
      version !== null ? (year !== null ? `version ${version}` : `Version ${version}`) : null,
      isLatest ? "Dernier relevé" : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Relevé",
  openSurvey: (entry: string) => `${entry}. Ouvrir ce relevé`,
  total: (points: number) => `IBP ${points}/50`,
  delta: {
    total: (value: number) => `Total ${signed(value)}`,
    unavailable: "Pas de comparaison possible",
  },
  a11y: {
    openParcelHistory: "Voir l'historique de cette parcelle",
  },
  // The parcel history page (summary row target) and its community twin.
  page: {
    subtitle: "Les relevés faits sur cette parcelle.",
    first: "C'est le premier relevé de cette parcelle. Les suivants apparaîtront ici.",
    noParcel: "Aucune parcelle n'est liée à ce relevé. Choisissez-en une pour voir son historique.",
    offline:
      "L'historique de la parcelle n'est pas disponible hors connexion. Il s'affichera dès que vous serez en ligne.",
    reload: "Recharger l'historique",
    // The trend title is two plain strings (strong part, accent part) so every catalogue
    // function keeps returning a string.
    trend: {
      titleStrong: (delta: number) =>
        delta === 0
          ? "Aucun changement"
          : `${delta > 0 ? "+" : "-"}${plural(Math.abs(delta), "point", "points")}`,
      titleAccent: (year: number | null) =>
        year !== null ? ` depuis ${year}` : " depuis le premier relevé",
      newMethodStrong: (method: string) => `Passage à la méthode ${method}`,
      newMethodAccent: (year: number) => ` en ${year}`,
      newMethodUnknown: "Changement de méthode",
      mixed: "Méthodes v3.0 et v3.2 : totaux non strictement comparables.",
      unknownYear: "?",
      a11y: (points: ReadonlyArray<{ year: number | null; total: number }>) =>
        `Évolution du total IBP. ${points
          .map(
            (point) =>
              `${point.year !== null ? point.year : "année inconnue"}, ${point.total} sur ${IBP_MAX.total}.`,
          )
          .join(" ")}`,
      a11yMixed: " Courbe coupée entre les méthodes v3.0 et v3.2.",
    },
    deltas: {
      title: (year: number | null) =>
        year !== null ? `Depuis ${year}` : "Depuis le relevé précédent",
      total: ({
        delta,
        current,
        previous,
      }: {
        delta: number
        current: number
        previous: number
      }) =>
        delta === 0
          ? `Total : inchangé (${current})`
          : `Total : ${signed(delta)} (${current} contre ${previous})`,
      value: (delta: number) => (delta === 0 ? "=" : signed(delta)),
      none: "n.d.",
      row: ({
        letter,
        points,
        max,
        delta,
      }: {
        letter: string
        points: number | null
        max: number
        delta: number | null
      }) =>
        `Facteur ${letter}, ${points === null ? "non renseigné" : `${points} sur ${max}`}, ${spokenDelta(delta)}`,
      differentMethod:
        "Le relevé précédent suit une autre méthode : pas de comparaison par facteur.",
    },
    list: {
      title: (count: number) => `Relevés · ${count}`,
      current: "Ce relevé",
      method: (method: string) => `Méthode ${method}`,
      open: ({ entry, total }: { entry: string; total: number }) =>
        `${entry}, ${total} sur ${IBP_MAX.total}. Ouvrir ce relevé`,
      openCurrent: ({ entry, total }: { entry: string; total: number }) =>
        `${entry}, ${total} sur ${IBP_MAX.total}. Ce relevé`,
    },
  },
} as const
