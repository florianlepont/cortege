import { memo, useEffect, useRef, useState } from "react"
import { AccessibilityInfo, Platform, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, { FadeIn, LinearTransition, ReduceMotion } from "react-native-reanimated"
import type { DmhGroupCode } from "@cortege/ibp-domain"
import { brandMotion } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { DmhCounterStepper } from "../../ui/DmhCounterStepper"
import { feedback } from "../../ui/feedback"
import { SelectionCircle } from "../../ui/SelectionCircle"
import type { DmhListStyles } from "./dmh-group-list.styles"

const t = fr.factorDetail.dmhList

/** How long the "bring the count back to 0" caption stays under a locked row (O-32-3). */
const LOCKED_CAPTION_MS = 4000
export const DMH_INFO_GLYPH_SIZE = 22

export type DmhGroupRowProps = {
  code: DmhGroupCode
  label: string
  ticked: boolean
  /** Whole trees counted for the group; undefined when none is stored. */
  count: number | undefined
  /** Counting (D-10): the "+" and the stepper exist; false: the tick alone. */
  full: boolean
  /**
   * Capped survey mode (follow-up of phase 32): the count is trees per hectare and a group holds at
   * most this many (the package's 2). Absent: counted in full, whole trees with no bound but 999.
   */
  maxCount?: number
  editable: boolean
  onToggle: (code: DmhGroupCode, next: boolean) => void
  onAdd: (code: DmhGroupCode) => void
  onStep: (code: DmhGroupCode, next: number) => void
  onSubmitText: (code: DmhGroupCode, text: string) => void
  onOpenInfo: (code: DmhGroupCode) => void
  styles: DmhListStyles
}

const entering = () => FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)

/**
 * One group of the F list (32-UI-SPEC S1.3, redesign 32-18 A-I2). Line 1 is the check zone (a
 * leading circle and the label, the whole zone shows a soft fill while pressed), the 44 pt info
 * button (a 32 pt filled disc holding the glyph, 32-22) and, unticked in counting mode, the add button; line 2 (ticked or counted, counting mode) is the
 * "Arbres" caption ("Arbres par hectare" in the capped mode, where the stepper stops at 2) and the stepper. Memoised on its own props, so one stepper tap
 * re-renders this row only (research pitfall 8). A counted group cannot be unticked until its count
 * is back to 0 (O-32-3): the tap shows a caption and changes nothing, no tap deletes data.
 */
export const DmhGroupRow = memo(function DmhGroupRow({
  code,
  label,
  ticked,
  count,
  full,
  maxCount,
  editable,
  onToggle,
  onAdd,
  onStep,
  onSubmitText,
  onOpenInfo,
  styles,
}: DmhGroupRowProps) {
  const theme = useBrandTheme()
  const [lockedShown, setLockedShown] = useState(false)
  const lockedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (lockedTimer.current !== null) clearTimeout(lockedTimer.current)
    },
    [],
  )

  const counted = (count ?? 0) > 0
  const locked = full && ticked && counted
  const showAdd = full && editable && !ticked && !counted
  const showStepper = full && (ticked || counted)

  const onPressCheck = (): void => {
    if (!ticked) {
      onToggle(code, true)
      feedback.selection()
      return
    }
    if (locked) {
      if (lockedTimer.current !== null) clearTimeout(lockedTimer.current)
      setLockedShown(true)
      lockedTimer.current = setTimeout(() => {
        lockedTimer.current = null
        setLockedShown(false)
      }, LOCKED_CAPTION_MS)
      if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(t.lockedUntick)
      return
    }
    onToggle(code, false)
    feedback.selection()
  }

  const onPressAdd = (): void => {
    onAdd(code)
    feedback.selection()
  }

  const withCount = maxCount === undefined ? t.a11y.withCount : t.a11y.withCountPerHa
  const checkLabel = full && counted ? withCount({ label, trees: count ?? 0 }) : label

  return (
    <Animated.View
      style={styles.row}
      layout={LinearTransition.reduceMotion(ReduceMotion.System)}
      testID={`dmh-row-${code}`}
    >
      <View style={styles.line1}>
        <AppPressable
          disableScale
          disableRipple
          onPress={onPressCheck}
          disabled={!editable}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ticked, disabled: !editable }}
          accessibilityLabel={checkLabel}
          accessibilityHint={locked ? t.a11y.tickLockedHint : t.a11y.tickHint}
          style={({ pressed }) => [
            styles.checkZone,
            pressed && editable ? styles.checkZonePressed : null,
          ]}
          testID={`dmh-tick-${code}`}
        >
          <SelectionCircle selected={ticked} />
          <Text style={styles.label}>{label}</Text>
        </AppPressable>
        <AppPressable
          disableScale
          disableRipple
          onPress={() => onOpenInfo(code)}
          accessibilityRole="button"
          accessibilityLabel={t.a11y.info({ label })}
          accessibilityHint={t.a11y.infoHint}
          style={styles.infoButton}
          testID={`dmh-info-${code}`}
        >
          <View style={styles.infoDisc}>
            <Ionicons
              name="information-circle-outline"
              size={DMH_INFO_GLYPH_SIZE}
              color={theme.visual.accentText}
            />
          </View>
        </AppPressable>
        {showAdd ? (
          <AppPressable
            disableScale
            disableRipple
            onPress={onPressAdd}
            accessibilityRole="button"
            accessibilityLabel={t.a11y.add({ label })}
            accessibilityHint={t.a11y.addHint}
            style={styles.addButton}
            testID={`dmh-add-${code}`}
          >
            <View style={styles.addDisc}>
              <Ionicons name="add-outline" size={20} color={theme.semanticColors.ctaPrimary} />
            </View>
          </AppPressable>
        ) : null}
      </View>
      {showStepper ? (
        <Animated.View entering={entering()} style={styles.line2}>
          <Text style={styles.caption}>
            {maxCount === undefined ? t.treesCaption : t.treesCaptionPerHa}
          </Text>
          <DmhCounterStepper
            label={label}
            value={count ?? 0}
            onStep={(next) => onStep(code, next)}
            onSubmitText={(text) => onSubmitText(code, text)}
            editable={editable}
            max={maxCount}
            testID={`dmh-stepper-${code}`}
          />
        </Animated.View>
      ) : null}
      {lockedShown ? (
        <Animated.View entering={entering()}>
          <Text
            style={styles.locked}
            accessibilityLiveRegion="polite"
            testID={`dmh-locked-${code}`}
          >
            {t.lockedUntick}
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  )
})
