import renderer, { act } from "react-test-renderer"
import { brandColors, brandMapTokens } from "../../app/brand-tokens"
import type { PublicParcelStatusItem } from "../../app/types"
import { CadastreLayer } from "./CadastreLayer"
import { ParcelPolygonsLayer } from "./ParcelPolygonsLayer"
import { PlacePinLayer } from "./PlacePinLayer"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

afterAll(() => jest.restoreAllMocks())

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
