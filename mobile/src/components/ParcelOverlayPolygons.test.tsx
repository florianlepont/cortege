import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandMapTokens } from "../app/brand-tokens"
import type { PublicParcelStatusItem } from "../app/types"
import { ParcelOverlayPolygons } from "./ParcelOverlayPolygons"

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

jest.mock("react-native-maps", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    __esModule: true,
    Polygon: (props: Record<string, unknown>) => ReactRef.createElement("Polygon", props),
  }
})

const square = (offset: number): number[][] => [
  [2 + offset, 46],
  [2.01 + offset, 46],
  [2.01 + offset, 46.01],
  [2 + offset, 46.01],
  [2 + offset, 46],
]

function item(
  parcelId: string,
  studyStatus: "studied" | "not_studied",
  offset: number,
): PublicParcelStatusItem {
  return {
    parcel_id: parcelId,
    study_status: studyStatus,
    geometry: { type: "Polygon", coordinates: [square(offset)] },
  } as unknown as PublicParcelStatusItem
}

function renderPolygons(items: PublicParcelStatusItem[], selectedParcelIds: string[] = []) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <ParcelOverlayPolygons items={items} selectedParcelIds={selectedParcelIds} />,
    )
  })
  return tree!.root.findAll((n) => (n.type as unknown) === "Polygon")
}

describe("ParcelOverlayPolygons (FLOW-09: sunlight-readable, on-brand colors)", () => {
  test("a selected parcel outranks studied and uses the selected tokens", () => {
    const [polygon] = renderPolygons([item("P1", "studied", 0)], ["P1"])
    expect(polygon.props.strokeColor).toBe(brandMapTokens.parcelSelected)
    expect(polygon.props.fillColor).toBe(brandMapTokens.parcelSelectedFill)
    expect(polygon.props.strokeWidth).toBe(brandMapTokens.strokeWidthSelected)
  })

  test("a studied, unselected parcel uses the studied tokens", () => {
    const [polygon] = renderPolygons([item("P2", "studied", 1)])
    expect(polygon.props.strokeColor).toBe(brandMapTokens.parcelStudied)
    expect(polygon.props.fillColor).toBe(brandMapTokens.parcelStudiedFill)
    expect(polygon.props.strokeWidth).toBe(brandMapTokens.strokeWidthDefault)
  })

  test("a free, unselected parcel uses the neutral tokens", () => {
    const [polygon] = renderPolygons([item("P3", "not_studied", 2)])
    expect(polygon.props.strokeColor).toBe(brandMapTokens.parcelNeutral)
    expect(polygon.props.fillColor).toBe(brandMapTokens.parcelNeutralFill)
  })
})
