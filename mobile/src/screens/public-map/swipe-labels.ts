import { fr } from "../../i18n"
import { BASEMAP_CYCLE, cycleIndex } from "../../map/layer-cycle"
import { layerEntry } from "../../map/layers"
import type { BaseLayerKey } from "../../map/layers"

// The catalogue keys of the bases: the entry of a base layer never names the overlay.
type BaseTextKey = Exclude<ReturnType<typeof layerEntry>["i18nKey"], "forestTypes">

/** The swipe name and era of a base ("Plan", "aujourd'hui"), as the indicator and the announcements say them. */
export function swipeLabel(key: BaseLayerKey): { name: string; era: string } {
  const text = fr.mapLayers.layers[layerEntry(key).i18nKey as BaseTextKey]
  return { name: text.swipeName, era: text.era }
}

/** The "{name}, {era}, fond n sur 5" text of the indicator: its value for a screen reader. */
export function indicatorValue(key: BaseLayerKey): string {
  const { name, era } = swipeLabel(key)
  return fr.mapLayers.basemap.indicatorA11y({
    name,
    era,
    index: cycleIndex(key),
    count: BASEMAP_CYCLE.length,
  })
}
