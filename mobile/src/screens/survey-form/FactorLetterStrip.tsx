import { useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { brandColors, brandOverlayTokens, brandShadow, brandSpacing4 } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { FACTOR_TITLES } from "../../app/constants"
import { fr } from "../../i18n"
import { feedback } from "../../ui/feedback"
import { GlassSurface } from "../../ui/GlassSurface"
import { FACTOR_ORDER } from "./components"
import { letterIndexAt } from "./factor-pager"
import type { FactorProgress } from "./FactorsList"
import type { FactorKey } from "../../app/types"

const t = fr.factorPager

// OA-111: the A to J strip. The ten letters share a slim glass capsule, the current one in a filled
// pill; a finger laid on the strip and slid along it moves through the factors, like the index of
// the Contacts app.
export const STRIP_HEIGHT = 46
export const PILL_SIZE = 30
const STRIP_PADDING = 8
const BUBBLE_WIDTH = 200

type FactorLetterStripProps = {
  activeIndex: number
  progress: Record<FactorKey, FactorProgress>
  /** Go to a factor; `animated` is false while a finger slides (the page follows live). */
  onSelect: (index: number, animated: boolean) => void
}

export function FactorLetterStrip({ activeIndex, progress, onSelect }: FactorLetterStripProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  // The letter under the finger while sliding (null otherwise) and the strip's width, to turn a
  // touch position into a letter.
  const [scrubIndex, setScrubIndex] = useState<number | null>(null)
  const [stripWidth, setStripWidth] = useState(0)
  const lastIndex = FACTOR_ORDER.length - 1
  // The last factor reached, kept in a ref: several touch events can arrive before a re-render.
  const reachedIndex = useRef(activeIndex)
  useEffect(() => {
    reachedIndex.current = activeIndex
  }, [activeIndex])

  // A touch, or a slide, goes straight to the letter under the finger (the page follows live, no
  // animation) with a light tick for each factor crossed.
  const scrubTo = (x: number): void => {
    const index = letterIndexAt(x, stripWidth, FACTOR_ORDER.length)
    setScrubIndex(index)
    if (index === reachedIndex.current) return
    reachedIndex.current = index
    feedback.selection()
    onSelect(index, false)
  }

  // The bubble is centred on the letter under the finger, kept inside the strip's width.
  const bubbleLeft = (index: number): number => {
    const center = STRIP_PADDING + ((index + 0.5) * stripWidth) / FACTOR_ORDER.length
    return Math.max(
      0,
      Math.min(stripWidth + 2 * STRIP_PADDING - BUBBLE_WIDTH, center - BUBBLE_WIDTH / 2),
    )
  }

  const activeFactor = FACTOR_ORDER[activeIndex]

  return (
    <>
      {scrubIndex !== null ? (
        <View
          pointerEvents="none"
          style={[styles.bubbleWrap, { left: bubbleLeft(scrubIndex) }]}
          testID="pager-bubble"
        >
          <View style={styles.bubble}>
            <Text style={styles.bubbleLetter}>{FACTOR_ORDER[scrubIndex]}</Text>
            <Text style={styles.bubbleTitle} numberOfLines={2}>
              {FACTOR_TITLES[FACTOR_ORDER[scrubIndex]]}
            </Text>
          </View>
        </View>
      ) : null}
      <GlassSurface style={styles.strip}>
        {/* One touch target for the whole strip: its letters do not take touches, so a finger laid
         * anywhere on it, and slid along it, reports its position here. For VoiceOver it is one
         * adjustable control (swipe up or down to change factor). */}
        <View
          style={styles.row}
          onLayout={(event) => setStripWidth(event.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(event) => scrubTo(event.nativeEvent.locationX)}
          onResponderMove={(event) => scrubTo(event.nativeEvent.locationX)}
          onResponderRelease={() => setScrubIndex(null)}
          onResponderTerminate={() => setScrubIndex(null)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t.indexLabel}
          accessibilityValue={{
            text: t.indexValue({ factor: activeFactor, title: FACTOR_TITLES[activeFactor] }),
          }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(event) =>
            onSelect(
              Math.max(
                0,
                Math.min(
                  lastIndex,
                  activeIndex + (event.nativeEvent.actionName === "increment" ? 1 : -1),
                ),
              ),
              true,
            )
          }
          testID="pager-strip"
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
              <View
                key={factor}
                pointerEvents="none"
                style={[styles.cell, index === scrubIndex && styles.cellMagnified]}
                testID={`pager-letter-${factor}`}
              >
                {state === "active" ? <View style={styles.pill} /> : null}
                <Text style={[styles.letterText, styles[`letterText_${state}`]]}>{factor}</Text>
                {state === "complete" || state === "error" ? (
                  <View style={[styles.dot, styles[`dot_${state}`]]} />
                ) : null}
              </View>
            )
          })}
        </View>
      </GlassSurface>
    </>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    strip: {
      flex: 1,
      height: STRIP_HEIGHT,
      borderRadius: STRIP_HEIGHT / 2,
      paddingHorizontal: STRIP_PADDING,
      justifyContent: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      height: STRIP_HEIGHT,
    },
    cell: {
      flex: 1,
      height: STRIP_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },
    // The letter under the finger grows a little while sliding.
    cellMagnified: { transform: [{ scale: 1.3 }] },
    pill: {
      position: "absolute",
      width: PILL_SIZE,
      height: PILL_SIZE,
      borderRadius: PILL_SIZE / 2,
      // Variant I: the current letter is the inverted neutral pill of the chips.
      backgroundColor: theme.visual.chip.activeBg,
    },
    letterText: {
      fontSize: 14,
      fontFamily: "Sora-Bold",
    },
    letterText_active: { color: theme.visual.chip.activeText },
    letterText_complete: { color: theme.semanticColors.textStrong },
    letterText_error: { color: theme.onSurface.danger },
    letterText_empty: { color: theme.colors.textSecondary },
    dot: {
      position: "absolute",
      bottom: 6,
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    // D-16: the score green (darker moss in light, 3.6:1), not the brand moss.
    dot_complete: { backgroundColor: theme.visual.score.high },
    dot_error: { backgroundColor: theme.onSurface.danger },
    bubbleWrap: {
      position: "absolute",
      bottom: STRIP_HEIGHT + brandSpacing4.smd,
      width: BUBBLE_WIDTH,
      alignItems: "center",
    },
    bubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: brandOverlayTokens.factorStripBackground,
      ...brandShadow.card,
    },
    bubbleLetter: {
      fontSize: 30,
      lineHeight: 34,
      fontFamily: "Sora-Bold",
      color: brandColors.white,
    },
    bubbleTitle: {
      flexShrink: 1,
      maxWidth: 140,
      fontSize: 14,
      lineHeight: 18,
      color: brandColors.white,
    },
  })
}
