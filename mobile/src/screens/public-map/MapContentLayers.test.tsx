jest.mock("../../map/maplibre/CadastreLayer", () => ({ CadastreLayer: "CadastreLayer" }))
jest.mock("../../map/maplibre/ForestTypesLayer", () => ({ ForestTypesLayer: "ForestTypesLayer" }))
jest.mock("../../map/maplibre/ParcelPolygonsLayer", () => ({
  ParcelPolygonsLayer: "ParcelPolygonsLayer",
}))

import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { brandMapTokens } from "../../app/brand-tokens"
import type { PublicParcelStatusItem } from "../../app/types"
import { MapContentLayers, shownParcelsFor, type MapContentLayersProps } from "./MapContentLayers"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})
afterAll(() => jest.restoreAllMocks())

function parcel(id: string, study_status: "studied" | "not_studied"): PublicParcelStatusItem {
  return { parcel_id: id, study_status } as unknown as PublicParcelStatusItem
}
const STUDIED = parcel("A", "studied")
const FREE = parcel("B", "not_studied")
const PARCELS = [STUDIED, FREE]

describe("shownParcelsFor", () => {
  test("from zoom 15 every parcel of the view", () => {
    expect(shownParcelsFor(PARCELS, true, false)).toBe(PARCELS)
    expect(shownParcelsFor(PARCELS, true, true)).toBe(PARCELS)
  })

  test("between zoom 12 and 15 the studied parcels only", () => {
    expect(shownParcelsFor(PARCELS, false, true)).toEqual([STUDIED])
  })

  test("below zoom 12 none", () => {
    expect(shownParcelsFor(PARCELS, false, false)).toEqual([])
  })
})

const onParcelPress = jest.fn()

function render(props: Partial<MapContentLayersProps> = {}): ReactTestRenderer {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <MapContentLayers
        base="map"
        forestOverlay={false}
        parcelsMode="all"
        cadastreEnabled
        cadastreInStyle={false}
        cadastreOpacity={0.9}
        parcels={PARCELS}
        interactive
        onParcelPress={onParcelPress}
        {...props}
      />,
    )
  })
  return tree
}

const cadastre = (tree: ReactTestRenderer) => tree.root.findByType("CadastreLayer" as never)
const parcels = (tree: ReactTestRenderer) => tree.root.findByType("ParcelPolygonsLayer" as never)
const forest = (tree: ReactTestRenderer) => tree.root.findByType("ForestTypesLayer" as never)

beforeEach(() => jest.clearAllMocks())

describe("MapContentLayers", () => {
  test("draws in z-order the forest overlay, the cadastre, then the parcels", () => {
    const tree = render()
    const kinds = (tree.toJSON() as { type: string }[]).map((node) => node.type)
    expect(kinds).toEqual(["ForestTypesLayer", "CadastreLayer", "ParcelPolygonsLayer"])
  })

  test("Plan, no overlay, Toutes: today's rendering (no casing, full fill)", () => {
    const tree = render()
    expect(forest(tree).props.enabled).toBe(false)
    expect(cadastre(tree).props).toMatchObject({ enabled: true, opacity: 0.9 })
    expect(parcels(tree).props).toMatchObject({
      mode: "all",
      casing: false,
      casingOpacity: 1,
      fillOpacity: 1,
      byScore: true,
      items: PARCELS,
    })
  })

  test("the forest overlay goes under the cadastre only when the style carries it", () => {
    expect(forest(render({ forestOverlay: true })).props).toMatchObject({
      enabled: true,
      belowCadastre: false,
    })
    expect(forest(render({ forestOverlay: true, cadastreInStyle: true })).props.belowCadastre).toBe(
      true,
    )
  })

  test("the cadastre is drawn only from zoom 15, for Toutes, and not twice", () => {
    expect(cadastre(render({ cadastreEnabled: false })).props.enabled).toBe(false)
    expect(cadastre(render({ parcelsMode: "withIbp" })).props.enabled).toBe(false)
    expect(cadastre(render({ parcelsMode: "none" })).props.enabled).toBe(false)
    expect(cadastre(render({ cadastreInStyle: true })).props.enabled).toBe(false)
  })

  test("the cadastre opacity is the one given (0.7 on the old maps)", () => {
    expect(cadastre(render({ base: "etat-major", cadastreOpacity: 0.7 })).props.opacity).toBe(0.7)
  })

  test.each(["etat-major", "carte-1950", "photos-1950"] as const)(
    "%s: the fill is lightened and the casing drawn at the old-base factor",
    (base) => {
      const props = parcels(render({ base })).props
      expect(props.fillOpacity).toBe(brandMapTokens.parcelFillOldBaseFactor)
      expect(props.casingOpacity).toBe(brandMapTokens.parcelFillOldBaseFactor)
      expect(props.casing).toBe(true)
    },
  )

  test("satellite with the overlay: casing at full strength, fill unchanged", () => {
    const props = parcels(render({ base: "satellite", forestOverlay: true })).props
    expect(props).toMatchObject({ casing: true, casingOpacity: 1, fillOpacity: 1 })
  })

  test("the Parcelles mode, the own survey parcels and the selection reach the parcel layer", () => {
    const surveyParcelIds = new Set(["A"])
    const props = parcels(
      render({ parcelsMode: "withIbp", surveyParcelIds, selectedParcelIds: ["B"] }),
    ).props
    expect(props.mode).toBe("withIbp")
    expect(props.surveyParcelIds).toBe(surveyParcelIds)
    expect(props.selectedParcelIds).toEqual(["B"])
  })

  test("the press handler reaches the parcels only when interactive", () => {
    expect(parcels(render()).props.onParcelPress).toBe(onParcelPress)
    expect(parcels(render({ interactive: false })).props.onParcelPress).toBeUndefined()
  })
})
