import { useMemo, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import type { RouteExperience } from "@cortege/ibp-domain"
import { formatDecimalFr, parseHectaresInput } from "../../app/route-text"
import { brandSpacing4, brandTypeScale } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppCollapsibleSection } from "../../ui/AppCollapsibleSection"
import { AppField } from "../../ui/AppField"
import { AppText as Text } from "../../ui/AppText"
import type { GuideView } from "./route-guide-model"
import type { RouteGuideActions } from "./useRouteGuideState"

type RefineSectionProps = {
  refine: GuideView["refine"]
  actions: RouteGuideActions
  /** Drawn at the end of the unfolded section (the advice block of the route step, 30-20). */
  footer?: ReactNode
}

const EXPERIENCES: readonly RouteExperience[] = ["regular", "beginner"]

/**
 * "Pour affiner": folded by default, never required. Experience and time available are information
 * only (O-04): they never change the parcours, the counting or the zone, they feed the advice. A
 * folded section that holds an answer says so in its badge, so the observer never wonders.
 */
export function RefineSection({ refine, actions, footer }: RefineSectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const texts = fr.routeGuide.questions.refine
  const experienceLabel: Record<RouteExperience, string> = {
    regular: texts.experienceRegular,
    beginner: texts.experienceBeginner,
  }

  const badgeParts: string[] = []
  if (refine.experience !== undefined) badgeParts.push(texts.experienceShort)
  if (refine.filled && refine.hoursText.trim() !== "" && !refine.hoursInvalid) {
    const hours = parseHectaresInput(refine.hoursText) ?? 0
    badgeParts.push(texts.hoursValue({ hours, text: formatDecimalFr(hours, 2) }))
  }

  return (
    <View testID="route-refine">
      <AppCollapsibleSection title={texts.title} badge={badgeParts.join(" · ") || undefined}>
        <Text style={styles.lead}>{texts.lead}</Text>
        <Text style={styles.label}>{texts.experienceLabel}</Text>
        <View style={styles.chips}>
          {EXPERIENCES.map((value) => (
            <AppChoiceChip
              key={value}
              label={experienceLabel[value]}
              active={refine.experience === value}
              onPress={() => actions.setExperience(refine.experience === value ? undefined : value)}
              testID={`route-experience-${value}`}
            />
          ))}
        </View>
        <AppField
          label={texts.hoursLabel}
          suffix={texts.hoursSuffix}
          value={refine.hoursText}
          onChangeText={actions.setHoursText}
          keyboardType="decimal-pad"
          returnKeyType="done"
          error={refine.hoursInvalid ? texts.hoursInvalid : null}
          accessibilityLabel={fr.routeGuide.a11y.hoursField}
          testID="route-hours-field"
        />
        {footer}
      </AppCollapsibleSection>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    lead: {
      ...brandTypeScale.subhead,
      color: theme.colors.textSecondary,
    },
    label: {
      ...brandTypeScale.subhead,
      color: theme.colors.textPrimary,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
    },
  })
}
