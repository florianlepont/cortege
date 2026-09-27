import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"

// Factor A's 34 CNPF genus codes (packages/ibp-domain/src/genus.ts) have no French display name of
// their own anywhere in the app yet — this is the first UI to show them to a surveyor, so the
// mapping is built here rather than reused from somewhere else. Common French genus names, not
// species names (D-01: recognition and counting are genus-level only). The two Quercus classes are
// disambiguated by leaf habit, matching how the CNPF PDF itself distinguishes them.
export const genusDisplayNameFr: Record<CnpfFactorAGenusCode, string> = {
  Abies: "Sapin",
  Acer: "Érable",
  Alnus: "Aulne",
  Arbutus: "Arbousier",
  Betula: "Bouleau",
  Carpinus: "Charme",
  Castanea: "Châtaignier",
  Celtis: "Micocoulier",
  Cupressus: "Cyprès",
  Fagus: "Hêtre",
  Fraxinus: "Frêne",
  Juglans: "Noyer",
  Juniperus: "Genévrier",
  Larix: "Mélèze",
  Malus: "Pommier",
  Ostrya: "Charme-houblon",
  Picea: "Épicéa",
  Pinus: "Pin",
  Populus: "Peuplier",
  Prunus: "Prunier / Cerisier",
  Pyrus: "Poirier",
  Quercus_deciduae: "Chêne à feuilles caduques",
  Quercus_sempervirens: "Chêne à feuilles persistantes",
  Salix: "Saule",
  Sorbus: "Sorbier",
  Tamarix: "Tamaris",
  Taxus: "If",
  Tilia: "Tilleul",
  Ulmus: "Orme",
  Ceratonia: "Caroubier",
  Cercis: "Arbre de Judée",
  Olea: "Olivier",
  Phillyrea: "Filaire",
  Pistacia: "Pistachier",
}

export const genusFr = {
  displayName: genusDisplayNameFr,
} as const
