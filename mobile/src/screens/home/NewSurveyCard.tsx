import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { glassContourOpacity } from "../../app/visual-tokens"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppText as Text } from "../../ui/AppText"
import { ContourLines } from "../../ui/ContourLines"
import { RipplePressable } from "../../ui/RipplePressable"
import { NEW_SURVEY_INNER_RADIUS, NEW_SURVEY_LAYOUT } from "./layout-budget"

const t = fr.home.newSurvey

type NewSurveyCardProps = {
  onPress: () => void
}

/**
 * 12.2-19 fix round (owner: "Nouveau relevé" built into the resume card read as an action of the
 * draft, and a plain button would not look integrated): the second action of Accueil, a full-width
 * glass card of its own under the resume card. Accueil draws it only beside a draft; without one the
 * forest card itself starts a survey, so the action never shows twice.
 *
 * The glass card look of variant I (`AppCard` glass: translucent fill and hairline, no gradient, no
 * shadowed border), a moss disc with the "+" outline icon, the label in the title face with what the
 * wizard asks first under it, and a chevron. The whole card is one 56 pt pressable with the green
 * wave (D-21). Behind the text, a faint static copy of the contour lines (never animated: the forest
 * cards of the screen keep the motion budget).
 */
export function NewSurveyCard({ onPress }: NewSurveyCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <AppCard variant="glass" padding={0}>
      <View style={styles.texture} pointerEvents="none" testID="home-new-survey-texture">
        <ContourLines animated={false} />
      </View>
      <RipplePressable
        style={styles.pressable}
        rippleRadius={NEW_SURVEY_INNER_RADIUS}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t.label}
        accessibilityHint={t.helper}
        testID="home-new-survey-card"
      >
        <View style={styles.disc}>
          <Ionicons
            name="add-outline"
            size={NEW_SURVEY_LAYOUT.icon}
            color={theme.visual.pill.label}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>{t.label}</Text>
          <Text style={styles.helper}>{t.helper}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={NEW_SURVEY_LAYOUT.chevron}
          color={theme.colors.textSecondary}
        />
      </RipplePressable>
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // The contours drift past the edges by design (`contourDrift.inset`), so this layer clips them
    // to the card's inner curve; the card itself does not clip (its soft shadow stays whole).
    texture: {
      ...StyleSheet.absoluteFill,
      borderRadius: NEW_SURVEY_INNER_RADIUS,
      overflow: "hidden",
      opacity: glassContourOpacity[theme.scheme],
    },
    pressable: {
      minHeight: NEW_SURVEY_LAYOUT.minHeight,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      paddingVertical: NEW_SURVEY_LAYOUT.paddingY,
      paddingLeft: brandSpacing4.sm,
      paddingRight: brandSpacing4.md,
    },
    // The moss of the variant I pills, with their dark ink: 5.9:1 in both schemes (the disc does not
    // follow the scheme).
    disc: {
      width: NEW_SURVEY_LAYOUT.disc,
      height: NEW_SURVEY_LAYOUT.disc,
      borderRadius: brandRadius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.pill.fallback,
      experimental_backgroundImage: theme.visual.pill.image,
    },
    copy: {
      flex: 1,
    },
    label: {
      ...brandTypography.button,
      color: theme.semanticColors.textStrong,
    },
    helper: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
