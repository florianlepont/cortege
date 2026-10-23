import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import {
  brandFontScaleCaps,
  brandShadow,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { AppButton } from "../../ui/AppButton"
import { AppCard } from "../../ui/AppCard"
import { fr } from "../../i18n"
import { PARCEL_CARD, PARCEL_CARD_ROW_HEIGHT } from "./layout-budget"

const t = fr.parcelSelection

export type ParcelSelectionCardProps = {
  hasSelection: boolean
  selectionLabel: string
  saving: boolean
  /** New-survey flow: the button reads "Continuer" and needs a parcel. */
  wizard: boolean
  onDone: () => void
}

/**
 * The bottom card of parcel selection, one slim row (owner check on the iPhone 17e: the old card
 * with its count, its long sentence and its notice hid a third of the map). The title is the
 * selection ("1 parcelle sélectionnée") and the button sits on the same line; the count of visible
 * parcels is the chip above the card. Only without a parcel does a short line say what to do. The
 * button stays disabled in the wizard without a parcel, and large for field use.
 */
export function ParcelSelectionCard({
  hasSelection,
  selectionLabel,
  saving,
  wizard,
  onDone,
}: ParcelSelectionCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const title = hasSelection ? selectionLabel : t.noSelection

  return (
    <AppCard glass surface={theme.visual.mapPanel} padding={PARCEL_CARD.padding}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text
            style={styles.title}
            numberOfLines={2}
            maxFontSizeMultiplier={brandFontScaleCaps.title}
          >
            {title}
          </Text>
          {hasSelection ? null : (
            <Text
              style={styles.meta}
              numberOfLines={PARCEL_CARD.metaMaxLines}
              maxFontSizeMultiplier={brandFontScaleCaps.meta}
            >
              {t.selectionHelper}
            </Text>
          )}
        </View>
        <AppButton
          label={saving ? t.saving : wizard ? t.continue : t.done}
          leadingIcon={saving ? "hourglass-outline" : undefined}
          size="lg"
          style={styles.button}
          onPress={onDone}
          disabled={saving || (wizard && !hasSelection)}
        />
      </View>
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: PARCEL_CARD.gap,
      minHeight: PARCEL_CARD_ROW_HEIGHT,
    },
    copy: {
      flex: 1,
      gap: brandSpacing4.xxs,
    },
    title: {
      ...brandTypography.sectionTitle,
      fontSize: brandTypeScale.headline.fontSize,
      lineHeight: PARCEL_CARD.titleLineHeight,
      color: theme.colors.textPrimary,
    },
    meta: {
      ...brandTypography.sectionBody,
      fontSize: brandTypeScale.footnote.fontSize,
      lineHeight: PARCEL_CARD.metaLineHeight,
      color: theme.colors.textSecondary,
    },
    button: {
      flexShrink: 0,
      ...brandShadow.card,
    },
  })
}
