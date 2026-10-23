import { useEffect, useMemo, useRef } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ROUTE_METHODS } from "@cortege/ibp-domain"
import type {
  CountingMode,
  RouteMethod,
  UncappableFactor,
  UncappedPresetId,
} from "@cortege/ibp-domain"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { ROUTE_METHOD_TEXT, routeSheetText } from "../../app/route-text"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppNotice } from "../../ui/AppNotice"
import { AppPressable } from "../../ui/AppPressable"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppText as Text } from "../../ui/AppText"
import { GlassButton } from "../../ui/GlassButton"
import { GlossaryInfo } from "../../ui/GlossaryInfo"
import { RadioCard } from "../../ui/RadioCard"
import { feedback } from "../../ui/feedback"
import { CountingPicker } from "./CountingPicker"
import { METHOD_TERM } from "./glossary-terms"
import { RouteDetailsCard, type RouteDetailsValue } from "./RouteDetailsCard"
import { RouteAdvice } from "./RouteNotices"
import type { ChooseView } from "./route-choose-model"

const guide = fr.routeGuide
const chooser = guide.chooser

export type RouteChooseScreenProps = {
  /** "pick" returns the choice to the route step; "edit" saves it on the draft. */
  mode: "pick" | "edit"
  view: ChooseView
  /** The save failed (edit mode): the danger notice with "Réessayer" shows above the button. */
  saveError: boolean
  saving: boolean
  /** Opens scrolled to the mode de relevé (the "Modifier" link of the route step). */
  section?: "counting"
  onSelectMethod: (method: RouteMethod) => void
  onSelectCounting: (mode: CountingMode) => void
  onSelectPreset: (preset: UncappedPresetId) => void
  onToggleFactor: (factor: UncappableFactor) => void
  onChangeDetails: (value: RouteDetailsValue) => void
  onUse: () => void
  /** Opens the guided choice; the link shows in edit mode only. */
  onAdvise: () => void
}

/**
 * "Choisir le parcours" (phase 30, spec sections 4 and 6, O-14, O-01): the direct choice of the
 * route step and the change of its suggestion, and the later edit of a draft. The three parcours of
 * the app with their explanations (the suggested one tagged "Conseillé"), the mode de relevé with
 * the factors counted in full, the shared details card, the footer "Utiliser ce
 * parcours". It shows what the model derives from the package and decides nothing itself; it needs
 * no network, a surface that is unknown is typed in the details card.
 */
export function RouteChooseScreen({
  mode,
  view,
  saveError,
  saving,
  section,
  onSelectMethod,
  onSelectCounting,
  onSelectPreset,
  onToggleFactor,
  onChangeDetails,
  onUse,
  onAdvise,
}: RouteChooseScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  const countingTop = useRef<number | null>(null)
  const scrolled = useRef(false)

  // "Modifier" on the route step: the sheet opens at the mode de relevé, once.
  const scrollToCounting = (): void => {
    if (section !== "counting" || scrolled.current || countingTop.current === null) return
    scrolled.current = true
    scrollRef.current?.scrollTo({ y: countingTop.current, animated: false })
  }

  // Choosing "Relevé déplafonné" opens the presets and the factors under the two cards: the sheet
  // scrolls to the mode de relevé so the part that just appeared is on screen (owner check).
  const previousCounting = useRef(view.counting)
  useEffect(() => {
    const opened = previousCounting.current !== "uncapped" && view.counting === "uncapped"
    previousCounting.current = view.counting
    if (!opened) return undefined
    const timer = setTimeout(() => {
      if (countingTop.current !== null) {
        scrollRef.current?.scrollTo({ y: countingTop.current, animated: true })
      }
    }, 80)
    return () => clearTimeout(timer)
  }, [view.counting])

  return (
    <View style={styles.root} collapsable={false} testID="route-choose-screen">
      {/*
        iOS form sheet: react-native-screens looks for a ScrollView along the first-child path of the
        sheet content and forces its frame to the sheet's own frame, which moves it out of view when
        it sits beside a footer (the sheet opened empty). An empty first child that is not
        flattened keeps the ScrollView off that path, so the flex layout (scroll then footer) holds.
      */}
      <View
        style={styles.sheetGuard}
        collapsable={false}
        importantForAccessibility="no"
        testID="route-choose-sheet-guard"
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        testID="route-choose-scroll"
      >
        {mode === "edit" ? (
          <View style={styles.adviseLine} testID="route-advise-line">
            <Text style={styles.adviseLead}>{chooser.adviseLead}</Text>
            <AppPressable
              style={styles.link}
              onPress={onAdvise}
              accessibilityRole="button"
              accessibilityLabel={chooser.advise}
              testID="route-advise-link"
            >
              <Text style={styles.linkLabel}>{chooser.advise}</Text>
            </AppPressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <AppSectionHeader title={chooser.parcours} titleAccessibilityRole="header" />
          <View style={styles.cards} accessibilityRole="radiogroup">
            {ROUTE_METHODS.map((method) => {
              const text = ROUTE_METHOD_TEXT[method]
              const tag = view.suggested?.method === method ? chooser.recommended : undefined
              const caption = text.short
              return (
                <RadioCard
                  key={method}
                  selected={view.method === method}
                  onPress={() => {
                    feedback.selection()
                    onSelectMethod(method)
                  }}
                  title={text.name}
                  caption={caption}
                  tag={tag}
                  trailing={
                    <GlossaryInfo term={METHOD_TERM[method]} text={routeSheetText(method)} />
                  }
                  accessibilityLabel={
                    tag
                      ? guide.a11y.optionLabelTagged({ label: text.name, tag, caption })
                      : guide.a11y.optionLabel({ label: text.name, caption })
                  }
                  testID={`route-parcours-${method}`}
                />
              )
            })}
          </View>
        </View>

        {view.method === null || (view.method === "full" && view.standHa !== null) ? null : (
          // Right under the parcours it belongs to, before the mode de relevé. A full parcours
          // with a known stand surface has nothing to type, so it shows no card (owner check).
          <RouteDetailsCard
            method={view.method}
            counting={view.counting}
            uncappedFactors={view.factors}
            standHa={view.standHa}
            value={view.details}
            onChange={onChangeDetails}
          />
        )}

        <View
          style={styles.section}
          onLayout={(event) => {
            countingTop.current = event.nativeEvent.layout.y
            scrollToCounting()
          }}
        >
          <CountingPicker
            counting={view.counting}
            preset={view.preset}
            factors={view.factors}
            factorsMissing={view.factorsMissing}
            keptValuesNotice={view.keptValuesNotice}
            onSelectCounting={onSelectCounting}
            onSelectPreset={onSelectPreset}
            onToggleFactor={onToggleFactor}
          />
          <RouteAdvice advice={view.advice} />
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, brandSpacing4.lg) }]}
        testID="route-choose-footer"
      >
        {saveError ? (
          <AppNotice
            tone="danger"
            icon="alert-circle-outline"
            message={guide.screen.saveError}
            action={{ label: guide.screen.retry, onPress: onUse }}
          />
        ) : null}
        <GlassButton
          label={guide.screen.use}
          size="lg"
          disabled={!view.canUse}
          loading={saving}
          accessibilityLabel={view.canUse ? undefined : chooser.useDisabledA11y}
          onPress={onUse}
          testID="route-choose-use"
        />
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    sheetGuard: {
      height: 0,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: brandSpacing4.lg,
      paddingTop: brandSpacing4.md,
      paddingBottom: brandSpacing4.lg,
      gap: brandSpacing4.lg,
    },
    section: {
      gap: brandSpacing4.smd,
    },
    cards: {
      gap: brandSpacing4.sm,
    },
    adviseLine: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      columnGap: brandSpacing4.xs,
    },
    adviseLead: {
      ...brandTypeScale.subhead,
      color: theme.colors.textSecondary,
    },
    link: {
      minHeight: 44,
      justifyContent: "center",
    },
    linkLabel: {
      ...brandTypeScale.headline,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.semanticColors.accent,
    },
    footer: {
      paddingHorizontal: brandSpacing4.lg,
      paddingTop: brandSpacing4.sm,
      gap: brandSpacing4.sm,
    },
  })
}
