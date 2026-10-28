import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import Animated from "react-native-reanimated"
import {
  Keyboard,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"
import { allowedScoresFor, type DmhGroupCode, type IbpMethodVersion } from "@cortege/ibp-domain"
import { brandShadow, brandSpacing4 } from "../../app/brand-tokens"
import { computeIbpTotalsFromRetainedScores } from "../../app/ibp-scoring"
import type { FactorAnnotationDraft } from "../../hooks/useFactorAnnotations"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { FactorField, FactorKey, FactorRetainedScore } from "../../app/types"
import { fr } from "../../i18n"
import { FactorDetailScreen } from "../FactorDetailScreen"
import type { UncappedEntryProps } from "../factor-detail/UncappedFieldBlock"
import { FACTOR_ORDER } from "./components"
import { computeFactorProgress } from "./FactorsList"
import { FactorLetterStrip, STRIP_HEIGHT } from "./FactorLetterStrip"
import { FactorPagerHeader, TOTAL_CHIP_HEIGHT } from "./FactorPagerHeader"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { GlassButton } from "../../ui/GlassButton"
import { Ionicons } from "@expo/vector-icons"
import { AppPressable } from "../../ui/AppPressable"
import { MaxScoreToast, useMaxScoreToast } from "./MaxScoreToast"
import { usePagerChromeStyle, usePagerKeyboard } from "./usePagerKeyboard"

const t = fr.factorPager

const NO_UNCAPPED_FACTORS: readonly FactorKey[] = []
// F's highest score, read from the package: the toast of the top score is F's only (follow-up 32-26).
const TOP_F_SCORE = Math.max(...allowedScoresFor("F"))

// The bottom bar: the A to J strip (FactorLetterStrip) and a round "next" button beside it. Field
// sizes (D-05): the bar and the round button stay 46 pt, the total pill 36 pt.
export const BAR_HEIGHT = STRIP_HEIGHT
export { TOTAL_CHIP_HEIGHT }
// D-26: the "Terminer le relevé" pill row above the bar; at least the 50 pt of a large GlassButton
// (the row is measured, so a label that wraps at a large text size grows the page padding too).
export const FINISH_ROW_MIN_HEIGHT = 50

/** D-26: the finish offered on the last factor when the survey is complete and named. */
export type PagerFinishAction = {
  label: string
  accessibilityLabel: string
  /** A finish is running: spinner, presses ignored. */
  loading: boolean
  onPress: () => void
  /** The calm message of a finish that did not finish, drawn above the pill. */
  notice: ReactNode
}

type FactorPagerProps = {
  initialFactor: FactorKey
  factorSections: Record<FactorKey, FactorField[]>
  factorRetainedScores: Record<FactorKey, FactorRetainedScore | null>
  methodVersion: IbpMethodVersion | null
  /** The factor now on screen: the route puts its name in the native header. */
  onActiveFactorChange?: (factor: FactorKey) => void
  /** "Terminer" on the last factor: back to the list. */
  onFinish: () => void
  /** "Aide au relevé": opens the help sheet route with the factor's texts. */
  onOpenHelp: (help: string, hints: readonly string[]) => void
  /** Phase 32 (D-04): opens the dendromicrohabitat guide sheet, on a group or on the catalogue. */
  onOpenDmhGuide: (group: DmhGroupCode) => void
  /**
   * D-26: on the last factor, a labelled "Terminer le relevé" pill above the bar that finishes the
   * survey; the round button then only goes back. Null (the default) keeps the plain "Terminer".
   */
  finishAction?: PagerFinishAction | null
  /** Phase 27 (D-12): the doubt flag and the note of each factor, as the form holds them. */
  factorAnnotations: FactorAnnotationDraft
  onChangeDoubt: (factor: FactorKey, next: boolean) => void
  onChangeNote: (factor: FactorKey, text: string) => void
  /** The note is written to the draft (typing pause, blur, page change). */
  onCommitNote: () => void
  /**
   * Phase 30 (D-07): the factors the recorded route counts in full. The active one shows the
   * "Relevé déplafonné" badge under the title row and its caption on the page. Empty (the default):
   * nothing new is shown.
   */
  uncappedFactors?: readonly FactorKey[]
  /** The surface décrite of the recorded route (ha): C, D and E start from it. Null: none. */
  zoneSurfaceHa?: number | null
  /** Phase 30 (plan 30-19): the detail inputs of B and F counted in full, with their setters. */
  uncappedEntry?: UncappedEntryProps
}

/**
 * FLOW-04: a horizontal pager A->J replacing the 20 round trips to the factor grid. OA-98: a slim
 * title row (the factor's name, its score and the running total) under the transparent native header, the page,
 * and a floating bottom bar in Liquid Glass: the A to J letters (each shows its factor's state; a tap
 * or a slide of the finger along the strip goes to a factor, a bubble names it) and a round button
 * for the next factor ("Terminer" on the last). Going back is a letter or a swipe. D-26: on the
 * last factor of a complete, named survey a "Terminer le relevé" glass pill floats above the bar
 * (no control of the bar moves or shrinks). Phase 27 (U-07): while the keyboard is up the bar and the
 * pill row fade out and take no touches, so the note field of a factor has the room it needs; every
 * page change dismisses the keyboard first. Memoised: the route also reads the surveys list.
 */
export const FactorPager = memo(function FactorPager({
  initialFactor,
  factorSections,
  factorRetainedScores,
  methodVersion,
  onActiveFactorChange,
  onFinish,
  onOpenHelp,
  onOpenDmhGuide,
  finishAction = null,
  factorAnnotations,
  onChangeDoubt,
  onChangeNote,
  onCommitNote,
  uncappedFactors = NO_UNCAPPED_FACTORS,
  zoneSurfaceHa = null,
  uncappedEntry,
}: FactorPagerProps) {
  const theme = useBrandTheme()
  const tabBarClearance = useTabBarClearance()
  const styles = useMemo(() => createStyles(theme), [theme])
  const scrollRef = useRef<ScrollView | null>(null)
  const [pageWidth, setPageWidth] = useState(0)
  const [finishRowHeight, setFinishRowHeight] = useState(FINISH_ROW_MIN_HEIGHT)
  const { width: windowWidth } = useWindowDimensions()
  const hasScrolledToInitial = useRef(false)
  const initialIndex = Math.max(0, FACTOR_ORDER.indexOf(initialFactor))
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const progress = useMemo(() => computeFactorProgress(factorSections), [factorSections])
  const lastIndex = FACTOR_ORDER.length - 1
  const keyboardVisible = usePagerKeyboard()
  const chromeStyle = usePagerChromeStyle(keyboardVisible)

  const handleContainerLayout = (event: LayoutChangeEvent): void => {
    setPageWidth(event.nativeEvent.layout.width)
  }

  useEffect(() => {
    if (hasScrolledToInitial.current || pageWidth <= 0) return
    hasScrolledToInitial.current = true
    scrollRef.current?.scrollTo({ x: initialIndex * pageWidth, animated: false })
  }, [initialIndex, pageWidth])

  const scrollToIndex = (index: number, animated = true): void => {
    // The page about to go away flushes its note as it unmounts; the keyboard goes first.
    Keyboard.dismiss()
    const clamped = Math.max(0, Math.min(lastIndex, index))
    if (pageWidth > 0) {
      scrollRef.current?.scrollTo({ x: clamped * pageWidth, animated })
    }
    setActiveIndex(clamped)
  }

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (pageWidth <= 0) return
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth)
    const clamped = Math.max(0, Math.min(lastIndex, index))
    if (clamped !== activeIndex) Keyboard.dismiss()
    setActiveIndex(clamped)
  }

  const activeFactor = FACTOR_ORDER[activeIndex]
  useEffect(() => {
    onActiveFactorChange?.(activeFactor)
  }, [activeFactor, onActiveFactorChange])
  const total = useMemo(
    () => computeIbpTotalsFromRetainedScores(factorRetainedScores).ibp_total,
    [factorRetainedScores],
  )
  const maxToast = useMaxScoreToast({
    active: activeFactor === "F",
    atTop: factorRetainedScores.F?.score === TOP_F_SCORE,
  })
  const isLast = activeIndex === lastIndex
  const showFinish = isLast && finishAction !== null
  const barBottom = tabBarClearance + brandSpacing4.sm
  // The page ends above the bar, and above the pill row when it shows (it floats, no fill).
  // While the keyboard is up the bar and the pill are hidden, so the page only keeps a margin.
  const pageBottom = keyboardVisible
    ? brandSpacing4.md
    : tabBarClearance +
      BAR_HEIGHT +
      2 * brandSpacing4.md +
      (showFinish ? Math.max(FINISH_ROW_MIN_HEIGHT, finishRowHeight) + brandSpacing4.smd : 0)
  return (
    <View style={styles.container} onLayout={handleContainerLayout} testID="factor-pager">
      <FactorPagerHeader
        factor={activeFactor}
        total={total}
        factorScore={factorRetainedScores[activeFactor]?.score ?? null}
        countedInFull={uncappedFactors.includes(activeFactor)}
      />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.pages}
        testID="factor-pager-scroll"
      >
        {FACTOR_ORDER.map((factor, index) => (
          <ScrollView
            key={factor}
            // Until the pager is measured the page takes the window width: with no width the
            // texts are measured on one line and the score line runs off the edge (OA-110).
            style={{ width: pageWidth || windowWidth }}
            contentContainerStyle={[styles.pageContent, { paddingBottom: pageBottom }]}
            // A tap on the strip or on a chip works with the keyboard up; dragging the page puts the
            // keyboard away; the page makes room for it (UI-SPEC 2.4).
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            {/* Only the active page mounts real content: ten factor screens' worth of hint state
             * and validation running at once is wasted work the surveyor never sees. */}
            {index === activeIndex ? (
              <FactorDetailScreen
                factor={factor}
                fields={factorSections[factor]}
                retainedScore={factorRetainedScores[factor]}
                methodVersion={methodVersion}
                onOpenHelp={onOpenHelp}
                onOpenDmhGuide={onOpenDmhGuide}
                doubt={factorAnnotations[factor]?.doubt === true}
                note={factorAnnotations[factor]?.note ?? ""}
                onChangeDoubt={(next) => onChangeDoubt(factor, next)}
                onChangeNote={(text) => onChangeNote(factor, text)}
                onCommitNote={onCommitNote}
                uncappedFactors={uncappedFactors}
                zoneSurfaceHa={zoneSurfaceHa}
                uncappedEntry={uncappedEntry}
              />
            ) : null}
          </ScrollView>
        ))}
      </ScrollView>

      {showFinish ? (
        <Animated.View
          pointerEvents={keyboardVisible ? "none" : "box-none"}
          onLayout={(event) => setFinishRowHeight(event.nativeEvent.layout.height)}
          style={[
            styles.finishRow,
            { bottom: barBottom + BAR_HEIGHT + brandSpacing4.smd },
            chromeStyle,
          ]}
          testID="pager-finish-row"
        >
          {finishAction.notice}
          <GlassButton
            label={finishAction.label}
            accessibilityLabel={finishAction.accessibilityLabel}
            size="lg"
            loading={finishAction.loading}
            onPress={finishAction.onPress}
            testID="pager-finish-survey"
          />
        </Animated.View>
      ) : null}

      <MaxScoreToast
        visible={maxToast.visible && !keyboardVisible}
        onDismiss={maxToast.dismiss}
        bottom={barBottom + BAR_HEIGHT + brandSpacing4.smd}
      />

      <Animated.View
        pointerEvents={keyboardVisible ? "none" : "box-none"}
        style={[styles.bar, { bottom: barBottom }, chromeStyle]}
      >
        <FactorLetterStrip activeIndex={activeIndex} progress={progress} onSelect={scrollToIndex} />
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={showFinish ? t.close : isLast ? t.finish : t.next}
          onPress={() => (isLast ? onFinish() : scrollToIndex(activeIndex + 1))}
          style={styles.nextButton}
          testID="pager-next"
        >
          <Ionicons
            name={
              showFinish ? "close-outline" : isLast ? "checkmark-outline" : "arrow-forward-outline"
            }
            size={26}
            color={theme.semanticColors.onCtaPrimary}
          />
        </AppPressable>
      </Animated.View>
    </View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    pages: {
      flex: 1,
    },
    pageContent: {
      padding: brandSpacing4.md,
    },
    // D-26, D-27c: the pill row floats above the bar with no fill; only the pill and the notice
    // glass are drawn, the page shows around them.
    finishRow: {
      position: "absolute",
      left: brandSpacing4.md,
      right: brandSpacing4.md,
      gap: brandSpacing4.sm,
    },
    bar: {
      position: "absolute",
      left: brandSpacing4.md,
      right: brandSpacing4.md,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
    },
    nextButton: {
      width: BAR_HEIGHT,
      height: BAR_HEIGHT,
      borderRadius: BAR_HEIGHT / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.semanticColors.ctaPrimary,
      ...brandShadow.card,
    },
  })
}
