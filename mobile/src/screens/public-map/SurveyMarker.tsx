import { memo, useCallback } from "react"
import { View } from "react-native"
import { Marker, type LatLng } from "react-native-maps"
import { bandTone, totalBand } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { markerStyles } from "./styles"

export type SurveyMarkerProps = {
  id: string
  coordinate: LatLng
  ibpTotal: number
  selected: boolean
  onSelect: (id: string) => void
}

function SurveyMarkerBase({ id, coordinate, ibpTotal, selected, onSelect }: SurveyMarkerProps) {
  const handlePress = useCallback(() => onSelect(id), [id, onSelect])
  const tone = bandTone(totalBand(ibpTotal))

  return (
    <Marker
      coordinate={coordinate}
      onPress={handlePress}
      // MAP-03: the pastille never changes once drawn for a given (tone, selected) pair — the
      // parent key already includes `selected` (MapCanvas), so a selection change remounts this
      // marker with a fresh snapshot instead of re-tracking the view every frame.
      tracksViewChanges={false}
      accessibilityLabel={fr.publicMap.a11y.surveyMarker(ibpTotal)}
      zIndex={selected ? 3 : 2}
    >
      <View
        style={[
          markerStyles.scorePastille,
          markerStyles[`scorePastille_${tone}`],
          selected ? markerStyles.scorePastilleSelected : null,
        ]}
      />
    </Marker>
  )
}

/** Equal props, with the coordinate compared by value: the cluster list rebuilds it per region. */
function sameMarkerProps(prev: SurveyMarkerProps, next: SurveyMarkerProps): boolean {
  return (
    prev.id === next.id &&
    prev.ibpTotal === next.ibpTotal &&
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect &&
    prev.coordinate.latitude === next.coordinate.latitude &&
    prev.coordinate.longitude === next.coordinate.longitude
  )
}

/** One public survey on the map (D-05), coloured by its IBP total's score band (MAP-03): memoised,
 * and the press reports the id. */
export const SurveyMarker = memo(SurveyMarkerBase, sameMarkerProps)
