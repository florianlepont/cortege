import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"

jest.mock("react-native", () => ({ StyleSheet: { create: <T,>(value: T): T => value } }))
jest.mock("../../hooks/useMapStyle", () => ({
  useMapStyle: () => ({ mapStyle: "plan-style", cadastreInStyle: false }),
}))
jest.mock("../../map/maplibre/CadastreLayer", () => ({ CadastreLayer: "CadastreLayer" }))
jest.mock("../../map/maplibre/ParcelPolygonsLayer", () => ({
  ParcelPolygonsLayer: "ParcelPolygonsLayer",
}))
jest.mock("../../map/maplibre/PlacePinLayer", () => ({ PlacePinLayer: "PlacePinLayer" }))
jest.mock("./ClusterMarker", () => ({ ClusterMarker: "ClusterMarker" }))
jest.mock("./SurveyMarker", () => ({ SurveyMarker: "SurveyMarker" }))
// One cluster and one survey, whatever the region.
jest.mock("./useMapClusters", () => ({
  useMapClusters: () => ({
    clusters: [
      { kind: "cluster", key: "c1", clusterId: 1, count: 3, latitude: 48.4, longitude: 2.69 },
      {
        kind: "item",
        key: "i1",
        item: { survey_id: "s1", ibp_total: 30 },
        latitude: 48.41,
        longitude: 2.7,
      },
    ],
    resolveClusterPress: () => ({ kind: "zoom", zoom: 15 }),
  }),
}))

import type { NativeSyntheticEvent } from "react-native"
import type { ViewStateChangeEvent } from "@maplibre/maplibre-react-native"
import { MapCanvas, type MapCanvasProps } from "./MapCanvas"

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

const onSelectSurvey = jest.fn()
const onSelectParcel = jest.fn()
const onZoomTo = jest.fn()
const onRegionChangeComplete = jest.fn()

function render(props: Partial<MapCanvasProps> = {}): ReactTestRenderer {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <MapCanvas
        cameraRef={React.createRef()}
        items={[]}
        region={{ latitude: 48.4, longitude: 2.69, latitudeDelta: 0.02, longitudeDelta: 0.03 }}
        selectedId={null}
        parcelStatuses={[]}
        parcelLayerRenderable={false}
        studiedParcelsRenderable={false}
        onRegionChangeComplete={onRegionChangeComplete}
        onSelectSurvey={onSelectSurvey}
        onSelectParcel={onSelectParcel}
        onZoomTo={onZoomTo}
        onOpenClusterList={jest.fn()}
        {...props}
      />,
    )
  })
  return tree
}

const mapOf = (tree: ReactTestRenderer) => tree.root.findByType("MapLibreMap" as never)

beforeEach(() => {
  jest.clearAllMocks()
})

describe("MapCanvas (Phase 28 props)", () => {
  test("without the new props the map is exactly as before", () => {
    const tree = render()
    const map = mapOf(tree)
    for (const prop of [
      "dragPan",
      "touchZoom",
      "touchRotate",
      "touchPitch",
      "doubleTapZoom",
      "androidView",
      "onRegionIsChanging",
    ]) {
      expect(map.props[prop]).toBeUndefined()
    }
    expect(tree.root.findAllByType("ClusterMarker" as never)).toHaveLength(1)
    expect(tree.root.findAllByType("SurveyMarker" as never)).toHaveLength(1)
    expect(tree.root.findByType("ParcelPolygonsLayer" as never).props.onParcelPress).toBe(
      onSelectParcel,
    )
  })

  test("frozen turns every gesture off and gives markers, clusters and parcels no press", () => {
    const tree = render({ frozen: true })
    const map = mapOf(tree)
    for (const prop of ["dragPan", "touchZoom", "touchRotate", "touchPitch", "doubleTapZoom"]) {
      expect(map.props[prop]).toBe(false)
    }
    expect(tree.root.findByType("ParcelPolygonsLayer" as never).props.onParcelPress).toBeUndefined()
    const cluster = tree.root.findByType("ClusterMarker" as never)
    const survey = tree.root.findByType("SurveyMarker" as never)
    cluster.props.onPress(1)
    survey.props.onSelect("s1")
    expect(onZoomTo).not.toHaveBeenCalled()
    expect(onSelectSurvey).not.toHaveBeenCalled()
  })

  test("a free map still opens a survey from its marker", () => {
    const tree = render()
    tree.root.findByType("SurveyMarker" as never).props.onSelect("s1")
    expect(onSelectSurvey).toHaveBeenCalledWith("s1")
  })

  test("rotationLocked keeps pan and zoom and turns rotation and pitch off", () => {
    const map = mapOf(render({ rotationLocked: true }))
    expect(map.props.touchRotate).toBe(false)
    expect(map.props.touchPitch).toBe(false)
    expect(map.props.dragPan).toBeUndefined()
    expect(map.props.touchZoom).toBeUndefined()
  })

  test("hideMarkers draws no cluster and no survey marker", () => {
    const tree = render({ hideMarkers: true })
    expect(tree.root.findAllByType("ClusterMarker" as never)).toHaveLength(0)
    expect(tree.root.findAllByType("SurveyMarker" as never)).toHaveLength(0)
    expect(tree.root.findAllByType("ParcelPolygonsLayer" as never)).toHaveLength(1)
  })

  test("androidView goes through to the map", () => {
    expect(mapOf(render({ androidView: "texture" })).props.androidView).toBe("texture")
  })

  test("onViewChange follows the camera while it moves and again when it settles", () => {
    const onViewChange = jest.fn()
    const map = mapOf(render({ onViewChange }))
    expect(map.props.onRegionIsChanging).toBe(onViewChange)
    const event = {
      nativeEvent: {
        center: [2.69, 48.4],
        zoom: 14,
        bearing: 0,
        pitch: 0,
        bounds: [2.68, 48.39, 2.7, 48.41],
        userInteraction: true,
        animated: false,
      },
    } as unknown as NativeSyntheticEvent<ViewStateChangeEvent>
    act(() => map.props.onRegionDidChange(event))
    expect(onViewChange).toHaveBeenCalledWith(event)
    expect(onRegionChangeComplete).toHaveBeenCalledTimes(1)
  })

  test("a settled camera works without an onViewChange handler", () => {
    const map = mapOf(render())
    act(() =>
      map.props.onRegionDidChange({
        nativeEvent: {
          center: [2.69, 48.4],
          bounds: [2.68, 48.39, 2.7, 48.41],
          userInteraction: false,
        },
      }),
    )
    expect(onRegionChangeComplete).toHaveBeenCalledWith(expect.anything(), { isGesture: false })
  })
})
