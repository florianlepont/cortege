import { useEffect, useMemo, useRef, useState } from "react"
import {
  AccessibilityInfo,
  Animated,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandFontScaleCaps, brandSpacing, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { GlassButton } from "../ui/GlassButton"
import { AppText as Text } from "../ui/AppText"
import { BrandHighlight } from "../ui/BrandHighlight"
import { ConfettiBurst } from "../ui/ConfettiBurst"
import { feedback } from "../ui/feedback"

const t = fr.welcome

type Critter = {
  source: ImageSourcePropType
  width: number
  height: number
  top?: `${number}%`
  bottom?: `${number}%`
  left?: `${number}%`
  right?: `${number}%`
  delayMs: number
}

// Source ratios kept (1528x1358, 1754x1392, 1735x1397, 944x826).
const CRITTERS: Critter[] = [
  {
    source: require("../../assets/animals/MESANGE.png"),
    width: 92,
    height: 82,
    top: "9%",
    left: "6%",
    delayMs: 250,
  },
  {
    source: require("../../assets/animals/SITELLE.png"),
    width: 96,
    height: 76,
    top: "7%",
    right: "5%",
    delayMs: 450,
  },
  {
    source: require("../../assets/animals/ROSALIE.png"),
    width: 64,
    height: 52,
    top: "24%",
    right: "12%",
    delayMs: 650,
  },
  {
    source: require("../../assets/animals/GRENOUILLE.png"),
    width: 84,
    height: 74,
    bottom: "17%",
    left: "5%",
    delayMs: 850,
  },
]

type WelcomeScreenProps = {
  name: string
  onContinue: () => void
}

/**
 * OA-08: the welcome after the profile is created. The marten peeks up from the bottom, four
 * forest animals pop in one after another and confetti falls once. With "Reduce Motion" on, the
 * animals are simply there and nothing falls.
 */
export function WelcomeScreen({ name, onContinue }: WelcomeScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [reducedMotion, setReducedMotion] = useState(false)
  const pop = useRef(CRITTERS.map(() => new Animated.Value(0))).current

  useEffect(() => {
    feedback.notify.success()
    let cancelled = false
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return
      setReducedMotion(enabled)
      if (enabled) {
        pop.forEach((value) => value.setValue(1))
        return
      }
      Animated.parallel(
        pop.map((value, index) =>
          Animated.spring(value, {
            toValue: 1,
            delay: CRITTERS[index].delayMs,
            friction: 5,
            tension: 90,
            useNativeDriver: true,
          }),
        ),
      ).start()
    })
    return () => {
      cancelled = true
    }
  }, [pop])

  const title = name ? t.title({ name }) : t.titleNoName

  return (
    <View style={styles.screen}>
      {CRITTERS.map((critter, index) => (
        <Animated.Image
          key={index}
          source={critter.source}
          resizeMode="contain"
          accessible={false}
          style={{
            position: "absolute",
            width: critter.width,
            height: critter.height,
            top: critter.top,
            bottom: critter.bottom,
            left: critter.left,
            right: critter.right,
            opacity: pop[index],
            transform: [{ scale: pop[index] }],
          }}
        />
      ))}

      <View style={[styles.content, { paddingTop: insets.top + brandSpacing.xl }]}>
        <BrandHighlight color={theme.colors.sage} textColor={theme.colors.forest}>
          {t.eyebrow}
        </BrandHighlight>
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={brandFontScaleCaps.title}
        >
          {title}
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={brandFontScaleCaps.body}>
          {t.body}
        </Text>
      </View>

      <Image
        source={require("../../assets/animals/MARTE.png")}
        resizeMode="contain"
        accessible={false}
        style={[styles.marten, { right: Math.max(width * 0.08, brandSpacing.lg) }]}
      />

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, brandSpacing.lg) }]}>
        <GlassButton label={t.start} size="lg" onPress={onContinue} />
      </View>

      {reducedMotion ? null : <ConfettiBurst />}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
      overflow: "hidden",
    },
    content: {
      flex: 1,
      paddingHorizontal: brandSpacing.xl,
      justifyContent: "center",
      gap: brandSpacing.md,
    },
    title: {
      ...brandTypography.sectionTitle,
      color: theme.semanticColors.textStrong,
    },
    body: {
      ...brandTypography.heroBody,
      color: theme.colors.textSecondary,
    },
    // 967 x 2289 source: only the head, the collar and the shoulders show above the button.
    marten: {
      position: "absolute",
      bottom: 60,
      width: 120,
      height: 284,
    },
    bottomBar: {
      paddingHorizontal: brandSpacing.lg,
      paddingTop: brandSpacing.md,
    },
  })
}
