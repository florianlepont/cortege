import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { fr } from "../../i18n"
import type { NearbyParcel } from "../../hooks/useNearbyParcels"
import { brandColors } from "../../app/brand-tokens"
import { buildTheme, defaultTheme } from "../../app/theme"
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
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: { position: "absolute" } },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T }) => options.ios },
  }
})
jest.mock("../../hooks/useNearbyParcels", () => ({
  hasMixedMethodVersions: (parcels: { latest_ibp_method_version?: string | null }[]) =>
    new Set(parcels.map((parcel) => parcel.latest_ibp_method_version ?? "3.0")).size > 1,
}))
jest.mock("../../map/maplibre/ParcelMap", () => ({ ParcelMap: "ParcelMap" }))
jest.mock("../../ui/ScoreRing", () => ({ ScoreRing: "ScoreRing" }))
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
// The theme the card reads, switchable per test (light by default).
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  const themes = {
    light: actual.defaultTheme,
    dark: actual.buildTheme("automatic", "dark", () => {}),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

afterEach(() => {
  mockScheme.current = "light"
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
  test.each([
    ["light", defaultTheme],
    ["dark", buildTheme("automatic", "dark", () => {})],
  ] as const)(
    "overlays take the map control glass and ink in %s (12.2-21 dark pass)",
    (scheme, theme) => {
      mockScheme.current = scheme
      const parcels = [parcel(), parcel({ parcel_id: "p2", latest_ibp_method_version: "3.0" })]
      const { root } = render(parcels, 27)
      const glasses = root.findAllByType("GlassSurface" as never)
      expect(glasses).toHaveLength(2)
      for (const glass of glasses)
        expect(glass.props.surface).toEqual(theme.visual.mapControl.glass)
      const colors = root
        .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
        .map((node) => Object.assign({}, ...[node.props.style].flat(3).filter(Boolean)).color)
      expect(colors).toHaveLength(5)
      const inks = [theme.visual.mapControl.text, theme.visual.mapControl.textMuted]
      for (const color of colors) expect(inks).toContain(color)
      expect(colors).not.toContain(brandColors.forest)
    },
  )

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

  test("the sector badge draws a ring for the rounded mean, hidden from accessibility", () => {
    const { root } = render([parcel()], 31.6)
    const ring = root.findByType("ScoreRing" as never)
    expect(ring.props.score).toBe(32)
    const wrapper = root.findAll(
      (node: ReactTestInstance) =>
        (node.type as unknown) === "View" &&
        node.props.accessibilityElementsHidden === true &&
        node.props.importantForAccessibility === "no-hide-descendants",
    )
    expect(wrapper).toHaveLength(1)
    expect(wrapper[0].findAllByType("ScoreRing" as never)).toHaveLength(1)
  })

  test("the live map has no contour lines over it (D-13)", () => {
    const { root } = render([parcel()], 27)
    expect(root.findAllByType("ContourLines" as never)).toHaveLength(0)
  })

  test("mentions mixed method versions next to the score", () => {
    const { texts } = render(
      [parcel(), parcel({ parcel_id: "p2", latest_ibp_method_version: null })],
      27,
    )
    expect(texts).toContain(fr.home.sector.mixedMethods)
  })

  test("no scored parcel: no score badge", () => {
    const { texts, root } = render([parcel({ latest_ibp_total: null })], null)
    expect(texts).not.toContain(fr.home.sector.label)
    expect(root.findAllByType("ScoreRing" as never)).toHaveLength(0)
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
