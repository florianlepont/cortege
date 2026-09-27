// Phase 3 (FLOW-10): the "Parcelles autour de vous" native sheet, offered as an alternative to
// tapping a polygon on the map during parcel selection.
export const nearbyParcelsSheetFr = {
  title: "Parcelles autour de vous",
  subtitle: "Cochez une ou plusieurs parcelles, dans un rayon d'environ 2,5 km.",
  close: "Fermer",
  trigger: "Parcelles autour de vous",
  loading: "Recherche des parcelles proches…",
  locationDenied: "Activez la localisation pour voir les parcelles proches.",
  loadError: "Impossible de charger les parcelles. Vérifiez votre connexion.",
  offline: "Cadastre indisponible hors ligne. Vous pourrez lier une parcelle plus tard.",
  empty: "Aucune parcelle trouvée à proximité.",
  distance: ({ km }: { km: string }) => `à ${km} km`,
  parcelLabel: ({ id }: { id: string }) => `Parcelle ${id}`,
  rowA11y: ({ id, distance, checked }: { id: string; distance: string; checked: boolean }) =>
    `Parcelle ${id}, ${distance}, ${checked ? "sélectionnée" : "non sélectionnée"}`,
} as const
