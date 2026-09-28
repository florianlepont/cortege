// ONB-01: the first-launch carousel (3 slides) + the permissions-priming screen that follows it.
export const onboardingFr = {
  carousel: {
    skip: "Passer",
    next: "Suivant",
    start: "Commencer",
    progressLabel: ({ index, count }: { index: number; count: number }) =>
      `Écran ${index} sur ${count}`,
    slides: [
      {
        eyebrow: "10 FACTEURS",
        title: "Évaluez la biodiversité d'une parcelle",
        body: "L'Indice de Biodiversité Potentielle note dix facteurs de terrain — essences, bois mort, vieux arbres, connectivité — pour donner une note claire sur 50.",
      },
      {
        eyebrow: "HORS LIGNE",
        title: "Travaillez sans réseau",
        body: "Vos relevés sont enregistrés sur l'appareil et se synchronisent dès que le réseau revient. Rien n'est perdu en forêt.",
      },
      {
        eyebrow: "CARTE MEMBRES",
        title: "Explorez les relevés du réseau",
        body: "Une fois connecté, la carte Explorer montre les relevés soumis par les autres membres de l'association, avec leur score.",
      },
    ],
  },
  permissions: {
    eyebrow: "AVANT DE COMMENCER",
    title: "Deux autorisations utiles sur le terrain",
    body: "Cortege les utilise uniquement pendant un relevé, jamais en arrière-plan.",
    location: {
      title: "Localisation",
      body: "Centre la carte, identifie la parcelle et situe le relevé.",
      action: "Autoriser la localisation",
      granted: "Localisation autorisée",
      denied: "Localisation refusée",
    },
    camera: {
      title: "Appareil photo",
      body: "Photographie la parcelle et les éléments observés pendant le relevé.",
      action: "Autoriser l'appareil photo",
      granted: "Appareil photo autorisé",
      denied: "Appareil photo refusé",
    },
    openSettings: "Ouvrir les réglages",
    continue: "Continuer",
  },
} as const
