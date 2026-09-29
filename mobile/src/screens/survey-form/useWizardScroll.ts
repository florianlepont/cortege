import { useCallback, useEffect, useRef, useState } from "react"
import { Keyboard, LayoutRectangle, Platform, useWindowDimensions } from "react-native"
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated"
import { useHeaderHeight } from "@react-navigation/elements"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandSpacing } from "../../app/brand-tokens"
import { useAppBottomTabBarHeight } from "../../app/useAppBottomTabBarHeight"
import type { WizardStep } from "./components"

export const COLLAPSED_HERO_HEIGHT = 84

// Scroll, keyboard and collapsing-hero behaviour of the survey wizard. The hero/step-rail
// interpolations themselves live in FormHeader/StepRail's own `useAnimatedStyle` (DS-07): this hook
// only owns the shared scroll position and the thresholds they interpolate against, so the actual
// per-frame math runs on the UI thread instead of being precomputed here on every render.
export function useWizardScroll(activeStep: WizardStep, setActiveStep: (step: WizardStep) => void) {
  const scrollRef = useRef<Animated.ScrollView | null>(null)
  const identityScrollBeforeFocusRef = useRef(0)
  const identitySectionLayoutRef = useRef({ y: 0, height: 0 })
  const scrollY = useSharedValue(0)
  const { height: viewportHeight } = useWindowDimensions()
  const tabBarHeight = useAppBottomTabBarHeight()
  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isIdentityInputFocused, setIsIdentityInputFocused] = useState(false)

  const scrollWizardTo = useCallback((y: number, animated = true): void => {
    scrollRef.current?.scrollTo?.({ y, animated })
  }, [])

  // OA-20: on iOS the header is transparent and the screen starts at y = 0, so the hero sits below
  // the full header height; the old "header minus the status bar, plus 42" offset left it 20 pt
  // under the header. Android keeps its offset (its header is opaque and the screen starts below).
  const heroTopOffset =
    Platform.OS === "ios"
      ? headerHeight + brandSpacing.sm
      : Math.max(headerHeight - insets.top, 0) + 42
  const expandedHeroHeight = Math.max(248, Math.min(292, Math.round(viewportHeight * 0.27)))
  const collapseDistance = expandedHeroHeight - COLLAPSED_HERO_HEIGHT
  const topSpacerHeight = heroTopOffset + expandedHeroHeight + brandSpacing.xs
  const minimumTabBarHeight = Platform.select({ ios: 84, default: 68 }) ?? 68
  const bottomActionClearance = Math.max(tabBarHeight, minimumTabBarHeight) + brandSpacing.xs
  const scrollContentBottomPadding =
    keyboardHeight > 0 ? keyboardHeight + 72 : bottomActionClearance
  const scrollIdentitySectionAboveKeyboard = useCallback(
    (keyboardFrameHeight = keyboardHeight): void => {
      const visibleTop = heroTopOffset + COLLAPSED_HERO_HEIGHT + brandSpacing.md
      const visibleBottom = viewportHeight - keyboardFrameHeight - brandSpacing.lg
      const { y, height } = identitySectionLayoutRef.current
      const targetY = Math.max(y - visibleTop, y + height - visibleBottom, 0)
      scrollWizardTo(targetY)
    },
    [heroTopOffset, keyboardHeight, scrollWizardTo, viewportHeight],
  )

  const identityEditing = isIdentityInputFocused || keyboardHeight > 0
  const preserveIdentityRailSpace = activeStep === "identity" && identityEditing

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const nextKeyboardHeight = event.endCoordinates.height
      setKeyboardHeight(nextKeyboardHeight)

      if (activeStep === "identity" && isIdentityInputFocused) {
        setTimeout(() => {
          scrollIdentitySectionAboveKeyboard(nextKeyboardHeight)
        }, 40)
      }
    })
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [activeStep, isIdentityInputFocused, scrollIdentitySectionAboveKeyboard])

  const openWizardStep = (nextStep: WizardStep): void => {
    const baseOffset =
      activeStep === "identity" && (keyboardHeight > 0 || isIdentityInputFocused)
        ? identityScrollBeforeFocusRef.current
        : scrollY.value
    const targetOffset =
      nextStep === "identity" || (activeStep === "parcels" && nextStep === "factors")
        ? 0
        : Math.max(baseOffset, collapseDistance)

    setIsIdentityInputFocused(false)
    Keyboard.dismiss()
    setActiveStep(nextStep)
    setTimeout(() => {
      scrollY.value = targetOffset
      scrollWizardTo(targetOffset, false)
    }, 0)
  }

  useEffect(() => {
    if (activeStep === "identity" && keyboardHeight === 0 && !isIdentityInputFocused) {
      scrollWizardTo(0)
    }
  }, [activeStep, keyboardHeight, isIdentityInputFocused, scrollWizardTo])

  const handleIdentityFocus = (): void => {
    identityScrollBeforeFocusRef.current = scrollY.value
    setIsIdentityInputFocused(true)
    setTimeout(() => {
      scrollIdentitySectionAboveKeyboard()
    }, 140)
  }

  const handleIdentityBlur = (): void => {
    setIsIdentityInputFocused(false)
  }

  const handleIdentityLayout = (layout: LayoutRectangle): void => {
    identitySectionLayoutRef.current = layout
  }

  const handleScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y
  })

  return {
    scrollRef,
    scrollY,
    collapseDistance,
    expandedHeroHeight,
    heroTopOffset,
    topSpacerHeight,
    scrollContentBottomPadding,
    preserveIdentityRailSpace,
    openWizardStep,
    handleIdentityFocus,
    handleIdentityBlur,
    handleIdentityLayout,
    handleScroll,
  }
}
