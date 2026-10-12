import { offlineMapFr } from "./offline-map"
import { mapLayersFr } from "./map-layers"
import { fr } from "./index"

const NBSP = " "

describe("fr.mapLayers", () => {
  test("is published as fr.mapLayers", () => {
    expect(fr.mapLayers).toBe(mapLayersFr)
  })

  describe("download.megabytes", () => {
    test.each([
      [84_200_000, "84"],
      [10_000_000, "10"],
      [9_450_000, "9,5"],
      [0, "0"],
      [9_949_999, "9,9"],
      [9_950_000, "10"],
      [5_000_000, "5"],
      [400_000, "0,4"],
      [Number.NaN, "0"],
    ])("%d bytes read %s", (bytes, expected) => {
      expect(mapLayersFr.download.megabytes(bytes)).toBe(expected)
    })
  })

  describe("download texts", () => {
    test("estimate lines", () => {
      expect(mapLayersFr.download.estimate("84")).toBe(
        "Environ 84 Mo pour la zone encadrée en vert",
      )
      expect(mapLayersFr.download.estimateSplit({ base: "53", extra: "31" })).toBe(
        "Fonds de carte : 53 Mo. Autres couches : 31 Mo.",
      )
      expect(mapLayersFr.download.estimateBaseOnly).toBe(
        "Fonds de carte seulement, réglable dans Paramètres.",
      )
      expect(mapLayersFr.download.policyHint).toBe("Réglable dans Paramètres, Cartes.")
    })

    test("the chip spells the percentage like the existing sheet", () => {
      expect(mapLayersFr.download.chip.running(42)).toBe(offlineMapFr.areas.running.percent(42))
    })

    test("partial names the layers that failed", () => {
      expect(mapLayersFr.download.partial("Types de forêt")).toBe(
        "Ces couches n'ont pas pu être téléchargées : Types de forêt. Les fonds de carte fonctionnent hors connexion.",
      )
    })
  })

  describe("basemap texts", () => {
    test("skipped agrees in number", () => {
      expect(mapLayersFr.basemap.skipped(1)).toBe(
        "1 fond non téléchargé pour cette zone est ignoré.",
      )
      expect(mapLayersFr.basemap.skipped(3)).toBe(
        "3 fonds non téléchargés pour cette zone sont ignorés.",
      )
    })

    test("indicator and announcements", () => {
      expect(
        mapLayersFr.basemap.indicatorA11y({
          name: "Plan",
          era: "aujourd'hui",
          index: 1,
          count: 5,
        }),
      ).toBe("Plan, aujourd'hui, fond 1 sur 5")
      expect(mapLayersFr.basemap.announceEnter({ name: "Plan", era: "aujourd'hui" })).toBe(
        "Changement de fond. Plan, aujourd'hui.",
      )
      expect(mapLayersFr.basemap.announceChanged({ name: "Plan", era: "aujourd'hui" })).toBe(
        "Plan, aujourd'hui",
      )
    })

    test("hints", () => {
      expect(mapLayersFr.basemap.hintCancel).toBe("Lâchez pour revenir")
      expect(mapLayersFr.basemap.hintRelease).toBe("Lâchez pour comparer")
      expect(mapLayersFr.basemap.hintChange).toBe("Lâchez pour changer de fond")
      expect(mapLayersFr.basemap.hintSwipe).toBe("Glissez · lâchez au milieu pour comparer")
    })
  })

  describe("layers", () => {
    test("bases carry a name, short name, swipe name, era and source", () => {
      for (const key of ["map", "satellite", "etatMajor", "carte1950", "photos1950"] as const) {
        const layer = mapLayersFr.layers[key]
        expect(Object.keys(layer)).toEqual(
          expect.arrayContaining(["name", "short", "swipeName", "era", "source"]),
        )
      }
    })

    test("old bases and the overlay state their coverage", () => {
      for (const key of ["etatMajor", "carte1950", "photos1950", "forestTypes"] as const) {
        expect(mapLayersFr.layers[key].coverage.length).toBeGreaterThan(0)
      }
    })

    test("the forest types overlay has no swipe name or era (it is never a base)", () => {
      expect(Object.keys(mapLayersFr.layers.forestTypes).sort()).toEqual([
        "coverage",
        "name",
        "short",
        "source",
      ])
    })

    test("the cadastre source line is plain text", () => {
      expect(mapLayersFr.layers.cadastreSource).toContain("Cadastre")
    })

    test("the 1950 map writes its scale with no-break spaces around the colon", () => {
      expect(mapLayersFr.layers.carte1950.source).toContain(`1${NBSP}:${NBSP}50${NBSP}000`)
    })

    test("the cycle names are the final ones", () => {
      expect(mapLayersFr.layers.etatMajor.name).toBe("Carte d'état-major (1820-1866)")
      expect(mapLayersFr.layers.photos1950.swipeName).toBe("Photos aériennes")
      expect(mapLayersFr.layers.photos1950.era).toBe("1950-1965")
    })
  })

  describe("compare and overlays", () => {
    test("the quit pill and the hints", () => {
      expect(mapLayersFr.compare.exit).toBe("Quitter la comparaison")
      expect(mapLayersFr.compare.sideLeft).toBe("Côté gauche")
      expect(mapLayersFr.compare.sideRight).toBe("Côté droit")
      expect(mapLayersFr.compare.sideA11yLabel({ side: "left", name: "Plan" })).toBe(
        "Côté gauche : Plan",
      )
      expect(mapLayersFr.compare.sideA11yLabel({ side: "right", name: "Plan" })).toBe(
        "Côté droit : Plan",
      )
      expect(mapLayersFr.compare.sideA11yHint).toBe(
        "Balayez vers le haut ou le bas pour changer le fond de ce côté",
      )
      expect(mapLayersFr.compare.sideA11yValue({ name: "Plan", era: "aujourd'hui" })).toBe(
        "Plan, aujourd'hui",
      )
      expect(
        mapLayersFr.compare.announceSide({
          side: "right",
          name: "Photos aériennes",
          era: "1950-1965",
        }),
      ).toBe("Côté droit : Photos aériennes, 1950-1965")
      expect(
        mapLayersFr.compare.announceSide({ side: "left", name: "Plan", era: "aujourd'hui" }),
      ).toBe("Côté gauche : Plan, aujourd'hui")
      expect(mapLayersFr.compare.handleA11yLabel).toBe("Séparation de la comparaison")
      expect(mapLayersFr.compare.handleA11yHint).toBe(
        "Faites glisser vers un bord pour quitter la comparaison",
      )
      expect(mapLayersFr.compare.handleA11yValue({ left: "Plan", right: "Photos 1950" })).toBe(
        "Plan à gauche, Photos 1950 à droite",
      )
      expect(mapLayersFr.compare.hintExit).toBe("Lâchez pour quitter la comparaison")
      expect(mapLayersFr.compare.actionKeepLeft).toBe("Quitter en gardant le fond de gauche")
      expect(mapLayersFr.compare.actionKeepRight).toBe("Quitter en gardant le fond de droite")
      expect(mapLayersFr.compare.announceStart({ left: "Plan", right: "Satellite" })).toBe(
        "Comparaison : Plan à gauche, Satellite à droite.",
      )
    })

    test("the legend label names the classes of the official legend", () => {
      expect(mapLayersFr.overlays.legendA11y).toContain("forêts fermées")
      expect(mapLayersFr.overlays.legendA11y).toContain("peupleraies")
    })
  })

  describe("notices and policy", () => {
    test("notices", () => {
      expect(mapLayersFr.notice.outside("Carte de 1950")).toBe(
        "Carte de 1950 ne couvre pas cette zone.",
      )
      expect(mapLayersFr.notice.offlineLayer("Types de forêt")).toBe(
        "Types de forêt n'est pas téléchargée pour cette zone.",
      )
      expect(mapLayersFr.notice.loadError("Plan")).toBe("Impossible d'afficher Plan.")
    })

    test("policy rows", () => {
      expect(mapLayersFr.policy.rowA11y("Toutes les couches")).toBe(
        "Couches hors ligne, Toutes les couches",
      )
      expect(mapLayersFr.policy.optionAll("84")).toBe("Toutes les couches · environ 84 Mo")
      expect(mapLayersFr.policy.optionBase("53")).toBe("Fonds de carte seulement · environ 53 Mo")
    })
  })

  describe("sources", () => {
    test("the common line writes IGN out in full", () => {
      expect(mapLayersFr.sources.common).toContain(
        "Institut national de l'information géographique et forestière (IGN)",
      )
    })
  })

  test("the keys the previous revision of the contract removed are not created", () => {
    const flat = JSON.stringify(
      Object.keys(mapLayersFr.compare).concat(Object.keys(mapLayersFr.notice)),
    )
    for (const removed of [
      "startLabel",
      "stopLabel",
      "pillLabel",
      "captionLeft",
      "pairTooHeavy",
      "backToPlan",
    ]) {
      expect(flat).not.toContain(removed)
    }
    expect(Object.keys(mapLayersFr)).not.toContain("study")
    expect(Object.keys(mapLayersFr)).not.toContain("row")
  })
})
