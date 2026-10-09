import { useNavigation } from "@react-navigation/native"
import { fr } from "../../i18n"
import { GlassIconButton } from "../public-map/GlassIconButton"

const t = fr.surveyDetail.map
const a11y = fr.surveyDetail.a11y

/** "Voir sur la carte": the Explorer tab, centred on the survey and with it selected (OA-59). */
export function SeeOnMapAction({
  surveyId,
  siteName,
  coordinates,
  parcelIds,
}: {
  surveyId: string
  siteName: string
  coordinates: { lat: number; lng: number }
  parcelIds: string[]
}) {
  const navigation = useNavigation()
  return (
    <GlassIconButton
      variant="map-pill"
      icon="map-outline"
      label={t.seeOnMap}
      accessibilityLabel={a11y.seeOnMap(siteName)}
      onPress={() =>
        navigation.navigate("publicMap", {
          screen: "publicMapHome",
          params: { focus: { surveyId, ...coordinates, parcelIds, nonce: Date.now() } },
        })
      }
    />
  )
}
