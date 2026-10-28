import { memo } from "react"
import { View } from "react-native"
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated"
import { brandMotion } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { feedback } from "../../ui/feedback"
import { SelectionCircle } from "../../ui/SelectionCircle"
import type { DmhListStyles } from "./dmh-group-list.styles"
import { useLockedCaption } from "./useLockedCaption"

const t = fr.factorDetail.dmhList.none

type DmhNoneRowProps = {
  /** Derived by the list (see `isNoDmhGroup`), not stored. */
  chosen: boolean
  /** A group count is above 0: the row is locked, as a counted group is against unticking. */
  locked: boolean
  editable: boolean
  /** `next` true records "no group" (clearing the groups); false puts the empty field back. */
  onChange: (next: boolean) => void
  styles: DmhListStyles
}

/**
 * Follow-up 32-25: the one row above the sections of the F list that says "no tree carries a
 * dendromicrohabitat". Without it a stand with none could not record 0, since the trees per
 * hectare is only ever the groups' figure. It looks like a group row (circle and label, same
 * height) without the info button or the counter. While a group is counted the row is locked like
 * a counted group: the press shows a caption and changes nothing, so no tap deletes counts.
 */
export const DmhNoneRow = memo(function DmhNoneRow({
  chosen,
  locked,
  editable,
  onChange,
  styles,
}: DmhNoneRowProps) {
  const { shown, show } = useLockedCaption(t.locked)

  const onPress = (): void => {
    if (locked) {
      show()
      return
    }
    onChange(!chosen)
    feedback.selection()
  }

  return (
    <View style={styles.row}>
      <View style={styles.line1}>
        <AppPressable
          disableScale
          disableRipple
          onPress={onPress}
          disabled={!editable}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: chosen, disabled: !editable }}
          accessibilityLabel={t.label}
          accessibilityHint={locked ? t.lockedHint : t.hint}
          style={({ pressed }) => [
            styles.checkZone,
            pressed && editable ? styles.checkZonePressed : null,
          ]}
          testID="dmh-none-row"
        >
          <SelectionCircle selected={chosen} />
          <Text style={styles.label}>{t.label}</Text>
        </AppPressable>
      </View>
      {shown ? (
        <Animated.View
          entering={FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
        >
          <Text style={styles.locked} accessibilityLiveRegion="polite" testID="dmh-none-locked">
            {t.locked}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  )
})
