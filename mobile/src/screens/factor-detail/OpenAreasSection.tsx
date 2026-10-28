import { useMemo } from "react"
import { AccessibilityInfo, View } from "react-native"
import { OPEN_AREAS_MAX_COUNT, openAreasExceedSurface, sumOpenAreasHa } from "@cortege/ibp-domain"
import { Ionicons } from "@expo/vector-icons"
import { formatHectares } from "../../app/decimal-text"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { feedback } from "../../ui/feedback"
import { SelectionCircle } from "../../ui/SelectionCircle"
import { ValueSection } from "../../ui/value-rows/ValueSection"
import { createValueRowStyles } from "../../ui/value-rows/value-rows.styles"
import { isNoOpenArea } from "./no-open-area"
import { OpenAreaRow } from "./OpenAreaRow"
import { createOpenAreasStyles } from "./open-areas.styles"
import { useLockedCaption } from "./useLockedCaption"

const t = fr.factorDetail.openAreas
const ADD_GLYPH_SIZE = 24

type OpenAreasSectionProps = {
  /** The zones in hectares, in the observer's order. */
  areas: readonly number[]
  /** The survey's described surface (hectares), above 0. */
  zoneSurfaceHa: number
  /** G's stored percent as the form keeps it: the "no zone" row is derived from it. */
  percentText: string
  onAdd: () => void
  onChangeArea: (index: number, hectares: number) => void
  onRemove: (index: number) => void
  /** `true` records "no zone" (0 %, empty list); `false` puts the empty field back. */
  onMarkNone: (on: boolean) => void
}

/**
 * Follow-up 32-35 (owner decision 2026-10-30): G's page lists the zones of open flowering habitat,
 * each a surface in hectares; the form computes the percent from their sum and the surface décrite
 * (hero card). One grouped list: a row per zone, "Ajouter une zone", then "Aucune zone ..." (derived,
 * locked while a zone exists, as F's "no tree" row is locked while a group is counted). Under it the
 * total against the surface, a quiet warning when the zones exceed it, and a note at the maximum.
 */
export function OpenAreasSection({
  areas,
  zoneSurfaceHa,
  percentText,
  onAdd,
  onChangeArea,
  onRemove,
  onMarkNone,
}: OpenAreasSectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createOpenAreasStyles(theme), [theme])
  const valueStyles = useMemo(() => createValueRowStyles(theme), [theme])
  const { shown, show } = useLockedCaption(t.none.locked)
  const atMax = areas.length >= OPEN_AREAS_MAX_COUNT
  const chosen = isNoOpenArea({ percentText, areas })
  const locked = areas.length > 0

  const add = (): void => {
    feedback.selection()
    AccessibilityInfo.announceForAccessibility(t.announce.added({ index: areas.length + 1 }))
    onAdd()
  }
  const remove = (index: number): void => {
    AccessibilityInfo.announceForAccessibility(t.announce.removed({ index: index + 1 }))
    onRemove(index)
  }
  const pressNone = (): void => {
    if (locked) {
      show()
      return
    }
    feedback.selection()
    onMarkNone(!chosen)
  }

  return (
    <ValueSection
      testID="open-areas-section"
      title={t.header}
      note={
        <>
          <Text style={valueStyles.caption} testID="open-areas-total">
            {t.total({
              total: formatHectares(sumOpenAreasHa(areas)),
              surface: formatHectares(zoneSurfaceHa),
            })}
          </Text>
          {openAreasExceedSurface(areas, zoneSurfaceHa) ? (
            <Text
              style={valueStyles.caption}
              accessibilityLiveRegion="polite"
              testID="open-areas-warning"
            >
              {t.exceeds}
            </Text>
          ) : null}
          {atMax ? (
            <Text style={valueStyles.caption} testID="open-areas-max">
              {t.add.maxReached}
            </Text>
          ) : null}
        </>
      }
    >
      {areas.map((hectares, index) => (
        <OpenAreaRow
          key={index}
          position={index + 1}
          hectares={hectares}
          onChange={(next) => onChangeArea(index, next)}
          onRemove={() => remove(index)}
          styles={styles}
        />
      ))}
      {atMax ? null : (
        <AppPressable
          disableScale
          disableRipple
          onPress={add}
          accessibilityRole="button"
          accessibilityLabel={t.add.label}
          accessibilityHint={t.add.hint}
          style={({ pressed }) => [styles.actionZone, pressed ? styles.zonePressed : null]}
          testID="open-area-add"
        >
          <Ionicons
            name="add-circle-outline"
            size={ADD_GLYPH_SIZE}
            color={theme.semanticColors.ctaPrimary}
          />
          <Text style={styles.actionLabel}>{t.add.label}</Text>
        </AppPressable>
      )}
      <View>
        <AppPressable
          disableScale
          disableRipple
          onPress={pressNone}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: chosen }}
          accessibilityLabel={t.none.label}
          accessibilityHint={locked ? t.none.lockedHint : t.none.hint}
          style={({ pressed }) => [styles.actionZone, pressed ? styles.zonePressed : null]}
          testID="open-area-none"
        >
          <SelectionCircle selected={chosen} />
          <Text style={styles.label}>{t.none.label}</Text>
        </AppPressable>
        {shown ? (
          <Text
            style={styles.locked}
            accessibilityLiveRegion="polite"
            testID="open-area-none-locked"
          >
            {t.none.locked}
          </Text>
        ) : null}
      </View>
    </ValueSection>
  )
}
