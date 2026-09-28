import { useEffect, useMemo, useRef, useState } from "react"
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import type { IbpMethodVersion } from "@cortege/ibp-domain"
import { brandColors, brandRadius, brandSpacing4 } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { FACTOR_TITLES } from "../../app/constants"
import type { FactorField, FactorKey, FactorRetainedScore } from "../../app/types"
import { fr } from "../../i18n"
import { FactorDetailScreen } from "../FactorDetailScreen"
import { FACTOR_ORDER } from "./components"
import { computeFactorProgress } from "./FactorsList"
import { findNextIncompleteFactorIndex } from "./factor-pager"

const t = fr.factorPager

type FactorPagerProps = {
  initialFactor: FactorKey
  factorSections: Record<FactorKey, FactorField[]>
  factorRetainedScores: Record<FactorKey, FactorRetainedScore | null>
  methodVersion: IbpMethodVersion | null
}

/**
 * FLOW-04: a horizontal pager A->J replacing the 20 round trips to the factor grid, with a fixed
 * footer control (prev/next, a position indicator, per-factor dots and a "next incomplete factor"
 * shortcut).
 */
export function FactorPager({
  initialFactor,
  factorSections,
  factorRetainedScores,
  methodVersion,
}: FactorPagerProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const scrollRef = useRef<ScrollView | null>(null)
  const [pageWidth, setPageWidth] = useState(0)
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

  const nextIncompleteIndex = findNextIncompleteFactorIndex(FACTOR_ORDER, progress, activeIndex)
  const hasNextIncomplete = nextIncompleteIndex !== null

  return (
    <View style={styles.container} onLayout={handleContainerLayout} testID="factor-pager">
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
            style={{ width: pageWidth || undefined }}
            contentContainerStyle={styles.pageContent}
          >
            {/* Only the active page mounts real content — ten factor screens' worth of hint state
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

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {FACTOR_ORDER.map((factor, index) => {
            const factorProgress = progress[factor]
            const state = factorProgress.complete
              ? "complete"
              : factorProgress.invalid > 0
                ? "error"
                : "empty"
            const tone = theme.fieldState[state]
            return (
              <Pressable
                key={factor}
                accessibilityRole="button"
                accessibilityLabel={t.jumpTo({ factor, title: FACTOR_TITLES[factor] })}
                accessibilityState={{ selected: index === activeIndex }}
                onPress={() => scrollToIndex(index)}
                style={styles.dotHit}
                testID={`pager-dot-${factor}`}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: tone.icon },
                    index === activeIndex ? styles.dotActive : null,
                  ]}
                />
              </Pressable>
            )
          })}
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.previous}
            disabled={activeIndex === 0}
            onPress={() => scrollToIndex(activeIndex - 1)}
            style={[styles.chevron, activeIndex === 0 ? styles.chevronDisabled : null]}
            testID="pager-previous"
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={activeIndex === 0 ? theme.colors.textSecondary : brandColors.forest}
            />
          </Pressable>

          <Text style={styles.positionText}>
            {t.position({ index: activeIndex + 1, total: FACTOR_ORDER.length })}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.next}
            disabled={activeIndex === lastIndex}
            onPress={() => scrollToIndex(activeIndex + 1)}
            style={[styles.chevron, activeIndex === lastIndex ? styles.chevronDisabled : null]}
            testID="pager-next"
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={activeIndex === lastIndex ? theme.colors.textSecondary : brandColors.forest}
            />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasNextIncomplete ? t.nextIncomplete : t.allComplete}
          disabled={!hasNextIncomplete}
          onPress={() => {
            if (nextIncompleteIndex !== null) scrollToIndex(nextIncompleteIndex)
          }}
          style={[
            styles.nextIncompleteButton,
            !hasNextIncomplete ? styles.nextIncompleteButtonDisabled : null,
          ]}
          testID="pager-next-incomplete"
        >
          <Ionicons
            name="arrow-forward-circle-outline"
            size={18}
            color={hasNextIncomplete ? brandColors.white : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.nextIncompleteText,
              !hasNextIncomplete ? styles.nextIncompleteTextDisabled : null,
            ]}
          >
            {hasNextIncomplete ? t.nextIncomplete : t.allComplete}
          </Text>
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
    pages: {
      flex: 1,
    },
    pageContent: {
      padding: brandSpacing4.md,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      paddingHorizontal: brandSpacing4.md,
      paddingTop: brandSpacing4.sm,
      paddingBottom: brandSpacing4.md,
      gap: brandSpacing4.sm,
    },
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: brandSpacing4.xs,
    },
    dotHit: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotActive: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    controlsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    chevron: {
      width: 44,
      height: 44,
      borderRadius: brandRadius.field,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
    chevronDisabled: {
      opacity: 0.5,
    },
    positionText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    nextIncompleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: brandSpacing4.xs,
      minHeight: 44,
      borderRadius: brandRadius.field,
      backgroundColor: brandColors.forest,
    },
    nextIncompleteButtonDisabled: {
      backgroundColor: theme.colors.panelMuted,
    },
    nextIncompleteText: {
      fontSize: 14,
      fontWeight: "700",
      color: brandColors.white,
    },
    nextIncompleteTextDisabled: {
      color: theme.colors.textSecondary,
    },
  })
}
