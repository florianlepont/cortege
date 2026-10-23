import { useMemo } from "react"
import { StyleSheet, Switch, View } from "react-native"
import {
  ROUTE_ZONE_ISSUE_SEVERITY,
  isPartialRoute,
  routeZoneIssues,
  type CountingMode,
  type RouteComplement,
  type RouteHomogeneity,
  type RouteMethod,
  type RouteZoneIssueCode,
  type UncappableFactor,
} from "@cortege/ibp-domain"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { ROUTE_ZONE_ISSUE_TEXT, formatHectares, parseHectaresInput } from "../../app/route-text"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppField } from "../../ui/AppField"
import { AppNotice } from "../../ui/AppNotice"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { GlossaryInfo } from "../../ui/GlossaryInfo"

const guide = fr.routeGuide
const details = guide.details

/** What the observer typed: the surface described and the complement (spec section 5, D-08). */
export type RouteDetailsValue = {
  /** The surface described, as typed ("1,2"); the card is prefilled by its owner from the package. */
  zoneText: string
  /** The rest of the stand was looked at (R-14: on by default for a partial parcours). */
  complementDone: boolean
  /** The total surface evaluated, as typed; prefilled with the stand surface. */
  totalText: string
}

export type RouteDetailsCardProps = {
  method: RouteMethod
  counting: CountingMode
  /** The factors counted in full; only read when the counting is uncapped. */
  uncappedFactors: readonly UncappableFactor[]
  /** The stand surface; null when it could not be told (the quick path offline). */
  standHa: number | null
  /**
   * The homogeneity answer, when there is one. The helper names both shares of the stand (10 % and
   * 20 %, spec section 5), so the card does not need it; it is accepted so the route step and the
   * chooser can pass the same selection.
   */
  homogeneity?: RouteHomogeneity
  value: RouteDetailsValue
  onChange: (next: RouteDetailsValue) => void
  /** Opens the chooser at the counting; the link shows only when given. */
  onEditCounting?: () => void
}

/** The checks that belong under the surface described; the other one belongs under the total. */
const ZONE_FIELD_ISSUES: readonly RouteZoneIssueCode[] = [
  "zone_not_positive",
  "zone_too_large",
  "zone_above_stand",
  "partial_over_half",
  "partial_below_minimum",
]

/** What the information glyph of the surface field says: the figures and the field advice. */
function zoneSheetText(method: RouteMethod): string {
  const parts: string[] = [fr.routeGuide.glossary.terms.surfaceDecrite.text]
  if (method === "partial_strip") parts.push(details.zoneHelperPartial, details.stripAdvice)
  if (method === "partial_plot") {
    parts.push(details.zoneHelperPartial, details.plotAdvice, details.plotsAdded)
  }
  // The one glyph of the card also explains the switch under it.
  if (method !== "full") {
    parts.push(
      `${fr.routeGuide.glossary.terms.resteDuPeuplement.term} : ${fr.routeGuide.glossary.terms.resteDuPeuplement.text}`,
      details.complementHint,
    )
  }
  return parts.join("\n\n")
}

/**
 * "Détails du parcours" (UI-SPEC section 6, spec sections 5 and 9), shared by the route step and the
 * chooser, each owning the typed `value`. Nothing is required: the owner prefills the zone from the
 * package. A full parcours is one read line (its field only opens when the stand surface is unknown);
 * a partial one has the zone field with its advice, the live checks of `routeZoneIssues` under it and
 * the complement (D-08, R-14): a switch and the total surface evaluated. For a partial parcours par
 * placette it says that several placettes are added up on one sheet (R-15). There is no group, no
 * group name and no sampling parcours (O-14, O-20). The errors block the recording where it happens
 * (the model, 30-17, reads the same codes); the warnings only inform.
 */
export function RouteDetailsCard({
  method,
  counting,
  uncappedFactors,
  standHa,
  value,
  onChange,
  onEditCounting,
}: RouteDetailsCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const partial = isPartialRoute(method)
  const showZoneField = partial || standHa === null

  const zoneHa = parseHectaresInput(value.zoneText)
  const totalHa = parseHectaresInput(value.totalText)
  const complement: RouteComplement | null = partial
    ? value.complementDone
      ? { done: true, ...(totalHa === null ? {} : { total_surface_ha: totalHa }) }
      : { done: false }
    : null
  const issues = routeZoneIssues({ method, zoneHa, standHa, complement }).filter(
    // An empty field is not an error yet: the owner of the card asks for the surface before use.
    (code) => code !== "zone_not_positive" || value.zoneText.trim() !== "",
  )
  const zoneIssues = issues.filter((code) => ZONE_FIELD_ISSUES.includes(code))
  const zoneError = zoneIssues.find((code) => ROUTE_ZONE_ISSUE_SEVERITY[code] === "error")
  const zoneWarnings = zoneIssues.filter((code) => ROUTE_ZONE_ISSUE_SEVERITY[code] === "warning")
  const totalError = issues.includes("complement_below_zone")
    ? ROUTE_ZONE_ISSUE_TEXT.complement_below_zone
    : null

  const factors = uncappedFactors
    .map((letter) =>
      fr.surveyDetail.route.factorItem({ letter, title: fr.labels.factorTitles[letter] }),
    )
    .join(", ")

  return (
    <AppCard variant="glass" padding={brandSpacing4.md}>
      <View style={styles.root} testID="route-details">
        <Text style={styles.title} accessibilityRole="header">
          {details.title}
        </Text>

        {!showZoneField && standHa !== null ? (
          <Text style={styles.line}>{details.fullLine(formatHectares(standHa))}</Text>
        ) : (
          <View style={styles.group}>
            <AppField
              label={details.zoneLabel}
              suffix={fr.routeGuide.questions.surface.suffix}
              value={value.zoneText}
              onChangeText={(zoneText) => onChange({ ...value, zoneText })}
              keyboardType="decimal-pad"
              returnKeyType="done"
              error={zoneError === undefined ? null : ROUTE_ZONE_ISSUE_TEXT[zoneError]}
              accessibilityLabel={guide.a11y.zoneField}
              testID="route-zone-field"
            />
            <View style={styles.helperRow}>
              <Text style={styles.helper}>
                {partial ? details.zoneShort : details.zoneHelperFull}
              </Text>
              <GlossaryInfo term="surfaceDecrite" text={zoneSheetText(method)} />
            </View>
            {zoneWarnings.map((code) => (
              <View key={code} accessibilityLiveRegion="polite" testID={`route-zone-issue-${code}`}>
                <AppNotice
                  tone="warning"
                  icon="alert-circle-outline"
                  message={ROUTE_ZONE_ISSUE_TEXT[code]}
                />
              </View>
            ))}
          </View>
        )}

        {partial ? (
          <View style={styles.group}>
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchLabel}>{details.complementLabel}</Text>
              </View>
              <Switch
                value={value.complementDone}
                onValueChange={(complementDone) => onChange({ ...value, complementDone })}
                trackColor={{ false: theme.colors.divider, true: theme.colors.moss }}
                accessibilityRole="switch"
                accessibilityLabel={details.complementLabel}
                accessibilityHint={details.complementHint}
                accessibilityState={{ checked: value.complementDone }}
                testID="route-complement-switch"
              />
            </View>
            {value.complementDone ? (
              <AppField
                label={details.totalLabel}
                suffix={fr.routeGuide.questions.surface.suffix}
                value={value.totalText}
                onChangeText={(totalText) => onChange({ ...value, totalText })}
                keyboardType="decimal-pad"
                returnKeyType="done"
                error={totalError}
                accessibilityLabel={guide.a11y.totalField}
                testID="route-total-field"
              />
            ) : null}
          </View>
        ) : null}

        {counting === "uncapped" ? (
          <View style={styles.countedRow}>
            <Text style={styles.countedLine}>{details.countedLine(factors)}</Text>
            {onEditCounting ? (
              <AppPressable
                style={styles.edit}
                onPress={onEditCounting}
                accessibilityRole="button"
                accessibilityLabel={details.editCountingA11y}
                testID="route-edit-counting"
              >
                <Text style={styles.editLabel}>{guide.screen.edit}</Text>
              </AppPressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    root: {
      gap: brandSpacing4.md,
    },
    title: {
      ...brandTypeScale.headline,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    line: {
      ...brandTypeScale.subhead,
      color: theme.colors.textPrimary,
    },
    group: {
      gap: brandSpacing4.sm,
    },
    helperRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.sm,
    },
    helper: {
      flex: 1,
      ...brandTypeScale.subhead,
      color: theme.colors.textSecondary,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: 44,
    },
    switchCopy: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    switchLabel: {
      flexShrink: 1,
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    countedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    countedLine: {
      flex: 1,
      ...brandTypeScale.subhead,
      color: theme.colors.textPrimary,
    },
    edit: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: brandSpacing4.xs,
    },
    editLabel: {
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.visual.accentText,
    },
  })
}
