import { useMemo, useRef } from "react"
import { StyleSheet, TextInput, View } from "react-native"
import type { BStratumCode, IbpMethodVersion } from "@cortege/ibp-domain"
import {
  brandComponentTokens,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { selectionOptionsFor } from "../../app/factor-selections"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"

const t = fr.factorDetail.countingMode

/** UI-SPEC section 11: a percent field is 88 wide and at least 48 high. */
export const COVER_FIELD_WIDTH = 88
export const COVER_FIELD_MIN_HEIGHT = 48

/**
 * What a cover field keeps of what is typed (T-30-41): digits and one decimal separator, a value
 * above 100 is brought back to 100. The form keeps the text as typed, so the cursor never jumps.
 */
export function clampCoverText(text: string): string {
  const kept = text.replace(/[^0-9.,]/g, "")
  const separator = kept.search(/[.,]/)
  const cleaned =
    separator === -1
      ? kept
      : `${kept.slice(0, separator + 1)}${kept.slice(separator + 1).replace(/[.,]/g, "")}`
  const value = Number(cleaned.replace(",", "."))
  return Number.isFinite(value) && value > 100 ? "100" : cleaned
}

type StrataCoverFieldsProps = {
  /** The survey's method: the strata are listed in the order and with the labels of B's options. */
  methodVersion: IbpMethodVersion | null
  /** Cover per stratum as typed (percent). */
  coverText: Partial<Record<BStratumCode, string>>
  /** The strata count the form derived from the covers through the package, "" when none. */
  strataCountText: string
  onChange: (code: BStratumCode, text: string) => void
  editable?: boolean
}

/**
 * Phase 30 (D-07, spec section 7, UI-SPEC section 11): the entry of factor B when the recorded
 * route counts it in full. Five rows, one per stratum, each a percent field from 0 to 100; the
 * helper states the 20 % rule. The count is the package's (`strataCountFromCover`, called by the
 * form): this block only types and shows it.
 */
export function StrataCoverFields({
  methodVersion,
  coverText,
  strataCountText,
  onChange,
  editable = true,
}: StrataCoverFieldsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const options = useMemo(() => selectionOptionsFor("B", methodVersion, null), [methodVersion])
  const inputs = useRef<(TextInput | null)[]>([])
  const anyCover = Object.values(coverText).some((text) => (text ?? "").trim().length > 0)
  const count = Number.parseInt(strataCountText, 10)
  const lastIndex = options.length - 1

  return (
    <View style={styles.block} testID="strata-cover-fields">
      <Text style={styles.title}>{t.strataTitle}</Text>
      <Text style={styles.helper}>{t.strataHelper}</Text>
      <View style={styles.rows}>
        {options.map((option, index) => {
          const code = option.value as BStratumCode
          return (
            <View key={code} style={styles.row}>
              <Text style={styles.rowLabel}>{option.label}</Text>
              <View style={styles.field}>
                <TextInput
                  ref={(node) => {
                    inputs.current[index] = node
                  }}
                  value={coverText[code] ?? ""}
                  onChangeText={(text) => onChange(code, clampCoverText(text))}
                  keyboardType="decimal-pad"
                  returnKeyType={index < lastIndex ? "next" : "done"}
                  submitBehavior={index < lastIndex ? "submit" : "blurAndSubmit"}
                  onSubmitEditing={() => inputs.current[index + 1]?.focus()}
                  editable={editable}
                  placeholder={t.strataCoverPlaceholder}
                  placeholderTextColor={theme.colors.textSecondary}
                  accessibilityLabel={t.strataFieldA11y({ label: option.label })}
                  style={styles.input}
                  testID={`strata-cover-${index}`}
                />
                <Text style={styles.suffix} accessible={false} importantForAccessibility="no">
                  {t.strataCoverUnit}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
      {anyCover && Number.isFinite(count) ? (
        <Text style={styles.count} testID="strata-cover-count">
          {t.strataCounted({ count })}
        </Text>
      ) : null}
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
      gap: brandSpacing4.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
    },
    rowLabel: {
      flex: 1,
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
    field: {
      width: COVER_FIELD_WIDTH,
      minHeight: COVER_FIELD_MIN_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: brandComponentTokens.field.horizontalPadding,
      borderWidth: 1,
      borderColor: theme.componentColors.field.border,
      borderRadius: brandRadius.field,
      backgroundColor: theme.componentColors.field.background,
    },
    input: {
      flex: 1,
      minHeight: COVER_FIELD_MIN_HEIGHT,
      padding: 0,
      textAlign: "right",
      ...brandTypography.input,
      fontSize: brandTypeScale.subhead.fontSize,
      color: theme.colors.textPrimary,
    },
    suffix: {
      marginLeft: brandSpacing4.xs,
      ...brandTypography.input,
      fontSize: brandTypeScale.subhead.fontSize,
      color: theme.colors.textSecondary,
    },
    count: {
      ...brandTypography.sectionBody,
      color: theme.semanticColors.textStrong,
    },
  })
}
