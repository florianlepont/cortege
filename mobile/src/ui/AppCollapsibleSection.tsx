import { ReactNode, useMemo, useState } from "react"
import { StyleSheet } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import {
  brandMotion,
  brandRadius,
  brandSpacing,
  brandSpacing4,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppChoiceChip } from "./AppChoiceChip"
import { AppPressable } from "./AppPressable"

type AppCollapsibleSectionProps = {
  title: string
  badge?: string
  defaultExpanded?: boolean
  /** Phase 32: a test handle on the header, and a label that replaces the default toggle label. */
  testID?: string
  accessibilityLabel?: string
  /**
   * `"boxed"` (default, Settings): a bordered box, an uppercase meta title, a status chip and a
   * down chevron. `"grouped"` (phase 32, redesign A-C2): an iOS grouped-list section header with no
   * chrome, a sentence-case title, the count as plain text and a disclosure chevron that turns a
   * quarter turn when open; the body is the caller's `AppGroupedContainer`.
   */
  variant?: "boxed" | "grouped"
  children: ReactNode
}

const GROUPED_HEADER_MIN_HEIGHT = 44
const GROUPED_CHEVRON_OPEN_DEG = 90

export function AppCollapsibleSection({
  title,
  badge,
  defaultExpanded = false,
  testID,
  accessibilityLabel,
  variant = "boxed",
  children,
}: AppCollapsibleSectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const grouped = variant === "grouped"
  const openDegrees = grouped ? GROUPED_CHEVRON_OPEN_DEG : 180
  const [expanded, setExpanded] = useState(defaultExpanded)
  const chevronRotation = useSharedValue(defaultExpanded ? openDegrees : 0)

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev
      chevronRotation.value = withTiming(next ? openDegrees : 0, {
        duration: brandMotion.durations.base,
        reduceMotion: ReduceMotion.System,
      })
      return next
    })
  }

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }))

  return (
    <Animated.View
      style={grouped ? styles.rootGrouped : styles.root}
      layout={LinearTransition.reduceMotion(ReduceMotion.System)}
    >
      <AppPressable
        disableScale
        disableRipple
        style={({ pressed }) => [
          grouped ? styles.headerGrouped : styles.header,
          pressed && styles.headerPressed,
        ]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          accessibilityLabel ?? fr.components.collapsibleSection.toggleLabel({ title, expanded })
        }
        testID={testID}
      >
        <Text style={grouped ? styles.titleGrouped : styles.title}>{title}</Text>
        {badge && grouped ? <Text style={styles.badgeGrouped}>{badge}</Text> : null}
        {badge && !grouped ? <AppChoiceChip variant="status" label={badge} tone="neutral" /> : null}
        <Animated.View style={chevronStyle}>
          <Ionicons
            name={grouped ? "chevron-forward-outline" : "chevron-down-outline"}
            size={grouped ? 16 : 14}
            color={theme.colors.textSecondary}
            accessible={false}
          />
        </Animated.View>
      </AppPressable>
      {expanded ? (
        <Animated.View
          style={grouped ? undefined : styles.body}
          entering={FadeIn.duration(brandMotion.durations.base).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
        >
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    root: {
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing.xs,
      paddingHorizontal: brandSpacing.md,
      paddingVertical: brandSpacing.sm + 2,
    },
    headerPressed: {
      opacity: 0.6,
    },
    title: {
      flex: 1,
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    body: {
      padding: brandSpacing.md,
      gap: brandSpacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    // Grouped variant: no border and no clipping, the header sits outside the container.
    rootGrouped: {
      gap: brandSpacing4.sm,
    },
    headerGrouped: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      minHeight: GROUPED_HEADER_MIN_HEIGHT,
      paddingHorizontal: brandSpacing4.xs,
    },
    titleGrouped: {
      flex: 1,
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
    },
    badgeGrouped: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
