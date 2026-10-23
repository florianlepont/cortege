import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import type { DmhGroupCode, IbpMethodVersion } from "@cortege/ibp-domain"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { selectionOptionsFor } from "../../app/factor-selections"
import { parseFiniteNumberInput } from "../../app/number-utils"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppField } from "../../ui/AppField"
import { AppText as Text } from "../../ui/AppText"
import { FactorCounterInput } from "../../ui/FactorCounterInput"
import { FromRouteCaption } from "./CountingModeStrip"
import { useRouteSurfacePrefill } from "./useRouteSurfacePrefill"

const t = fr.factorDetail.countingMode

const IGNORE = (): void => undefined

/** A typed count as a whole number of 0 or more; NaN when empty (the form then drops the entry). */
function countFromText(text: string): number {
  const parsed = parseFiniteNumberInput(text)
  return parsed === null ? Number.NaN : Math.max(0, Math.round(parsed))
}

type DmhCountFieldsProps = {
  /** The survey's method, for the labels of the groups. */
  methodVersion: IbpMethodVersion | null
  /** The groups ticked in the chip list above (a row each). */
  selectedGroups: readonly string[]
  /** Whole trees counted per group, as the form holds them. */
  counts: Partial<Record<DmhGroupCode, number>>
  /** F's own surface as typed (hectares). */
  surfaceText: string
  /** The surface décrite of the recorded route (ha): F's surface starts from it. Null: none. */
  zoneSurfaceHa: number | null
  onChangeCount: (code: DmhGroupCode, count: number) => void
  onChangeSurface: (text: string) => void
  editable?: boolean
}

/**
 * Phase 30 (D-07, spec section 7, UI-SPEC section 11): the entry of factor F when the recorded route
 * counts it in full. One counter per ticked dendromicrohabitat group (a group that already holds a
 * count keeps its row, so a counted group is never hidden), the hint on the cap, and F's own surface
 * décrite: prefilled once from the route's zone like C, D and E, editable, captioned "D'après le
 * parcours" while it still equals the zone. The trees per hectare is the package's
 * (`dmhDensityPerHa`, called by the form from these counts and this surface).
 */
export function DmhCountFields({
  methodVersion,
  selectedGroups,
  counts,
  surfaceText,
  zoneSurfaceHa,
  onChangeCount,
  onChangeSurface,
  editable = true,
}: DmhCountFieldsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { fromRoute } = useRouteSurfacePrefill({
    zoneSurfaceHa,
    surfaceText,
    onChangeSurface,
    enabled: editable,
  })
  const rows = useMemo(
    () =>
      selectionOptionsFor("F", methodVersion, selectedGroups).filter(
        (option) =>
          selectedGroups.includes(option.value) || (counts[option.value as DmhGroupCode] ?? 0) > 0,
      ),
    [methodVersion, selectedGroups, counts],
  )

  return (
    <View style={styles.block} testID="dmh-count-fields">
      <Text style={styles.title}>{t.dmhTitle}</Text>
      <Text style={styles.helper}>{t.dmhHelper}</Text>
      <View style={styles.rows} pointerEvents={editable ? "auto" : "none"}>
        {rows.map((option) => {
          const code = option.value as DmhGroupCode
          const count = counts[code]
          return (
            <FactorCounterInput
              key={code}
              label={option.label}
              value={count === undefined ? "" : String(count)}
              onChange={(text) => onChangeCount(code, countFromText(text))}
              touched={false}
              onTouch={IGNORE}
              testID={`dmh-count-${code}`}
            />
          )
        })}
      </View>
      <AppField
        label={t.dmhSurfaceLabel}
        value={surfaceText}
        onChangeText={onChangeSurface}
        keyboardType="decimal-pad"
        editable={editable}
        testID="dmh-surface-field"
      />
      {fromRoute ? <FromRouteCaption /> : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    block: {
      gap: brandSpacing4.sm,
    },
    title: {
      ...brandTypography.label,
      color: theme.colors.textPrimary,
    },
    helper: {
      fontSize: brandTypeScale.subhead.fontSize,
      lineHeight: brandTypeScale.subhead.lineHeight,
      color: theme.colors.textSecondary,
    },
    rows: {
      gap: brandSpacing4.smd,
    },
  })
}
