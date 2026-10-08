import { useMemo } from "react"
import { Pressable, StyleSheet, Switch, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { IBP_CAS_VALUES, type IbpCas } from "@cortege/ibp-domain"
import { brandRadius, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppText as Text } from "./AppText"

type CasPickerProps = {
  value: IbpCas | null
  onChange: (next: IbpCas) => void
  cas3Scale: boolean
  onCas3ScaleChange: (next: boolean) => void
}

/**
 * The v3.2 cas, as four cards that each say what the cas is (the surveyor has to know which fits
 * the station), and the switch that applies the cas-3 scale to A and G. Used by the new survey
 * wizard and by the method card of the survey's context page, so both read the same.
 */
export function CasPicker({ value, onChange, cas3Scale, onCas3ScaleChange }: CasPickerProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const m = fr.ibpMethod

  return (
    <View style={styles.list}>
      {IBP_CAS_VALUES.map((cas) => {
        const selected = value === cas
        return (
          <Pressable
            key={cas}
            style={[styles.card, selected ? styles.cardSelected : null]}
            onPress={() => onChange(cas)}
            accessibilityRole="radio"
            accessibilityLabel={fr.surveyForm.wizard.optionA11y({
              label: m.casLabels[cas],
              caption: m.casCaptions[cas],
            })}
            accessibilityState={{ selected }}
            testID={`cas-option-${cas}`}
          >
            <View style={[styles.radio, selected ? styles.radioSelected : null]}>
              {selected ? (
                // The ink of the filled radio (12.2-21 dark pass): white on the forest, dark on the
                // dark scheme's light green, where white was 2:1.
                <Ionicons
                  name="checkmark-outline"
                  size={14}
                  color={theme.semanticColors.onCtaPrimary}
                />
              ) : null}
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{m.casLabels[cas]}</Text>
              <Text style={styles.caption}>{m.casCaptions[cas]}</Text>
            </View>
          </Pressable>
        )
      })}
      <View style={styles.switchRow}>
        <View style={styles.copy}>
          <Text style={styles.switchLabel}>{m.cas3ScaleLabel}</Text>
          <Text style={styles.caption}>{m.cas3ScaleHint}</Text>
        </View>
        <Switch
          value={cas3Scale}
          onValueChange={onCas3ScaleChange}
          trackColor={{ false: theme.colors.divider, true: theme.colors.moss }}
          accessibilityRole="switch"
          accessibilityLabel={m.cas3ScaleLabel}
          accessibilityHint={m.cas3ScaleHint}
          accessibilityState={{ checked: cas3Scale }}
        />
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    list: {
      gap: 10,
    },
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      minHeight: 64,
      padding: 14,
      borderRadius: brandRadius.field,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
    },
    cardSelected: {
      borderWidth: 2,
      borderColor: theme.semanticColors.ctaPrimary,
    },
    radio: {
      width: 22,
      height: 22,
      marginTop: 2,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.textSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: theme.semanticColors.ctaPrimary,
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...brandTypography.sectionBody,
      fontFamily: "Jost-SemiBold",
      color: theme.colors.textPrimary,
    },
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 4,
      paddingTop: 4,
    },
    switchLabel: {
      ...brandTypography.sectionBody,
      fontFamily: "Jost-Medium",
      color: theme.colors.textPrimary,
    },
  })
}
