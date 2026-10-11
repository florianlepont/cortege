// Phase 27 (D-18): the text of the Conditions section (weather and survey note), the summary
// card and the read-only views. Units are written after a no-break space (U+00A0, written
// \u00a0 so it stays visible in the source) so a value never wraps away from its unit.
// "Source : Météo-France" is the attribution required by the data licence (D-26).
export const conditionsFr = {
  title: "Conditions",
  subtitle: "Météo du jour et remarques de terrain. Facultatif.",
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
    fields: {
      temperature: {
        label: "Température",
        unit: "°C",
        placeholder: "ex. 14",
        a11y: "Température, en degrés Celsius",
        range: "Entre -40 et 55\u00a0°C",
      },
      wind: {
        label: "Vent",
        unit: "km/h",
        placeholder: "ex. 12",
        a11y: "Vent, en kilomètres par heure",
        range: "Entre 0 et 350\u00a0km/h",
      },
      rain: {
        label: "Pluie sur 24\u00a0h",
        unit: "mm",
        placeholder: "ex. 2",
        a11y: "Pluie sur les 24 dernières heures, en millimètres",
        range: "Entre 0 et 1000\u00a0mm",
      },
      time: {
        label: "Heure",
        placeholder: "ex. 14:30",
        a11y: "Heure de l'observation, heures et minutes",
        invalid: "Écrivez l'heure ainsi : 14:30",
      },
    },
    status: {
      noParcel:
        "La météo se remplit toute seule une fois la parcelle choisie. Vous pouvez aussi la saisir.",
      loading: "Recherche de la météo…",
      prefilled: "Préremplie d'après Météo-France pour l'heure indiquée.",
      edited:
        "Préremplie d'après Météo-France, modifiée par vous. Vos valeurs ne seront pas remplacées.",
      manual: "Saisie par vous.",
      offline:
        "Pas de connexion. La météo se remplira quand le réseau reviendra, vous pouvez aussi la saisir.",
      unavailable:
        "La météo n'est pas disponible pour le moment. Elle se remplira plus tard, vous pouvez aussi la saisir.",
      retry: "Réessayer",
      refill: "Remplir à nouveau",
      refillA11y: "Remplir à nouveau la météo avec Météo-France",
    },
    refillConfirm: {
      title: "Remplacer vos valeurs ?",
      message:
        "Les valeurs que vous avez modifiées seront remplacées par la météo de Météo-France.",
      confirm: "Remplacer",
      cancel: "Annuler",
    },
    source: "Source : Météo-France",
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
    empty: "Aucune condition renseignée.",
    noWeather: "Météo non renseignée.",
    sourcePrefilled: "Source : Météo-France.",
    sourceEdited: "Préremplie d'après Météo-France, modifiée par l'observateur.",
    sourceManual: "Saisie par l'observateur.",
  },
  summary: {
    emptyTitle: "Conditions du relevé",
    emptyBody: "Météo et note, facultatif",
    loading: "Recherche de la météo…",
    open: "Ouvrir les conditions du relevé",
    openWithLine: (line: string) => `Ouvrir les conditions du relevé. ${line}`,
    noteMore: "Lire la suite",
    noteMoreA11y: "Lire la suite, développe la note",
    noteLess: "Réduire",
    noteLessA11y: "Réduire la note",
  },
} as const
