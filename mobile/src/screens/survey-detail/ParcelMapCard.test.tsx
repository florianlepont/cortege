import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandRadius } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { ParcelMapCard } from "./ParcelMapCard"

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
    View: mockComponent("View"),
    Pressable: mockComponent("Pressable"),
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    },
  }
})
jest.mock("../../hooks/useParcelStatuses", () => ({
  useParcelStatuses: () => ({ items: [] }),
}))
jest.mock("../../map/maplibre/ParcelMap", () => ({ ParcelMap: "ParcelMap" }))
jest.mock("../../ui/ContourLines", () => ({ ContourLines: "ContourLines" }))
jest.mock("../public-map/MapChips", () => ({
  MapInfoPill: "MapInfoPill",
  MapOverlayCorners: "MapOverlayCorners",
}))
jest.mock("./SeeOnMapAction", () => ({ SeeOnMapAction: "SeeOnMapAction" }))
jest.mock("../survey-screen-helpers", () => ({
  resolveDisplayCoordinates: (location: { lat: number; lng: number } | undefined) =>
    location ?? null,
}))

const baseProps = {
  apiUrl: "http://api",
  accessToken: null,
  siteName: "Parcelle A",
  displayLocation: undefined,
  parcelIds: ["p1"],
}

function render(props: Partial<React.ComponentProps<typeof ParcelMapCard>> = {}) {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<ParcelMapCard {...baseProps} {...props} />)
  })
  return tree!
}

const childTypes = (card: ReactTestInstance): string[] =>
  card.children.map((child) => String((child as ReactTestInstance).type))

type Style = Record<string, unknown>
function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

describe("ParcelMapCard", () => {
  test("draws the static contours first, so the live map paints over them", () => {
    const tree = render({ onPress: jest.fn() })
    const card = tree.root.findAll((n) => (n.type as unknown) === "Pressable")[0]
    expect(childTypes(card)).toEqual(["ContourLines", "ParcelMap", "MapOverlayCorners"])
    const contours = tree.root.findByType("ContourLines" as never)
    expect(contours.props.animated).toBe(false)
  })

  test("the card clips to its radius and carries the glass look", () => {
    const tree = render({ onPress: jest.fn() })
    const card = tree.root.findAll((n) => (n.type as unknown) === "Pressable")[0]
    expect(flatten(card.props.style)).toMatchObject({
      overflow: "hidden",
      borderRadius: brandRadius.card,
      backgroundColor: defaultTheme.visual.glass.cardFill,
      borderColor: defaultTheme.visual.glass.cardBorder,
    })
  })

  test("the pressable card keeps its button role and label", () => {
    const card = render({ onPress: jest.fn() }).root.findAll(
      (n) => (n.type as unknown) === "Pressable",
    )[0]
    expect(card.props.accessibilityRole).toBe("button")
    expect(card.props.accessibilityLabel).toBe(fr.surveyDetail.a11y.editParcels("Parcelle A"))
  })

  test("the plain card keeps its image role and label, contours first too", () => {
    const tree = render()
    const card = tree.root.findAll((n) => (n.type as unknown) === "View" && n.props.accessible)[0]
    expect(card.props.accessibilityRole).toBe("image")
    expect(card.props.accessibilityLabel).toBe(fr.surveyDetail.a11y.mapPreview("Parcelle A"))
    expect(childTypes(card)).toEqual(["ContourLines", "ParcelMap", "MapOverlayCorners"])
  })
})
