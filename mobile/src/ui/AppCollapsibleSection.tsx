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
import { brandMotion, brandRadius, brandSpacing, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppStatusChip } from "./AppStatusChip"
import { AppPressable } from "./AppPressable"

type AppCollapsibleSectionProps = {
  title: string
  badge?: string
  defaultExpanded?: boolean
  children: ReactNode
}

export function AppCollapsibleSection({
  title,
  badge,
  defaultExpanded = false,
  children,
}: AppCollapsibleSectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [expanded, setExpanded] = useState(defaultExpanded)
  const chevronRotation = useSharedValue(defaultExpanded ? 180 : 0)

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev
      chevronRotation.value = withTiming(next ? 180 : 0, {
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
    <Animated.View style={styles.root} layout={LinearTransition.reduceMotion(ReduceMotion.System)}>
      <AppPressable
        disableScale
        disableRipple
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={fr.components.collapsibleSection.toggleLabel({ title, expanded })}
      >
        <Text style={styles.title}>{title}</Text>
        {badge ? <AppStatusChip label={badge} tone="neutral" /> : null}
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down-outline" size={14} color={theme.colors.textSecondary} />
        </Animated.View>
      </AppPressable>
      {expanded ? (
        <Animated.View
          style={styles.body}
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
  })
}
