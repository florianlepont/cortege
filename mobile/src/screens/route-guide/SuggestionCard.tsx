import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useState } from "react"
import { AccessibilityInfo, type LayoutChangeEvent, StyleSheet, View } from "react-native"
import type {
  CountingMode,
  RouteChosenBy,
  RouteMethod,
  UncappableFactor,
} from "@cortege/ibp-domain"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { COUNTING_TEXT, ROUTE_METHOD_TEXT, formatHectares } from "../../app/route-text"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import type { ForestTextBlock } from "../../ui/ForestAurora"
import { ForestCard } from "../../ui/ForestCard"
import { GlossaryInfo } from "../../ui/GlossaryInfo"
import { RESUME_LAYOUT } from "../home/layout-budget"
import { COUNTING_TERM, METHOD_TERM } from "./glossary-terms"
import { SuggestionEntrance } from "./SuggestionEntrance"

const guide = fr.routeGuide

export type SuggestionCardProps = {
  method: RouteMethod
  counting: CountingMode
  /** The factors counted in full; only read when the counting is uncapped. */
  uncappedFactors: readonly UncappableFactor[]
  /** The surface described (for a full parcours, the stand's); null when it cannot be told. */
  zoneHa: number | null
  /** "guide": the parcours advised; "observer": the one the observer chose. */
  chosenBy: RouteChosenBy
  /** Opens the chooser with the current selection. */
  onChange: () => void
  /** Restores the advised parcours; the link shows only when the observer's pick differs. */
  onRestore?: () => void
}

type Measured = {
  method: ForestTextBlock | null
  mode: ForestTextBlock | null
  foot: ForestTextBlock | null
}

/**
 * The suggestion (UI-SPEC section 4.1): the screen's forest card and its one animated hero layer.
 * Three blocks of text, each measured so the aurora's shield keeps it readable: the parcours (eyebrow,
 * name with its glossary glyph, its explanation and what the observer does), the mode de relevé (its
 * name with a glyph, its explanation and, for a relevé déplafonné, the factors counted in full) and
 * the surface line with the links. The two first read as one element for a screen reader ("Parcours
 * conseillé : ...", the sentences in its hint); the links are buttons of their own, outside it.
 * The package's codes and numbers come in as props: nothing here decides a parcours (O-04).
 */
export function SuggestionCard({
  method,
  counting,
  uncappedFactors,
  zoneHa,
  chosenBy,
  onChange,
  onRestore,
}: SuggestionCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const forest = theme.visual.forest
  const methodText = ROUTE_METHOD_TEXT[method]
  const countingText = COUNTING_TEXT[counting]
  const suggested = chosenBy === "guide"
  const eyebrow = suggested ? guide.suggestion.eyebrowSuggested : guide.suggestion.eyebrowChosen

  // The suggestion is announced politely, once, when it appears and when a new one replaces it.
  // The observer's own pick is not a suggestion and is not announced as one.
  useEffect(() => {
    if (!suggested) return
    AccessibilityInfo.announceForAccessibility(
      guide.a11y.suggestionChanged({ route: methodText.name, counting: countingText.name }),
    )
  }, [suggested, methodText.name, countingText.name])

  const [measured, setMeasured] = useState<Measured>({ method: null, mode: null, foot: null })
  const measure = (key: keyof Measured) => (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout
    // The blocks sit inside the card's padding.
    const block = { x: RESUME_LAYOUT.padding + x, y: RESUME_LAYOUT.padding + y, width, height }
    setMeasured((previous) => ({ ...previous, [key]: block }))
  }
  const blocks =
    measured.method === null || measured.mode === null || measured.foot === null
      ? null
      : [measured.method, measured.mode, measured.foot]

  const hectares = zoneHa === null ? null : formatHectares(zoneHa)
  const label =
    hectares === null
      ? guide.a11y.suggestionCardNoZone({
          eyebrow,
          route: methodText.name,
          counting: countingText.name,
        })
      : guide.a11y.suggestionCard({
          eyebrow,
          route: methodText.name,
          counting: countingText.name,
          hectares,
        })
  const hint = [methodText.does, countingText.explanation].join(" ")

  return (
    <SuggestionEntrance trigger={[method, counting, chosenBy].join("|")}>
      <ForestCard variant="resume" blocks={blocks} testID="route-suggestion">
        <View style={styles.main}>
          <View
            accessible
            accessibilityLabel={label}
            accessibilityHint={hint}
            style={styles.summary}
            testID="route-suggestion-summary"
          >
            <View
              style={styles.block}
              onLayout={measure("method")}
              testID="route-suggestion-method"
            >
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{methodText.name}</Text>
                <GlossaryInfo term={METHOD_TERM[method]} color={forest.titleAccent} />
              </View>
              <Text style={styles.sentence}>{methodText.explanation}</Text>
              <Text style={styles.sentence}>{methodText.does}</Text>
            </View>
            <View style={styles.block} onLayout={measure("mode")} testID="route-suggestion-mode">
              <Text style={styles.caption}>{guide.counting.caption}</Text>
              <View style={styles.nameRow}>
                <Text style={styles.modeName}>{countingText.name}</Text>
                <GlossaryInfo term={COUNTING_TERM[counting]} color={forest.titleAccent} />
              </View>
              <Text style={styles.sentence}>{countingText.explanation}</Text>
              {counting === "uncapped" ? (
                <View style={styles.chips} testID="route-counted-factors">
                  {uncappedFactors.map((letter) => (
                    <AppChoiceChip
                      key={letter}
                      variant="status"
                      tone="onDark"
                      label={fr.surveyDetail.route.factorItem({
                        letter,
                        title: fr.labels.factorTitles[letter],
                      })}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.foot} onLayout={measure("foot")} testID="route-suggestion-foot">
            {hectares === null ? null : (
              // The summary above already says the surface: it is hidden from a screen reader here.
              <Text
                style={styles.surface}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                {guide.suggestion.surfaceLine(hectares)}
              </Text>
            )}
            <View style={styles.links}>
              <AppPressable
                style={styles.link}
                onPress={onChange}
                accessibilityRole="button"
                accessibilityLabel={guide.suggestion.change}
                testID="route-change"
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={18}
                  color={forest.titleAccent}
                  accessible={false}
                />
                <Text style={styles.linkLabel}>{guide.suggestion.change}</Text>
              </AppPressable>
              {!suggested && onRestore ? (
                <AppPressable
                  style={styles.link}
                  onPress={onRestore}
                  accessibilityRole="button"
                  accessibilityLabel={guide.suggestion.restore}
                  testID="route-restore"
                >
                  <Ionicons
                    name="arrow-undo-outline"
                    size={18}
                    color={forest.titleAccent}
                    accessible={false}
                  />
                  <Text style={styles.linkLabel}>{guide.suggestion.restore}</Text>
                </AppPressable>
              ) : null}
            </View>
          </View>
        </View>
      </ForestCard>
    </SuggestionEntrance>
  )
}

function createStyles(theme: BrandTheme) {
  const forest = theme.visual.forest
  return StyleSheet.create({
    main: {
      padding: RESUME_LAYOUT.padding,
      gap: brandSpacing4.md,
    },
    summary: {
      gap: brandSpacing4.md,
    },
    block: {
      gap: brandSpacing4.xs,
    },
    eyebrow: {
      ...brandTypography.meta,
      color: forest.body,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    name: {
      flexShrink: 1,
      ...brandTypography.screenTitle,
      color: forest.title,
    },
    caption: {
      ...brandTypography.meta,
      color: forest.sage,
    },
    modeName: {
      flexShrink: 1,
      ...brandTypeScale.headline,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: forest.title,
    },
    sentence: {
      ...brandTypeScale.subhead,
      color: forest.body,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.xs,
      marginTop: brandSpacing4.xs,
    },
    foot: {
      gap: brandSpacing4.xs,
    },
    surface: {
      ...brandTypeScale.subhead,
      color: forest.title,
    },
    links: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: brandSpacing4.sm,
      rowGap: brandSpacing4.xs,
    },
    link: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
      minHeight: 44,
      paddingHorizontal: brandSpacing4.md,
      borderWidth: 1,
      borderColor: forest.titleAccent,
      borderRadius: brandRadius.pill,
    },
    linkLabel: {
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: forest.titleAccent,
    },
  })
}
