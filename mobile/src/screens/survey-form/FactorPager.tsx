import { useEffect, useMemo, useRef, useState } from "react"
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
import { brandRadius, brandShadow, brandSpacing4, brandTypography } from "../../app/brand-tokens"
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
import { Ionicons } from "@expo/vector-icons"
import { useHeaderHeight } from "@react-navigation/elements"

const t = fr.factorPager

// The bottom bar: the A to J strip (FactorLetterStrip) and a round "next" button beside it. Field
// sizes (D-05): the bar and the round button stay 46 pt, the total pill 36 pt.
export const BAR_HEIGHT = STRIP_HEIGHT
export const TOTAL_CHIP_HEIGHT = 36

type FactorPagerProps = {
  initialFactor: FactorKey
  factorSections: Record<FactorKey, FactorField[]>
  factorRetainedScores: Record<FactorKey, FactorRetainedScore | null>
  methodVersion: IbpMethodVersion | null
  /** The factor now on screen: the route puts its name in the native header. */
  onActiveFactorChange?: (factor: FactorKey) => void
  /** "Terminer" on the last factor: back to the list. */
  onFinish: () => void
}

/**
 * FLOW-04: a horizontal pager A->J replacing the 20 round trips to the factor grid. OA-98: a slim
 * title row (the factor's name and the running total) under the transparent native header, the page,
 * and a floating bottom bar in Liquid Glass: the A to J letters (each shows its factor's state; a tap
 * or a slide of the finger along the strip goes to a factor, a bubble names it) and a round button
 * for the next factor ("Terminer" on the last). Going back is a letter or a swipe.
 */
export function FactorPager({
  initialFactor,
  factorSections,
  factorRetainedScores,
  methodVersion,
  onActiveFactorChange,
  onFinish,
}: FactorPagerProps) {
  const theme = useBrandTheme()
  const tabBarClearance = useTabBarClearance()
  // The iOS header is transparent: the pager's own header starts below it (OA-20).
  const headerHeight = useHeaderHeight()
  const styles = useMemo(() => createStyles(theme), [theme])
  const scrollRef = useRef<ScrollView | null>(null)
  const [pageWidth, setPageWidth] = useState(0)
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
  return (
    <View style={styles.container} onLayout={handleContainerLayout} testID="factor-pager">
      <View style={[styles.header, { paddingTop: headerHeight + brandSpacing4.sm }]}>
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
            contentContainerStyle={[
              styles.pageContent,
              { paddingBottom: tabBarClearance + BAR_HEIGHT + 2 * brandSpacing4.md },
            ]}
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

      <View
        pointerEvents="box-none"
        style={[styles.bar, { bottom: tabBarClearance + brandSpacing4.sm }]}
      >
        <FactorLetterStrip activeIndex={activeIndex} progress={progress} onSelect={scrollToIndex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLast ? t.finish : t.next}
          onPress={() => (isLast ? onFinish() : scrollToIndex(activeIndex + 1))}
          style={styles.nextButton}
          testID="pager-next"
        >
          <Ionicons
            name={isLast ? "checkmark" : "arrow-forward"}
            size={26}
            color={theme.semanticColors.onCtaPrimary}
          />
        </Pressable>
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
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
    // fallback, white figures, a light hairline, no shadow. Same 36 pt height and padding.
    totalChip: {
      height: TOTAL_CHIP_HEIGHT,
      borderRadius: brandRadius.pill,
      paddingHorizontal: brandSpacing4.smd,
      justifyContent: "center",
      backgroundColor: theme.visual.forest.fallback,
      experimental_backgroundImage: theme.visual.forest.image,
      borderWidth: 1,
      borderColor: theme.visual.forest.hairline,
    },
    totalChipText: {
      fontSize: 15,
      lineHeight: 20,
      fontFamily: "Sora-Bold",
      color: theme.visual.forest.title,
    },
    pages: {
      flex: 1,
    },
    pageContent: {
      padding: brandSpacing4.md,
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
