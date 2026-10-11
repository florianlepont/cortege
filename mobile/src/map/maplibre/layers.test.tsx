const mockOffline = { value: false }
jest.mock("../../hooks/useIsOffline", () => ({ useIsOffline: () => mockOffline.value }))

import renderer, { act } from "react-test-renderer"
import { brandColors, brandMapTokens } from "../../app/brand-tokens"
import type { PublicParcelStatusItem } from "../../app/types"
import { FOREST_TYPES_OPACITY } from "../layer-styles"
import { CADASTRE_SOURCE_ID } from "../offline-styles"
import { CADASTRE_LAYER_ID, CadastreLayer } from "./CadastreLayer"
import { ForestTypesLayer } from "./ForestTypesLayer"
import { ParcelPolygonsLayer } from "./ParcelPolygonsLayer"
import { PlacePinLayer } from "./PlacePinLayer"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

afterAll(() => jest.restoreAllMocks())

beforeEach(() => {
  mockOffline.value = false
})

function mount(element: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  return tree
}

const RING = [
  [4.8, 45.7],
  [4.9, 45.7],
  [4.9, 45.8],
  [4.8, 45.7],
]

function items(): PublicParcelStatusItem[] {
  return [
    {
      parcel_id: "P1",
      study_status: "studied",
      geometry: { type: "Polygon", coordinates: [RING] },
    } as unknown as PublicParcelStatusItem,
  ]
}

describe("CadastreLayer", () => {
  test("draws nothing while disabled", () => {
    expect(mount(<CadastreLayer enabled={false} />).toJSON()).toBeNull()
  })

  test("is a raster source with a raster layer from zoom 15 when enabled", () => {
    const tree = mount(<CadastreLayer enabled opacity={0.5} />)
    const source = tree.root.findByType("RasterSource" as never)
    expect(source.props.minzoom).toBe(15)
    expect(source.props.scheme).toBe("xyz")
    expect(source.props.tiles[0]).toContain("CADASTRALPARCELS.PARCELS")
    const layer = tree.root.findByType("Layer" as never)
    expect(layer.props.paint).toEqual({ "raster-opacity": 0.5 })
  })

  test("the default opacity is 0.9", () => {
    const tree = mount(<CadastreLayer enabled />)
    expect(tree.root.findByType("Layer" as never).props.paint).toEqual({ "raster-opacity": 0.9 })
  })
})

describe("ParcelPolygonsLayer", () => {
  test("is one GeoJSON source with a fill and an outline layer reading the feature colours", () => {
    const tree = mount(<ParcelPolygonsLayer items={items()} />)
    const source = tree.root.findByType("GeoJSONSource" as never)
    expect(source.props.data.features).toHaveLength(1)
    expect(source.props.onPress).toBeUndefined()
    const layers = tree.root.findAllByType("Layer" as never)
    expect(layers.map((layer) => layer.props.type)).toEqual(["fill", "line"])
    expect(layers[0].props.paint["fill-color"]).toEqual(["get", "fill"])
    expect(layers[1].props.paint["line-color"]).toEqual(["get", "stroke"])
  })

  test("a press reports the parcel id of the first pressed feature", () => {
    const onParcelPress = jest.fn()
    const tree = mount(<ParcelPolygonsLayer items={items()} onParcelPress={onParcelPress} />)
    const source = tree.root.findByType("GeoJSONSource" as never)
    source.props.onPress({ nativeEvent: { features: [{ properties: { parcel_id: "P1" } }] } })
    expect(onParcelPress).toHaveBeenCalledWith("P1")
  })

  test("a press with no usable feature reports nothing", () => {
    const onParcelPress = jest.fn()
    const tree = mount(<ParcelPolygonsLayer items={items()} onParcelPress={onParcelPress} />)
    const source = tree.root.findByType("GeoJSONSource" as never)
    source.props.onPress({ nativeEvent: { features: [] } })
    source.props.onPress({ nativeEvent: { features: [{ properties: { parcel_id: 7 } }] } })
    expect(onParcelPress).not.toHaveBeenCalled()
  })
})

describe("ParcelPolygonsLayer, Parcelles states and legibility (Phase 28)", () => {
  const WITH_SURVEY = ["any", ["==", ["get", "hasSurvey"], true], ["==", ["get", "selected"], true]]
  const SELECTED_ONLY = ["==", ["get", "selected"], true]

  test("default props: today's two layers, no filter, no fill-opacity", () => {
    const tree = mount(<ParcelPolygonsLayer items={items()} />)
    const layers = tree.root.findAllByType("Layer" as never)
    expect(layers.map((layer) => layer.props.id)).toEqual(["parcels-fill", "parcels-outline"])
    for (const layer of layers) expect(layer.props.filter).toBeUndefined()
    expect(layers[0].props.paint).toEqual({ "fill-color": ["get", "fill"] })
  })

  test("Avec IBP: the same filter on the casing, the fill and the outline", () => {
    const tree = mount(<ParcelPolygonsLayer items={items()} mode="withIbp" casing />)
    const layers = tree.root.findAllByType("Layer" as never)
    expect(layers).toHaveLength(3)
    for (const layer of layers) expect(layer.props.filter).toEqual(WITH_SURVEY)
  })

  test("Aucune: only the focused parcel passes the filter and no press is wired", () => {
    const onParcelPress = jest.fn()
    const tree = mount(
      <ParcelPolygonsLayer items={items()} mode="none" onParcelPress={onParcelPress} />,
    )
    for (const layer of tree.root.findAllByType("Layer" as never)) {
      expect(layer.props.filter).toEqual(SELECTED_ONLY)
    }
    expect(tree.root.findByType("GeoJSONSource" as never).props.onPress).toBeUndefined()
  })

  test("Avec IBP keeps the press", () => {
    const tree = mount(
      <ParcelPolygonsLayer items={items()} mode="withIbp" onParcelPress={jest.fn()} />,
    )
    expect(tree.root.findByType("GeoJSONSource" as never).props.onPress).toEqual(
      expect.any(Function),
    )
  })

  test("the casing is the first line layer, white and two points wider than the outline", () => {
    const tree = mount(<ParcelPolygonsLayer items={items()} casing casingOpacity={0.6} />)
    const layers = tree.root.findAllByType("Layer" as never)
    expect(layers.map((layer) => layer.props.id)).toEqual([
      "parcels-casing",
      "parcels-fill",
      "parcels-outline",
    ])
    expect(layers[0].props.type).toBe("line")
    expect(layers[0].props.paint).toEqual({
      "line-color": brandMapTokens.parcelCasing,
      "line-width": ["+", ["get", "strokeWidth"], 2],
      "line-opacity": 0.6,
    })
  })

  test("the casing opacity defaults to 1", () => {
    const tree = mount(<ParcelPolygonsLayer items={items()} casing />)
    expect(tree.root.findAllByType("Layer" as never)[0].props.paint["line-opacity"]).toBe(1)
  })

  test("a fill opacity below 1 lightens the fill", () => {
    const tree = mount(<ParcelPolygonsLayer items={items()} fillOpacity={0.6} />)
    expect(tree.root.findAllByType("Layer" as never)[0].props.paint).toEqual({
      "fill-color": ["get", "fill"],
      "fill-opacity": 0.6,
    })
  })

  test("the survey parcel ids reach the features", () => {
    const tree = mount(
      <ParcelPolygonsLayer
        items={[{ ...items()[0], study_status: "not_studied" } as PublicParcelStatusItem]}
        surveyParcelIds={new Set(["P1"])}
      />,
    )
    const source = tree.root.findByType("GeoJSONSource" as never)
    expect(source.props.data.features[0].properties.hasSurvey).toBe(true)
  })
})

describe("ForestTypesLayer", () => {
  test("draws nothing while disabled", () => {
    expect(mount(<ForestTypesLayer enabled={false} />).toJSON()).toBeNull()
  })

  test("is one raster source of the catalogue tiles with one translucent raster layer", () => {
    const tree = mount(<ForestTypesLayer enabled />)
    const source = tree.root.findByType("RasterSource" as never)
    expect(source.props.id).toBe("types-foret")
    expect(source.props.tileSize).toBe(256)
    expect(source.props.maxzoom).toBe(16)
    expect(source.props.scheme).toBe("xyz")
    expect(source.props.tiles[0]).toContain("LANDCOVER.FORESTINVENTORY.V2")
    const layer = tree.root.findByType("Layer" as never)
    expect(layer.props.type).toBe("raster")
    expect(layer.props.paint).toEqual({ "raster-opacity": 0.55 })
    expect(FOREST_TYPES_OPACITY).toBe(0.55)
    expect(layer.props.beforeId).toBeUndefined()
  })

  test("sits under the cadastre layer when the style already carries it", () => {
    const tree = mount(<ForestTypesLayer enabled belowCadastre />)
    expect(tree.root.findByType("Layer" as never).props.beforeId).toBe("ign-cadastre")
    expect(CADASTRE_LAYER_ID).toBe(CADASTRE_SOURCE_ID)
  })

  test("offline it asks for the offline zoom caps", () => {
    mockOffline.value = true
    const tree = mount(<ForestTypesLayer enabled />)
    expect(tree.root.findByType("RasterSource" as never).props.maxzoom).toBe(16)
  })
})

describe("PlacePinLayer", () => {
  test("draws nothing without a pin", () => {
    expect(mount(<PlacePinLayer pin={null} />).toJSON()).toBeNull()
  })

  test("is one Point source with a terracotta circle and a white ring", () => {
    const tree = mount(<PlacePinLayer pin={{ lat: 45.7, lng: 4.8 }} />)
    const source = tree.root.findByType("GeoJSONSource" as never)
    expect(source.props.id).toBe("search-place")
    expect(source.props.data.features).toEqual([
      { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [4.8, 45.7] } },
    ])
    const layer = tree.root.findByType("Layer" as never)
    expect(layer.props.type).toBe("circle")
    expect(layer.props.paint).toEqual({
      "circle-radius": 8,
      "circle-color": brandMapTokens.parcelSelected,
      "circle-stroke-color": brandColors.white,
      "circle-stroke-width": 2,
    })
  })
})
