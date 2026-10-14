// Why custom: the four cas cards are RadioCard (no native card radio exists); only the scale switch is a native Switch.
import { useMemo } from "react"
import { StyleSheet, Switch, View } from "react-native"
import { IBP_CAS_VALUES, type IbpCas } from "@cortege/ibp-domain"
import { brandSpacing, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppText as Text } from "./AppText"
import { RadioCard } from "./RadioCard"

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
          <RadioCard
            key={cas}
            selected={selected}
            onPress={() => onChange(cas)}
            title={m.casLabels[cas]}
            caption={m.casCaptions[cas]}
            accessibilityLabel={fr.surveyForm.wizard.optionA11y({
              label: m.casLabels[cas],
              caption: m.casCaptions[cas],
            })}
            testID={`cas-option-${cas}`}
          />
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
      gap: brandSpacing.sm,
    },
    copy: {
      flex: 1,
      gap: brandSpacing4.xxs,
    },
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.xs,
      paddingTop: brandSpacing4.xs,
    },
    switchLabel: {
      ...brandTypography.sectionBody,
      fontFamily: "Jost-Medium",
      color: theme.colors.textPrimary,
    },
  })
}
