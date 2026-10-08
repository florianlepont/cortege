import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"
import { AppText as Text } from "../../ui/AppText"
import type { IbpMethodVersion } from "@cortege/ibp-domain"
import {
  brandRadius,
  brandShadow,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { computeIbpTotalsFromRetainedScores } from "../../app/ibp-scoring"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { FACTOR_TITLES } from "../../app/constants"
import type { FactorField, FactorKey, FactorRetainedScore } from "../../app/types"
import { fr } from "../../i18n"
import { FactorDetailScreen } from "../FactorDetailScreen"
import { FACTOR_ORDER } from "./components"
import { computeFactorProgress } from "./FactorsList"
import { FactorLetterStrip, STRIP_HEIGHT } from "./FactorLetterStrip"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { GlassButton } from "../../ui/GlassButton"
import { Ionicons } from "@expo/vector-icons"

const t = fr.factorPager

// The bottom bar: the A to J strip (FactorLetterStrip) and a round "next" button beside it. Field
// sizes (D-05): the bar and the round button stay 46 pt, the total pill 36 pt.
export const BAR_HEIGHT = STRIP_HEIGHT
export const TOTAL_CHIP_HEIGHT = 36
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
  /**
   * D-26: on the last factor, a labelled "Terminer le relevé" pill above the bar that finishes the
   * survey; the round button then only goes back. Null (the default) keeps the plain "Terminer".
   */
  finishAction?: PagerFinishAction | null
}

/**
 * FLOW-04: a horizontal pager A->J replacing the 20 round trips to the factor grid. OA-98: a slim
 * title row (the factor's name and the running total) under the transparent native header, the page,
 * and a floating bottom bar in Liquid Glass: the A to J letters (each shows its factor's state; a tap
 * or a slide of the finger along the strip goes to a factor, a bubble names it) and a round button
 * for the next factor ("Terminer" on the last). Going back is a letter or a swipe. D-26: on the
 * last factor of a complete, named survey a "Terminer le relevé" glass pill floats above the bar
 * (no control of the bar moves or shrinks). Memoised: the route also reads the surveys list.
 */
export const FactorPager = memo(function FactorPager({
  initialFactor,
  factorSections,
  factorRetainedScores,
  methodVersion,
  onActiveFactorChange,
  onFinish,
  finishAction = null,
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

  const handleContainerLayout = (event: LayoutChangeEvent): void => {
    setPageWidth(event.nativeEvent.layout.width)
  }

  useEffect(() => {
    if (hasScrolledToInitial.current || pageWidth <= 0) return
    hasScrolledToInitial.current = true
    scrollRef.current?.scrollTo({ x: initialIndex * pageWidth, animated: false })
  }, [initialIndex, pageWidth])

  const scrollToIndex = (index: number, animated = true): void => {
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
  const isLast = activeIndex === lastIndex
  const showFinish = isLast && finishAction !== null
  const barBottom = tabBarClearance + brandSpacing4.sm
  // The page ends above the bar, and above the pill row when it shows (it floats, no fill).
  const pageBottom =
    tabBarClearance +
    BAR_HEIGHT +
    2 * brandSpacing4.md +
    (showFinish ? Math.max(FINISH_ROW_MIN_HEIGHT, finishRowHeight) + brandSpacing4.smd : 0)
  return (
    <View style={styles.container} onLayout={handleContainerLayout} testID="factor-pager">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {/* OA-35: a long name ("Milieux ouverts florifères") shrinks to fit a narrow phone
           * instead of ending in an ellipsis. */}
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {FACTOR_TITLES[activeFactor]}
          </Text>
          <View
            style={styles.totalChip}
            accessible
            accessibilityLabel={t.totalA11y(total)}
            testID="pager-total"
          >
            <Text style={styles.totalChipText}>{t.total(total)}</Text>
          </View>
        </View>
      </View>

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
          >
            {/* Only the active page mounts real content: ten factor screens' worth of hint state
             * and validation running at once is wasted work the surveyor never sees. */}
            {index === activeIndex ? (
              <FactorDetailScreen
                factor={factor}
                fields={factorSections[factor]}
                retainedScore={factorRetainedScores[factor]}
                methodVersion={methodVersion}
              />
            ) : null}
          </ScrollView>
        ))}
      </ScrollView>

      {showFinish ? (
        <View
          pointerEvents="box-none"
          onLayout={(event) => setFinishRowHeight(event.nativeEvent.layout.height)}
          style={[styles.finishRow, { bottom: barBottom + BAR_HEIGHT + brandSpacing4.smd }]}
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
        </View>
      ) : null}

      <View pointerEvents="box-none" style={[styles.bar, { bottom: barBottom }]}>
        <FactorLetterStrip activeIndex={activeIndex} progress={progress} onSelect={scrollToIndex} />
        <Pressable
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
        </Pressable>
      </View>
    </View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    // D-19: the route's ScreenFrame already starts the pager below the transparent header (OA-20).
    header: {
      paddingTop: brandSpacing4.sm,
      paddingHorizontal: brandSpacing4.md,
      paddingBottom: brandSpacing4.smd,
      gap: brandSpacing4.smd,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
    },
    // The screen title role (Sora SemiBold 24 on 28): its line is shorter than the 36 pt total
    // pill, so the row keeps its height (D-05).
    title: {
      flex: 1,
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
    },
    // The running total is a small forest pill (variant I): forest gradient over its flat
    // fallback, white figures, a light hairline, no drop shadow. Same 36 pt height and padding.
    // The hairline is an inset ring, never a border on the gradient view (12.2-17, see ForestCard).
    totalChip: {
      height: TOTAL_CHIP_HEIGHT,
      borderRadius: brandRadius.pill,
      paddingHorizontal: brandSpacing4.smd,
      justifyContent: "center",
      backgroundColor: theme.visual.forest.fallback,
      experimental_backgroundImage: theme.visual.forest.image,
      boxShadow: theme.visual.forest.ring,
    },
    totalChipText: {
      fontSize: brandTypeScale.subhead.fontSize,
      lineHeight: 20,
      fontFamily: brandTypography.button.fontFamily,
      color: theme.visual.forest.title,
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
