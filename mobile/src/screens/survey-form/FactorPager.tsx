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
import { brandColors, brandShadow, brandSpacing4 } from "../../app/brand-tokens"
import { computeIbpTotalsFromRetainedScores } from "../../app/ibp-scoring"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { FACTOR_TITLES } from "../../app/constants"
import type { FactorField, FactorKey, FactorRetainedScore } from "../../app/types"
import { fr } from "../../i18n"
import { FactorDetailScreen } from "../FactorDetailScreen"
import { FACTOR_ORDER } from "./components"
import { computeFactorProgress } from "./FactorsList"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { Ionicons } from "@expo/vector-icons"
import { GlassSurface } from "../../ui/GlassSurface"
import { useHeaderHeight } from "@react-navigation/elements"

const t = fr.factorPager

// The bottom bar: lettered pills in a glass capsule and a round "next" button beside it.
const LETTER_SIZE = 38
const LETTER_GAP = 6
const BAR_HEIGHT = 60

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
 * and a floating bottom bar in Liquid Glass: the A to J letters (each shows its factor's state and
 * jumps to it, the active one stays in view) and a round button for the next factor ("Terminer" on
 * the last). Going back is a tap on a letter or a swipe.
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
  const lettersRef = useRef<ScrollView | null>(null)
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

  const scrollToIndex = (index: number): void => {
    const clamped = Math.max(0, Math.min(lastIndex, index))
    if (pageWidth > 0) {
      scrollRef.current?.scrollTo({ x: clamped * pageWidth, animated: true })
    }
    setActiveIndex(clamped)
  }

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (pageWidth <= 0) return
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth)
    setActiveIndex(Math.max(0, Math.min(lastIndex, index)))
  }

  const activeFactor = FACTOR_ORDER[activeIndex]
  useEffect(() => {
    onActiveFactorChange?.(activeFactor)
  }, [activeFactor, onActiveFactorChange])
  // Keep the active letter in view in the bar (it scrolls: ten pills do not fit next to the button).
  useEffect(() => {
    lettersRef.current?.scrollTo({
      x: Math.max(0, activeIndex * (LETTER_SIZE + LETTER_GAP) - 2 * (LETTER_SIZE + LETTER_GAP)),
      animated: true,
    })
  }, [activeIndex])
  const total = useMemo(
    () => computeIbpTotalsFromRetainedScores(factorRetainedScores).ibp_total,
    [factorRetainedScores],
  )
  const isLast = activeIndex === lastIndex

  return (
    <View style={styles.container} onLayout={handleContainerLayout} testID="factor-pager">
      <View style={[styles.header, { paddingTop: headerHeight + brandSpacing4.sm }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
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
        <GlassSurface style={styles.letterBar}>
          <ScrollView
            ref={lettersRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.letterContent}
          >
            {FACTOR_ORDER.map((factor, index) => {
              const factorProgress = progress[factor]
              const state =
                index === activeIndex
                  ? "active"
                  : factorProgress.complete
                    ? "complete"
                    : factorProgress.invalid > 0
                      ? "error"
                      : "empty"
              return (
                <Pressable
                  key={factor}
                  accessibilityRole="button"
                  accessibilityLabel={t.jumpTo({ factor, title: FACTOR_TITLES[factor] })}
                  accessibilityState={{ selected: index === activeIndex }}
                  onPress={() => scrollToIndex(index)}
                  hitSlop={{ top: 5, bottom: 5, left: 1, right: 1 }}
                  style={[styles.letter, styles[`letter_${state}`]]}
                  testID={`pager-letter-${factor}`}
                >
                  <Text style={[styles.letterText, styles[`letterText_${state}`]]}>{factor}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </GlassSurface>
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
  const letter = {
    width: LETTER_SIZE,
    height: LETTER_SIZE,
    borderRadius: LETTER_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  } as const
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
    title: {
      flex: 1,
      fontSize: 20,
      lineHeight: 24,
      fontFamily: "Sora_700Bold",
      color: theme.semanticColors.textStrong,
    },
    totalChip: {
      height: 36,
      borderRadius: 18,
      paddingHorizontal: 12,
      justifyContent: "center",
      backgroundColor: theme.semanticColors.heroSurface,
      borderWidth: 1,
      borderColor: theme.semanticColors.heroBorder,
    },
    totalChipText: {
      fontSize: 15,
      fontWeight: "700",
      color: brandColors.white,
    },
    letter,
    letter_active: { backgroundColor: theme.semanticColors.ctaPrimary },
    letter_complete: { backgroundColor: theme.colors.successSoft },
    letter_error: { backgroundColor: theme.colors.errorSoft },
    letter_empty: {
      backgroundColor: theme.semanticColors.surfaceElevated,
      borderWidth: 1.5,
      borderColor: theme.colors.divider,
    },
    letterText: {
      fontSize: 14,
      fontFamily: "Sora_700Bold",
    },
    letterText_active: { color: theme.semanticColors.onCtaPrimary },
    letterText_complete: { color: theme.semanticColors.textStrong },
    letterText_error: { color: theme.onSurface.danger },
    letterText_empty: { color: theme.colors.textSecondary },
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
    letterBar: {
      flex: 1,
      height: BAR_HEIGHT,
      borderRadius: BAR_HEIGHT / 2,
      justifyContent: "center",
    },
    letterContent: {
      alignItems: "center",
      gap: LETTER_GAP,
      paddingHorizontal: 10,
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
