import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
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
import { AppNotice } from "../../ui/AppNotice"
import { fr } from "../../i18n"
import { PARCEL_CARD_COMPACT } from "./layout-budget"

const t = fr.parcelSelection
const NEXT_ICON = "arrow-forward-outline"
const DONE_ICON = "checkmark-outline"
const META_ICON_SIZE = 16

export type ParcelSelectionCardProps = {
  /** Window under the compact threshold (`isCompactParcelCard`): a tighter card for a small map. */
  compact: boolean
  hasSelection: boolean
  selectionLabel: string
  /** The visible-parcel count or the zoom hint, shown under the title. */
  helperText: string
  saving: boolean
  /** New-survey flow: the button reads "Continuer" and needs a parcel. */
  wizard: boolean
  onDone: () => void
}

/**
 * The bottom card of parcel selection. Full by default; on a small window (D-08) the compact variant
 * keeps one title line, one meta line that carries the selection requirement, and the 50 pt button,
 * so the map keeps about half of the screen. The button stays disabled in the wizard without a
 * parcel in both modes.
 */
export function ParcelSelectionCard({
  compact,
  hasSelection,
  selectionLabel,
  helperText,
  saving,
  wizard,
  onDone,
}: ParcelSelectionCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const title = hasSelection ? selectionLabel : t.noSelection
  const button = (
    <AppButton
      label={saving ? t.saving : wizard ? t.continue : t.done}
      leadingIcon={saving ? "hourglass-outline" : wizard ? NEXT_ICON : DONE_ICON}
      size="lg"
      style={compact ? styles.doneButtonCompact : styles.doneButton}
      onPress={onDone}
      disabled={saving || (wizard && !hasSelection)}
    />
  )

  if (compact) {
    return (
      <AppCard
        glass
        surface={theme.visual.mapPanel}
        padding={PARCEL_CARD_COMPACT.padding}
        style={styles.compactSheet}
      >
        <Text
          style={styles.compactTitle}
          numberOfLines={1}
          maxFontSizeMultiplier={brandFontScaleCaps.title}
        >
          {title}
        </Text>
        {hasSelection ? (
          <Text
            style={[styles.compactMeta, styles.compactMetaSecondary]}
            numberOfLines={PARCEL_CARD_COMPACT.metaMaxLines}
            maxFontSizeMultiplier={brandFontScaleCaps.meta}
          >
            {helperText}
          </Text>
        ) : (
          <View style={styles.compactMetaRow}>
            <Ionicons
              name="alert-circle-outline"
              size={META_ICON_SIZE}
              color={theme.onSurface.danger}
            />
            <Text
              style={[styles.compactMeta, styles.compactMetaPrimary]}
              numberOfLines={PARCEL_CARD_COMPACT.metaMaxLines}
              maxFontSizeMultiplier={brandFontScaleCaps.meta}
            >
              {t.compact.selectionRequired}
            </Text>
          </View>
        )}
        {button}
      </AppCard>
    )
  }

  return (
    <AppCard glass surface={theme.visual.mapPanel} style={styles.bottomSheet}>
      <Text style={styles.bottomTitle}>{title}</Text>
      <Text style={styles.bottomMeta}>{helperText}</Text>
      {!hasSelection ? (
        <AppNotice tone="danger" icon="alert-circle-outline" message={t.selectionRequired} />
      ) : null}
      <Text style={styles.bottomHint}>{t.tapHint}</Text>
      {button}
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // DS-15 (Phase 12): a real blurred glass panel (`AppCard glass`) instead of a flat
    // `brandTranslucentPanel` fill.
    bottomSheet: {
      gap: brandSpacing4.sm,
    },
    bottomTitle: {
      ...brandTypography.sectionTitle,
      fontSize: brandTypeScale.title3.fontSize,
      lineHeight: 24,
      color: theme.colors.textPrimary,
    },
    bottomMeta: {
      ...brandTypography.sectionBody,
      fontSize: brandTypeScale.footnote.fontSize,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    bottomHint: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    doneButton: {
      marginTop: brandSpacing4.xs,
      ...brandShadow.card,
    },
    // The compact card (D-08): the gaps and heights come from PARCEL_CARD_COMPACT, which the budget
    // test sums.
    compactSheet: {
      gap: PARCEL_CARD_COMPACT.gap,
    },
    compactTitle: {
      ...brandTypography.sectionTitle,
      fontSize: brandTypeScale.headline.fontSize,
      lineHeight: PARCEL_CARD_COMPACT.titleLineHeight,
      color: theme.colors.textPrimary,
    },
    compactMetaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.xs,
    },
    compactMeta: {
      ...brandTypography.sectionBody,
      fontSize: brandTypeScale.footnote.fontSize,
      lineHeight: PARCEL_CARD_COMPACT.metaLineHeight,
    },
    compactMetaPrimary: {
      flex: 1,
      color: theme.colors.textPrimary,
    },
    compactMetaSecondary: {
      color: theme.colors.textSecondary,
    },
    doneButtonCompact: {
      ...brandShadow.card,
    },
  })
}
