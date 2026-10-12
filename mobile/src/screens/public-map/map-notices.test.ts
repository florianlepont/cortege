import type { BaseLayerKey, MapLayerKey } from "../../map/layers"
import { buildMapNotices } from "./map-notices"
import type { MapNoticeInput } from "./map-notices"

const FONTAINEBLEAU = { lat: 48.4, lng: 2.7 }
const GUADELOUPE = { lat: 16.2, lng: -61.5 }

const base = (overrides: Partial<MapNoticeInput> = {}): MapNoticeInput => ({
  shownBases: ["map"],
  overlay: false,
  mapZoom: 14,
  center: FONTAINEBLEAU,
  isOffline: false,
  isAvailable: () => true,
  failedLayer: null,
  skippedCount: 0,
  ...overrides,
})

const unavailable =
  (...keys: MapLayerKey[]) =>
  (key: MapLayerKey) =>
    !keys.includes(key)

describe("buildMapNotices", () => {
  test("nothing to say gives no notice", () => {
    expect(buildMapNotices(base())).toEqual([])
  })

  test("an old base scaled 4 times or more gets the over-zoom pill, not before", () => {
    const shown: BaseLayerKey[] = ["etat-major"]
    expect(buildMapNotices(base({ shownBases: shown, mapZoom: 14 }))).toEqual([])
    const notices = buildMapNotices(base({ shownBases: shown, mapZoom: 16.2 }))
    expect(notices).toEqual([
      {
        id: "overzoom",
        kind: "overzoom",
        text: "Fond peu détaillé à cette échelle",
        icon: "information-circle-outline",
      },
    ])
  })

  test("the overlay alone gets its own over-zoom text", () => {
    const notices = buildMapNotices(base({ overlay: true, mapZoom: 17.2 }))
    expect(notices.map((n) => n.text)).toEqual(["Superposition peu détaillée à cette échelle"])
  })

  test("offline, two unavailable layers give one pill each, with the cloud glyph", () => {
    const notices = buildMapNotices(
      base({
        shownBases: ["photos-1950"],
        overlay: true,
        isOffline: true,
        isAvailable: unavailable("photos-1950", "types-foret"),
      }),
    )
    expect(notices.map((n) => [n.id, n.kind, n.text, n.icon])).toEqual([
      [
        "offline-photos-1950",
        "offline",
        "Photos aériennes (1950-1965) n'est pas téléchargée pour cette zone.",
        "cloud-offline-outline",
      ],
      [
        "offline-types-foret",
        "offline",
        "Types de forêt n'est pas téléchargée pour cette zone.",
        "cloud-offline-outline",
      ],
    ])
  })

  test("offline, three unavailable layers give one pill for all", () => {
    const notices = buildMapNotices(
      base({
        shownBases: ["etat-major", "carte-1950"],
        overlay: true,
        isOffline: true,
        isAvailable: unavailable("etat-major", "carte-1950", "types-foret"),
      }),
    )
    expect(notices).toEqual([
      {
        id: "offline-several",
        kind: "offline",
        text: "Plusieurs couches ne sont pas téléchargées pour cette zone.",
        icon: "cloud-offline-outline",
      },
    ])
  })

  test("online, availability is not asked: nothing says offline", () => {
    const isAvailable = jest.fn(() => false)
    const notices = buildMapNotices(base({ shownBases: ["etat-major"], isAvailable }))
    expect(notices).toEqual([])
    expect(isAvailable).not.toHaveBeenCalled()
  })

  test("offline with every shown layer available says nothing", () => {
    expect(buildMapNotices(base({ shownBases: ["satellite"], isOffline: true }))).toEqual([])
  })

  test("a layer shown twice (both sides) counts once", () => {
    const notices = buildMapNotices(
      base({
        shownBases: ["etat-major", "etat-major"],
        isOffline: true,
        isAvailable: unavailable("etat-major"),
      }),
    )
    expect(notices.map((n) => n.id)).toEqual(["offline-etat-major"])
  })

  test("a centre outside the coverage of a shown layer names the layer", () => {
    const notices = buildMapNotices(base({ shownBases: ["etat-major"], center: GUADELOUPE }))
    expect(notices).toEqual([
      {
        id: "outside-etat-major",
        kind: "outside",
        text: "Carte d'état-major (1820-1866) ne couvre pas cette zone.",
        icon: "alert-circle-outline",
      },
    ])
  })

  test("the overlay outside its coverage is named too", () => {
    const notices = buildMapNotices(base({ overlay: true, center: GUADELOUPE }))
    expect(notices.map((n) => n.text)).toEqual(["Types de forêt ne couvre pas cette zone."])
  })

  test("a load error offers a retry and is marked danger", () => {
    const notices = buildMapNotices(base({ failedLayer: "carte-1950" }))
    expect(notices).toEqual([
      {
        id: "error-carte-1950",
        kind: "error",
        text: "Impossible d'afficher Carte de 1950.",
        icon: "alert-circle-outline",
        danger: true,
        retry: true,
      },
    ])
  })

  test("the skipped layers, singular and plural", () => {
    const one = buildMapNotices(base({ skippedCount: 1 }))
    expect(one.map((n) => [n.id, n.kind, n.text, n.icon])).toEqual([
      ["skipped", "skipped", "1 fond non téléchargé pour cette zone est ignoré.", "layers-outline"],
    ])
    const two = buildMapNotices(base({ skippedCount: 2 }))
    expect(two.map((n) => n.text)).toEqual([
      "2 fonds non téléchargés pour cette zone sont ignorés.",
    ])
  })

  test("order: skipped, outside, offline, error, over-zoom", () => {
    const notices = buildMapNotices(
      base({
        shownBases: ["etat-major"],
        overlay: true,
        mapZoom: 18,
        center: GUADELOUPE,
        isOffline: true,
        isAvailable: unavailable("etat-major"),
        failedLayer: "types-foret",
        skippedCount: 3,
      }),
    )
    expect(notices.map((n) => n.kind)).toEqual([
      "skipped",
      "outside",
      "outside",
      "offline",
      "error",
      "overzoom",
    ])
  })
})
