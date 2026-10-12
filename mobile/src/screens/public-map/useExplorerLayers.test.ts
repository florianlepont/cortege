jest.mock("react-native", () => ({ StyleSheet: { hairlineWidth: 0.5, create: <T>(s: T) => s } }))
jest.mock("./MapChips", () => ({ MAP_PILL_HEIGHT: 40 }))
const mockListAreaLayers = jest.fn()
jest.mock("../../map/offline-packs", () => ({
  listAreaLayers: () => mockListAreaLayers(),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { MapRegion } from "../../app/map-viewport"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import type { MapLayerKey } from "../../map/layers"
import { MAP_PILL_HEIGHT } from "./MapChips"
import {
  capsuleButtonCenterY,
  capsuleHeight,
  downloadButtonTopOf,
  overlaySlotTopOf,
} from "./styles"
import { useExplorerLayers } from "./useExplorerLayers"
import type { ExplorerLayers } from "./useExplorerLayers"

const REGION: MapRegion = {
  latitude: 48.4,
  longitude: 2.7,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
}
const FRANCE: MapRegion = { ...REGION, latitudeDelta: 8, longitudeDelta: 8 }
const SURVEY_PARCELS: ReadonlySet<string> = new Set(["P1"])
const RUNNING: AreaDownloadStatus = {
  phase: "running",
  areaId: "a1",
  name: "Zone",
  percentage: 10,
  downloadedTiles: 1,
  totalTiles: 10,
}

type Overrides = Partial<Parameters<typeof useExplorerLayers>[0]>

const saveBasemap = jest.fn()

beforeEach(() => {
  saveBasemap.mockReset()
  mockListAreaLayers.mockReset()
  mockListAreaLayers.mockResolvedValue(new Map<string, Set<MapLayerKey>>())
})

afterEach(async () => {
  await cleanup()
})

const setup = (overrides: Overrides = {}) =>
  renderHook(
    (props: Overrides) =>
      useExplorerLayers({
        savedBasemap: "map",
        saveBasemap,
        region: REGION,
        areas: [],
        isOffline: false,
        surveyParcelIds: SURVEY_PARCELS,
        downloadStatus: null,
        cardOpen: false,
        bubbleOpen: false,
        capsuleTop: 60,
        showSkipped: false,
        ...props,
      }),
    { initialProps: overrides },
  )

const run = (result: { current: ExplorerLayers }, action: (layers: ExplorerLayers) => void) =>
  act(async () => action(result.current))

describe("useExplorerLayers", () => {
  test("the default display: saved base, no notice, no legend lines, parcels handed back", async () => {
    const { result } = await setup()
    expect(result.current.layers.displayedBase).toBe("map")
    expect(result.current.layers.state.parcels).toBe("all")
    expect(result.current.layers.state.overlay).toBe(false)
    expect(result.current.notices).toEqual([])
    expect(result.current.legendLines).toBeNull()
    expect(result.current.surveyParcelIds).toBe(SURVEY_PARCELS)
    expect(result.current.capsuleTop).toBe(60)
    expect(result.current.chipShown).toBe(false)
    expect(result.current.isAvailable("types-foret")).toBe(true)
    expect(result.current.areaAtCenter).toBe(false)
    expect(result.current.skipped).toBe(0)
  })

  test("the chip shows for a status while the card is closed and the swipe mode is off", async () => {
    const { result, rerender } = await setup({ downloadStatus: RUNNING })
    expect(result.current.chipShown).toBe(true)

    await rerender({ downloadStatus: RUNNING, cardOpen: true })
    expect(result.current.chipShown).toBe(false)

    await rerender({ downloadStatus: null })
    expect(result.current.chipShown).toBe(false)
  })

  test("the chip hides itself while the swipe mode is on, from its own layers state", async () => {
    const { result } = await setup({ downloadStatus: RUNNING })
    await run(result, (l) => l.layers.actions.enterSwipe())
    expect(result.current.layers.state.swipeMode).toBe(true)
    expect(result.current.chipShown).toBe(false)
    await run(result, (l) => l.layers.actions.exitSwipe())
    expect(result.current.chipShown).toBe(true)
  })

  test("the chip hides while the overlay bubble is open and comes back when it closes", async () => {
    const { result, rerender } = await setup({ downloadStatus: RUNNING })
    expect(result.current.chipShown).toBe(true)
    await rerender({ downloadStatus: RUNNING, bubbleOpen: true })
    expect(result.current.chipShown).toBe(false)
    expect(result.current.noticesTop).toBe(60)
    await rerender({ downloadStatus: RUNNING, bubbleOpen: false })
    expect(result.current.chipShown).toBe(true)
  })

  test("the download button and the bubble are placed from the capsule's helpers", async () => {
    const { result } = await setup()
    expect(result.current.downloadButtonTop).toBe(downloadButtonTopOf(60))
    expect(result.current.downloadButtonTop).toBe(60 + capsuleHeight(2) + 8)
    expect(result.current.overlayBubbleTop).toBe(overlaySlotTopOf(60))
    expect(result.current.overlayBubbleTop).toBe(capsuleButtonCenterY(60, 1) - 25)
  })

  test("the notices column starts at the capsule, or below the chip's row while a chip shows", async () => {
    const free = await setup()
    expect(free.result.current.noticesTop).toBe(60)
    await cleanup()

    const withChip = await setup({ downloadStatus: RUNNING })
    expect(withChip.result.current.noticesTop).toBe(
      downloadButtonTopOf(60) + 25 + MAP_PILL_HEIGHT / 2 + 8,
    )
    expect(withChip.result.current.noticesTop).toBe(60 + capsuleHeight(2) + 8 + 25 + 20 + 8)
  })

  test("the over-zoom, coverage and offline notices come from the shown layers", async () => {
    const { result } = await setup({ isOffline: true })
    expect(result.current.notices).toEqual([])

    await run(result, (l) => l.layers.actions.toggleOverlay())
    const kinds = () => result.current.notices.map((notice) => notice.kind)
    expect(kinds()).toContain("offline")
    expect(result.current.notices.find((notice) => notice.kind === "offline")?.text).toBe(
      fr.mapLayers.notice.offlineLayer(fr.mapLayers.layers.forestTypes.name),
    )
  })

  test("an error notice offers a retry and a coverage notice follows the view centre", async () => {
    const { result } = await setup({ region: { ...REGION, latitude: 4.5, longitude: -52 } })
    await run(result, (l) => l.layers.actions.toggleOverlay())
    expect(result.current.notices.map((notice) => notice.kind)).toContain("outside")

    await run(result, (l) => l.layers.actions.styleFailed("satellite"))
    const error = result.current.notices.find((notice) => notice.kind === "error")
    expect(error?.retry).toBe(true)
  })

  test("the skipped layers are counted for the swipe cycle only when asked", async () => {
    const offline = { isOffline: true }
    const quiet = await setup(offline)
    expect(quiet.result.current.skipped).toBe(0)
    await cleanup()

    const swiping = await setup({ ...offline, showSkipped: true })
    expect(swiping.result.current.skipped).toBe(3)
    expect(swiping.result.current.notices.map((notice) => notice.kind)).toContain("skipped")
  })

  test("over-zoom shows at a close zoom on an old base; the whole country shows none", async () => {
    const close = await setup({
      region: { ...REGION, latitudeDelta: 0.001, longitudeDelta: 0.001 },
    })
    await run(close.result, (l) => l.layers.actions.commitBase("etat-major"))
    expect(close.result.current.notices.map((notice) => notice.kind)).toContain("overzoom")
    await cleanup()

    const far = await setup({ region: FRANCE })
    await run(far.result, (l) => l.layers.actions.commitBase("etat-major"))
    expect(far.result.current.notices.map((notice) => notice.kind)).not.toContain("overzoom")
  })

  test("the legend lists one source line per shown layer, the cadastre, then the common line", async () => {
    const { result } = await setup()
    await run(result, (l) => l.layers.actions.toggleOverlay())
    expect(result.current.legendLines).toEqual([
      fr.mapLayers.layers.map.source,
      fr.mapLayers.layers.forestTypes.source,
      fr.mapLayers.layers.cadastreSource,
      fr.mapLayers.sources.common,
    ])

    await run(result, (l) => l.layers.actions.setParcels("none"))
    expect(result.current.legendLines).toEqual([
      fr.mapLayers.layers.map.source,
      fr.mapLayers.layers.forestTypes.source,
      fr.mapLayers.sources.common,
    ])
  })

  test("an old base alone lists its line, a comparison lists both sides", async () => {
    const { result } = await setup()
    await run(result, (l) => l.layers.actions.commitBase("photos-1950"))
    expect(result.current.legendLines?.[0]).toBe(fr.mapLayers.layers.photos1950.source)

    await run(result, (l) =>
      l.layers.actions.startCompare({ sideA: "photos-1950", sideB: "carte-1950", x: 200 }),
    )
    expect(result.current.layers.state.compare).not.toBeNull()
    const lines = result.current.legendLines ?? []
    expect(lines).toContain(fr.mapLayers.layers.photos1950.source)
    expect(lines).toContain(fr.mapLayers.layers.carte1950.source)
    expect(lines.at(-1)).toBe(fr.mapLayers.sources.common)
  })
})
