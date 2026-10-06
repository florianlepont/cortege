import { memo, useCallback } from "react"
import { View } from "react-native"
import { ViewAnnotation } from "@maplibre/maplibre-react-native"
import type { MapCoordinate } from "../../app/map-viewport"
import { bandTone, totalBand } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { markerStyles } from "./styles"

export type SurveyMarkerProps = {
  id: string
  coordinate: MapCoordinate
  ibpTotal: number
  selected: boolean
  /** An unfinished survey of the author: drawn dashed and white instead of a score colour. */
  draft?: boolean
  onSelect: (id: string) => void
}

function SurveyMarkerBase({
  id,
  coordinate,
  ibpTotal,
  selected,
  draft = false,
  onSelect,
}: SurveyMarkerProps) {
  const handlePress = useCallback(() => onSelect(id), [id, onSelect])
  const tone = bandTone(totalBand(ibpTotal))

  return (
    <ViewAnnotation
      id={`survey-${id}`}
      lngLat={[coordinate.longitude, coordinate.latitude]}
      anchor="center"
      selected={selected}
      onPress={handlePress}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          draft ? fr.publicMap.a11y.draftMarker(ibpTotal) : fr.publicMap.a11y.surveyMarker(ibpTotal)
        }
        style={[
          markerStyles.scorePastille,
          draft ? markerStyles.scorePastilleDraft : markerStyles[`scorePastille_${tone}`],
          selected ? markerStyles.scorePastilleSelected : null,
        ]}
      />
    </ViewAnnotation>
  )
}

/** Equal props, with the coordinate compared by value: the cluster list rebuilds it per region. */
function sameMarkerProps(prev: SurveyMarkerProps, next: SurveyMarkerProps): boolean {
  return (
    prev.id === next.id &&
    prev.ibpTotal === next.ibpTotal &&
    prev.selected === next.selected &&
    prev.draft === next.draft &&
    prev.onSelect === next.onSelect &&
    prev.coordinate.latitude === next.coordinate.latitude &&
    prev.coordinate.longitude === next.coordinate.longitude
  )
}

/** One public survey on the map (D-05), coloured by its IBP total's score band (MAP-03): memoised,
 * and the press reports the id. */
export const SurveyMarker = memo(SurveyMarkerBase, sameMarkerProps)
