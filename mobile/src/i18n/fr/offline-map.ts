// Texts of Phase 8 (offline map): the basemap switch, the offline indicator, the offline-areas
// download sheet (screens/public-map/OfflineAreasSheet.tsx) and the missing-parcel warning
// (screens/public-map/ParcelHistoryCard.tsx). REQ-D-basemap-switch, REQ-D-area-download,
// REQ-D-offline-map, REQ-D-offline-parcel-warning.

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} Mo`
}

export const offlineMapFr = {
  indicator: {
    offline: "Hors connexion",
  },
  basemap: {
    map: "Plan",
    satellite: "Satellite",
    a11y: {
      switchTo: (label: string) => `Passer au fond de carte ${label}`,
    },
  },
  areas: {
    openSheet: "Zones hors connexion",
    title: "Zones hors connexion",
    subtitle: "Téléchargez la zone affichée pour l'utiliser sans réseau.",
    downloadThisArea: "Télécharger cette zone",
    downloading: "Téléchargement…",
    nameLabel: "Nom de la zone",
    namePlaceholder: "Ex. Bois du Nord",
    // `formattedDateTime` is built by the caller (never a Date in the catalogue itself, matching
    // the rest of the map catalogue: text functions take pre-formatted strings).
    defaultName: (formattedDateTime: string) => `Zone du ${formattedDateTime}`,
    estimate: ({ tiles, bytes }: { tiles: number; bytes: number }) =>
      `${tiles} tuiles · ~${formatMegabytes(bytes)}`,
    tooLarge: "Zone trop grande pour le téléchargement : zoomez avant de réessayer.",
    empty: "Aucune zone téléchargée pour le moment.",
    status: {
      downloading: "Téléchargement",
      ready: "Prête",
      failed: "Échec",
    },
    progress: ({ downloaded, total }: { downloaded: number; total: number }) =>
      `${downloaded}/${total} tuiles`,
    a11y: {
      openSheet: "Zones hors connexion",
      closeSheet: "Fermer les zones hors connexion",
      deleteArea: (name: string) => `Supprimer la zone ${name}`,
    },
  },
  parcelMissing: {
    title: "Parcelle non disponible hors connexion",
    message:
      "Cette parcelle n'a pas été téléchargée. Elle sera récupérée automatiquement au retour du réseau.",
    downloadAction: "Télécharger au retour du réseau",
    queued: "Téléchargement programmé dès que la connexion revient.",
  },
} as const
