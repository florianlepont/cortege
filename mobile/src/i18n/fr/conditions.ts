// Phase 27 (D-18): the text of the Conditions section (weather and survey note), the summary
// card and the read-only views. Units are written after a no-break space (U+00A0, written
// \u00a0 so it stays visible in the source) so a value never wraps away from its unit.
// "Source : Météo-France" is the attribution required by the data licence (D-26), with the date
// of the data (D-31) and, when the sky is the observer's, a clause saying so (D-37): `date` is "dd/mm/yyyy" and `time` "HH:mm", both from the local clock.
type DataStamp = { date: string; time: string }
export const conditionsFr = {
  // The Contexte page section (D-33: the note left it, so it is the weather only).
  section: {
    title: "Météo",
    subtitle: "Météo du jour. Facultatif.",
  },
  sky: {
    groupLabel: "Ciel",
    groupA11y: "Ciel du jour",
    clear: "Dégagé",
    partly_cloudy: "Peu nuageux",
    cloudy: "Nuageux",
    overcast: "Couvert",
    fog: "Brouillard",
    rain: "Pluie",
    thunderstorm: "Orage",
    snow: "Neige",
  },
  weather: {
    title: "Météo",
    // The label and value rows of the provider's measurements (read-only, D-37).
    rows: {
      temperature: "Température",
      wind: "Vent",
      rain: "Pluie sur 24\u00a0h",
      time: "Heure de la mesure",
    },
    // The status line speaks of the measurements only; the sky is the observer's own choice (D-37).
    status: {
      noParcel:
        "Les mesures de Météo-France s'affichent une fois la parcelle choisie. Vous pouvez déjà indiquer le ciel.",
      loading: "Recherche de la météo…",
      prefilled: "Mesures de Météo-France pour l'heure du relevé.",
      prefilledDated: ({ date, time }: DataStamp) =>
        `Mesures de Météo-France, mesure du ${date} à ${time}.`,
      offline:
        "Pas de connexion. Les mesures de Météo-France arriveront quand le réseau reviendra. Vous pouvez déjà indiquer le ciel.",
      unavailable:
        "Les mesures de Météo-France ne sont pas disponibles pour le moment. Elles arriveront plus tard si possible. Vous pouvez indiquer le ciel.",
      retry: "Réessayer",
    },
    source: "Source : Météo-France",
    // The same line with the date of the data (D-31: the licence asks for it).
    sourceDated: ({ date, time }: DataStamp) =>
      `Source : Météo-France, mesure du ${date} à ${time}`,
    // The sky shown is the observer's: it is never presented as the provider's (D-31, D-37).
    sourceObserverSky: "Source : Météo-France, ciel saisi par l'observateur",
    sourceObserverSkyDated: ({ date, time }: DataStamp) =>
      `Source : Météo-France, mesure du ${date} à ${time}, ciel saisi par l'observateur`,
    // One value with its unit, for the label and value rows of the read-only card.
    values: {
      temperature: (value: string) => `${value}\u00a0°C`,
      wind: (value: string) => `${value}\u00a0km/h`,
      rain: (value: string) => `${value}\u00a0mm`,
    },
    // Values as printed on one line (summary card, community, PDF); numbers arrive formatted.
    parts: {
      temperature: (value: string) => `${value}\u00a0°C`,
      wind: (value: string) => `vent ${value}\u00a0km/h`,
      rain: (value: string) => `pluie ${value}\u00a0mm sur 24\u00a0h`,
      line: (parts: readonly string[]) => parts.join(", "),
    },
  },
  note: {
    label: "Note du relevé",
    placeholder: "Contexte, remarques de terrain…",
    visibility: "Visible par les membres qui peuvent lire ce relevé.",
    a11yHint: "1000 caractères au plus. Visible par les membres qui peuvent lire ce relevé.",
    counter: ({ count, max }: { count: number; max: number }) => `${count} / ${max}`,
    counterA11y: ({ count, max }: { count: number; max: number }) =>
      `${count} caractères sur ${max}`,
  },
  readOnly: {
    empty: "Météo non renseignée.",
    // Only the sky, chosen by the observer, with no measurement from the provider (D-37).
    sourceManual: "Ciel saisi par l'observateur.",
  },
  summary: {
    emptyTitle: "Météo du relevé",
    emptyBody: "Facultatif",
    loading: "Recherche de la météo…",
    open: "Ouvrir la météo du relevé",
    openWithLine: (line: string) => `Ouvrir la météo du relevé. ${line}`,
    // D-35: the whole attribution on the card, very short; the dated sentence is in the detail.
    mention: "Météo-France",
  },
} as const
