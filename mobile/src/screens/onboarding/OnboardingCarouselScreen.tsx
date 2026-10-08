import { useMemo, useRef, useState } from "react"
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  brandColors,
  brandFontScaleCaps,
  brandSpacing,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { GlassButton } from "../../ui/GlassButton"
import { BrandHighlight } from "../../ui/BrandHighlight"

const t = fr.onboarding.carousel

type OnboardingCarouselScreenProps = {
  onSkip: () => void
  onFinish: () => void
}

/**
 * ONB-01: the three-screen carousel (ten factors · offline · member map) shown before login on
 * first launch. Paging is button-driven (Suivant/Commencer) for deterministic testing and full
 * accessibility; the ScrollView still pages on a swipe (`onMomentumScrollEnd` keeps the dots and
 * button label in sync with the gesture).
 */
export function OnboardingCarouselScreen({ onSkip, onFinish }: OnboardingCarouselScreenProps) {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const scrollRef = useRef<ScrollView | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const slides = t.slides
  const isLastSlide = activeIndex === slides.length - 1

  const goToIndex = (index: number): void => {
    setActiveIndex(index)
    scrollRef.current?.scrollTo({ x: index * width, animated: true })
  }

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const index = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1))
    setActiveIndex(Math.max(0, Math.min(index, slides.length - 1)))
  }

  const handlePrimaryPress = (): void => {
    if (isLastSlide) {
      onFinish()
      return
    }
    goToIndex(activeIndex + 1)
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex ? styles.dotActive : null]}
            />
          ))}
        </View>
        <AppButton
          label={t.skip}
          variant="secondary"
          size="sm"
          onPress={onSkip}
          accessibilityLabel={t.skip}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => (
          <View
            key={slide.eyebrow}
            style={[styles.slide, { width }]}
            accessibilityLabel={t.progressLabel({ index: index + 1, count: slides.length })}
          >
            <View style={styles.slideHero}>
              <BrandHighlight color={brandColors.sage} textColor={brandColors.forest}>
                {slide.eyebrow}
              </BrandHighlight>
              <Text style={styles.slideTitle} maxFontSizeMultiplier={brandFontScaleCaps.title}>
                {slide.title}
              </Text>
              <Text style={styles.slideBody} maxFontSizeMultiplier={brandFontScaleCaps.body}>
                {slide.body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* OA-01: the marten, the app's emblem, looks in from the left edge, tilted. It belongs to the
        screen, not to a slide, so it stays put while the slides swipe past. Decoration only, and it
        takes no touch. */}
      <View pointerEvents="none" style={styles.marten} testID="onboarding-marten">
        <Image
          source={require("../../../assets/animals/MARTE.png")}
          style={styles.martenImage}
          resizeMode="contain"
          accessible={false}
        />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, brandSpacing.lg) }]}>
        <GlassButton
          label={isLastSlide ? t.start : t.next}
          size="lg"
          onPress={handlePrimaryPress}
          style={styles.primaryButton}
        />
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: brandSpacing.lg,
      paddingTop: brandSpacing.md,
    },
    dots: {
      flexDirection: "row",
      gap: brandSpacing.xs,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.divider,
    },
    dotActive: {
      backgroundColor: theme.semanticColors.ctaPrimary,
      width: 18,
    },
    slide: {
      paddingHorizontal: brandSpacing.xl,
      paddingTop: brandSpacing.xl,
      justifyContent: "center",
    },
    slideHero: {
      gap: brandSpacing.md,
    },
    slideTitle: {
      ...brandTypography.sectionTitle,
      color: theme.semanticColors.textStrong,
    },
    slideBody: {
      ...brandTypography.heroBody,
      color: theme.colors.textSecondary,
    },
    // 967 x 2289 source, tilted 50 degrees about its centre: the head lands near (100, 640) on an
    // 852 pt tall phone, in the free band between the text (which ends near 550) and the button
    // (which starts near 767), and the body runs off the left edge.
    marten: {
      position: "absolute",
      left: -23,
      bottom: 36,
      width: 96,
      height: 227,
      transform: [{ rotate: "50deg" }],
    },
    martenImage: {
      width: "100%",
      height: "100%",
    },
    bottomBar: {
      paddingHorizontal: brandSpacing.lg,
      paddingTop: brandSpacing.md,
    },
    primaryButton: {
      width: "100%",
    },
  })
}
