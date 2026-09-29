import { memo, useCallback } from "react"
import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { ViewAnnotation } from "@maplibre/maplibre-react-native"
import type { MapCoordinate } from "../../app/map-viewport"
import { fr } from "../../i18n"
import { markerStyles } from "./styles"

export type ClusterMarkerProps = {
  clusterId: number
  coordinate: MapCoordinate
  count: number
  onPress: (clusterId: number) => void
}

function ClusterMarkerBase({ clusterId, coordinate, count, onPress }: ClusterMarkerProps) {
  const handlePress = useCallback(() => onPress(clusterId), [clusterId, onPress])
  return (
    <ViewAnnotation
      id={`cluster-${clusterId}`}
      lngLat={[coordinate.longitude, coordinate.latitude]}
      anchor="center"
      onPress={handlePress}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={fr.publicMap.a11y.cluster(count)}
        style={markerStyles.clusterBubble}
      >
        <Text style={markerStyles.clusterText}>{fr.publicMap.cluster.count(count)}</Text>
      </View>
    </ViewAnnotation>
  )
}

function sameClusterProps(prev: ClusterMarkerProps, next: ClusterMarkerProps): boolean {
  return (
    prev.clusterId === next.clusterId &&
    prev.count === next.count &&
    prev.onPress === next.onPress &&
    prev.coordinate.latitude === next.coordinate.latitude &&
    prev.coordinate.longitude === next.coordinate.longitude
  )
}

/** A group of public surveys (D-05): memoised, and the press reports the cluster id. */
export const ClusterMarker = memo(ClusterMarkerBase, sameClusterProps)
