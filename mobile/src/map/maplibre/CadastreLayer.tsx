import { Layer, RasterSource } from "@maplibre/maplibre-react-native"
import { CADASTRE_TILES } from "./styles"

type CadastreLayerProps = {
  enabled: boolean
  opacity?: number
}

/** The IGN cadastre as a raster layer over the basemap, from zoom 15 (nothing is drawn below). */
export function CadastreLayer({ enabled, opacity = 0.9 }: CadastreLayerProps) {
  if (!enabled) return null
  return (
    <RasterSource
      id="ign-cadastre"
      tiles={[CADASTRE_TILES]}
      tileSize={256}
      minzoom={15}
      maxzoom={20}
      scheme="xyz"
      attribution="Source : IGN"
    >
      <Layer id="ign-cadastre" type="raster" paint={{ "raster-opacity": opacity }} />
    </RasterSource>
  )
}
