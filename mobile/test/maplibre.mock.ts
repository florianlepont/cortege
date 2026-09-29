import React from "react"

// Jest cannot render the native MapLibre views. Each component renders a plain host element with
// the same props and children, so a caller's tree (sources, layers, annotations) stays inspectable.
// `Camera` exposes its imperative methods as shared jest.fn()s through `cameraMocks`.
const host = (name: string) =>
  function MapLibreHost(props: Record<string, unknown>) {
    return React.createElement(name, props, props["children"] as React.ReactNode)
  }

export const cameraMocks = {
  fitBounds: jest.fn(),
  jumpTo: jest.fn(),
  easeTo: jest.fn(),
  flyTo: jest.fn(),
  zoomTo: jest.fn(),
}

export const Camera = React.forwardRef(function Camera(
  props: Record<string, unknown>,
  ref: React.Ref<unknown>,
) {
  React.useImperativeHandle(ref, () => cameraMocks)
  return React.createElement("Camera", props)
})

export const Map = host("MapLibreMap")
export const RasterSource = host("RasterSource")
export const GeoJSONSource = host("GeoJSONSource")
export const Layer = host("Layer")
export const ViewAnnotation = host("ViewAnnotation")
export const UserLocation = host("UserLocation")
