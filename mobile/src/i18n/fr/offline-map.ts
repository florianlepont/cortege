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
    // 12.2-19: the map's edge glows green while this panel is open; the subtitle points at it.
    subtitle: "La zone affichée, encadrée en vert, sera disponible sans réseau.",
    downloadThisArea: "Télécharger la zone affichée",
    downloading: "Téléchargement…",
    nameLabel: "Nom de la zone",
    namePlaceholder: "Ex. Bois du Nord",
    // `formattedDateTime` is built by the caller (never a Date in the catalogue itself, matching
    // the rest of the map catalogue: text functions take pre-formatted strings).
    defaultName: (formattedDateTime: string) => `Zone du ${formattedDateTime}`,
    estimate: ({ tiles, bytes }: { tiles: number; bytes: number }) =>
      `${tiles} tuiles · ~${formatMegabytes(bytes)}`,
    downloadFailed: "Le téléchargement a échoué. Vérifiez votre connexion et réessayez.",
    tooLarge: "Zone trop grande pour le téléchargement : zoomez avant de réessayer.",
    empty: "Aucune zone téléchargée pour le moment.",
    status: {
      downloading: "Téléchargement",
      ready: "Prête",
      failed: "Échec",
    },
    progress: ({ downloaded, total }: { downloaded: number; total: number }) =>
      `${downloaded}/${total} tuiles`,
    // Paramètres > Cartes hors ligne: the downloaded zones, to review and delete.
    manage: {
      title: "Cartes hors ligne",
      sizeAndStatus: ({ megabytes, status }: { megabytes: string; status: string }) =>
        `${megabytes} Mo · ${status}`,
      footer:
        "Pour télécharger une zone, ouvrez l'Explorer et touchez le bouton de téléchargement. Une zone est aussi proposée quand vous créez un relevé.",
      empty: "Aucune zone téléchargée pour le moment.",
      confirmDeleteTitle: (name: string) => `Supprimer « ${name} » ?`,
      confirmDeleteMessage: "La carte de cette zone ne sera plus disponible hors connexion.",
      confirmDelete: "Supprimer",
    },
    a11y: {
      openSheet: "Zones hors connexion",
      closeSheet: "Fermer les zones hors connexion",
      deleteArea: (name: string) => `Supprimer la zone ${name}`,
    },
  },
  // Offer to download the map around a survey (12.1 lot 3): banner in the new-survey flow, row on
  // the survey page.
  prompt: {
    title: "Carte hors ligne",
    message: (megabytes: string) =>
      `Cette zone n'est pas encore sur votre téléphone. Téléchargez-la avant d'aller en forêt (environ 2 km autour, ${megabytes} Mo).`,
    download: "Télécharger",
    later: "Plus tard",
    downloading: (percent: number) => `Téléchargement · ${percent} %`,
    keepGoing: "Vous pouvez continuer : le relevé n'attend pas.",
    areaName: (siteName: string) => `Autour de ${siteName}`,
    row: {
      missing: (megabytes: string) => `Carte hors ligne : non téléchargée (${megabytes} Mo)`,
      downloaded: "Carte hors ligne : téléchargée",
    },
    a11y: {
      download: "Télécharger la carte hors ligne autour de ce relevé",
      later: "Ne pas télécharger la carte pour le moment",
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
