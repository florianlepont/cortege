import { useEffect, useMemo } from "react"
import { Image, StyleSheet } from "react-native"
import Animated, {
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { AppText as Text } from "../../ui/AppText"
import { brandMotion, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { ENTRANCE_REWIND_DELAY_MS } from "../../ui/useFocusEntrance"
import { useScreenVisible } from "../../ui/useScreenVisible"

const t = fr.surveyList

// Starting scale of the illustration before its one-shot spring to 1 (UI-SPEC motion contract).
const START_SCALE = 0.9

/**
 * The empty Mes Relevés card (12.2-11): a glass card whose illustration fades in and springs up
 * when the screen becomes visible (focused, no sign-in or splash overlay above it), not when it
 * mounts: the screen mounts at launch, so a mount-time animation had ended before anyone saw it.
 * It plays again on each return to the screen, like the Accueil sections (`useFocusEntrance`), and
 * never loops. Under Reduce Motion it is drawn at its final state and nothing starts.
 */
export function ListEmptyState() {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const reduced = useReducedMotion()
  const visible = useScreenVisible()
  const opacity = useSharedValue(reduced ? 1 : 0)
  const scale = useSharedValue(reduced ? 1 : START_SCALE)

  useEffect(() => {
    if (reduced) {
      cancelAnimation(opacity)
      cancelAnimation(scale)
      opacity.value = 1
      scale.value = 1
      return
    }
    if (!visible) {
      // Back to hidden once the screen has slid away, ready for the next visit.
      opacity.value = withDelay(
        ENTRANCE_REWIND_DELAY_MS,
        withTiming(0, { duration: 0, reduceMotion: ReduceMotion.System }),
      )
      scale.value = withDelay(
        ENTRANCE_REWIND_DELAY_MS,
        withTiming(START_SCALE, { duration: 0, reduceMotion: ReduceMotion.System }),
      )
      return
    }
    opacity.value = 0
    scale.value = START_SCALE
    opacity.value = withTiming(1, {
      duration: brandMotion.durations.base,
      reduceMotion: ReduceMotion.System,
    })
    scale.value = withSpring(1, {
      ...brandMotion.springs.snappy,
      reduceMotion: ReduceMotion.System,
    })
  }, [opacity, reduced, scale, visible])

  const illustrationStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  // P2-PERSON-04: marten illustration + warm copy
  return (
    <AppCard variant="glass" padding={brandSpacing4.lg} style={styles.emptyState}>
      <Animated.View style={illustrationStyle}>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require("../../../assets/auth/marten.png")}
          style={styles.emptyStateMarten}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.emptyStateTitle}>{t.empty.none.title}</Text>
      <Text style={styles.emptyStateBody}>{t.empty.none.body}</Text>
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    emptyState: {
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    // P2-PERSON-04: marten illustration
    emptyStateMarten: {
      width: 110,
      height: 110,
      marginBottom: brandSpacing4.xs,
    },
    emptyStateTitle: {
      ...brandTypography.input,
      lineHeight: 22,
      color: theme.semanticColors.textStrong,
    },
    emptyStateBody: {
      ...brandTypeScale.callout,
      lineHeight: 24,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
  })
}
