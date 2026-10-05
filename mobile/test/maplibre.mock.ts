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

// Native offline packs: an in-memory manager. Tests drive a pack's progress through `offlineMocks`.
type MockPack = { id: string; metadata: Record<string, unknown>; bounds: number[] }
type ProgressListener = (pack: MockPack, status: Record<string, unknown>) => void
type ErrorListener = (pack: MockPack, error: { id: string; message: string }) => void

export const offlineMocks = {
  packs: [] as MockPack[],
  listeners: new globalThis.Map<string, { progress: ProgressListener; error: ErrorListener }>(),
  reset() {
    offlineMocks.packs = []
    offlineMocks.listeners = new globalThis.Map()
    OfflineManager.createPack.mockClear()
    OfflineManager.deletePack.mockClear()
  },
}

export const OfflineManager = {
  createPack: jest.fn(
    async (
      options: { bounds: number[]; metadata?: Record<string, unknown> },
      progress: ProgressListener,
      error: ErrorListener,
    ) => {
      const pack: MockPack = {
        id: `pack-${offlineMocks.packs.length + 1}`,
        metadata: options.metadata ?? {},
        bounds: options.bounds,
      }
      offlineMocks.packs.push(pack)
      offlineMocks.listeners.set(pack.id, { progress, error })
      return pack
    },
  ),
  getPacks: jest.fn(async () => offlineMocks.packs),
  deletePack: jest.fn(async (id: string) => {
    offlineMocks.packs = offlineMocks.packs.filter((pack) => pack.id !== id)
  }),
}
