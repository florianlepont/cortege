import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { fr } from "../../i18n"
import type { NearbyParcel } from "../../hooks/useNearbyParcels"
import { NearbyMapCard } from "./NearbyMapCard"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: { position: "absolute" } },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T }) => options.ios },
  }
})
jest.mock("../../hooks/useNearbyParcels", () => ({
  hasMixedMethodVersions: (parcels: { latest_ibp_method_version?: string | null }[]) =>
    new Set(parcels.map((parcel) => parcel.latest_ibp_method_version ?? "3.0")).size > 1,
}))
jest.mock("../../map/maplibre/ParcelMap", () => ({ ParcelMap: "ParcelMap" }))
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", null, children),
  }
})

const POSITION = { lat: 45.1, lng: 5.7 }

function parcel(overrides: Partial<NearbyParcel> = {}): NearbyParcel {
  return {
    parcel_id: "p1",
    latest_ibp_total: 27,
    latest_ibp_method_version: "3.2",
    latest_observation_year: 2026,
    distanceKm: 1,
    surveyCount: 1,
    ...overrides,
  } as NearbyParcel
}

function render(parcels: NearbyParcel[], sectorAvgScore: number | null, onPress = jest.fn()) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <NearbyMapCard
        nearby={{
          position: POSITION,
          parcels,
          sectorAvgScore,
          loading: false,
          locationDenied: false,
          error: false,
        }}
        height={260}
        onPress={onPress}
      />,
    )
  })
  const root = tree!.root
  const texts = root
    .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
  return { root, texts, onPress }
}

describe("NearbyMapCard", () => {
  test("draws a still map centred on the phone, with the parcels around it", () => {
    const { root } = render([parcel()], 27)
    const map = root.findByType("ParcelMap" as never)
    expect(map.props.interactive).toBe(false)
    expect(map.props.marker).toEqual({ latitude: POSITION.lat, longitude: POSITION.lng })
    expect(map.props.initialRegion.latitude).toBe(POSITION.lat)
    expect(map.props.parcels).toHaveLength(1)
  })

  test("shows the sector's mean score and a one-line summary", () => {
    const { texts } = render([parcel(), parcel({ parcel_id: "p2" })], 27)
    expect(texts).toContain(fr.home.sector.label)
    expect(texts).toContain(fr.home.sector.score({ score: 27 }))
    expect(texts).toContain(fr.home.nearby.summary({ count: 2 }))
    expect(texts).toContain(fr.home.nearby.radius)
  })

  test("mentions mixed method versions next to the score", () => {
    const { texts } = render(
      [parcel(), parcel({ parcel_id: "p2", latest_ibp_method_version: null })],
      27,
    )
    expect(texts).toContain(fr.home.sector.mixedMethods)
  })

  test("no scored parcel: no score badge", () => {
    const { texts } = render([parcel({ latest_ibp_total: null })], null)
    expect(texts).not.toContain(fr.home.sector.label)
  })

  test("nothing nearby invites to start", () => {
    const { texts } = render([], null)
    expect(texts).toContain(fr.home.nearby.empty)
  })

  test("tapping the card calls onPress", () => {
    const { root, onPress } = render([parcel()], 27)
    act(() => {
      root.findByType("Pressable" as never).props.onPress()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
