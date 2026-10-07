import { Platform } from "react-native"
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack"
import { brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"
import { usesNativeLargeTitle } from "../large-title"

/**
 * D-19 (first on Accueil in 12.2-10): the header of a screen that shows the backdrop halo. It is
 * transparent, with no blur, tint or shadow, on every platform, so the halo runs on behind it and
 * there is no band of another colour at the top. Its pair is `ScreenFrame` (`ui/ScreenFrame.tsx`),
 * which the route wraps around its screen: the frame draws the halo and pushes the content below
 * the header (`useHeaderHeight()`), so nothing slides under the title (OA-94).
 */
export const backdropHeader = {
  headerTransparent: true,
  headerBlurEffect: "none" as const,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: "transparent" },
}

/**
 * Screen options shared by every stack navigator. Call with the caller's `useBrandTheme()` value.
 * The header is `backdropHeader` by default (D-19), so a new screen with a header needs a
 * `ScreenFrame` in its route. Every stack screen with a header draws it since 12.2-15 (the
 * factor pager was the last opt-out); the full-screen parcel map sets its own header.
 */
export function createBaseStackScreenOptions(theme: BrandTheme) {
  return {
    headerBackButtonDisplayMode: "minimal" as const,
    contentStyle: { backgroundColor: theme.colors.canvas },
    ...backdropHeader,
    ...(Platform.OS === "ios"
      ? {}
      : {
          headerTintColor: theme.colors.forest,
          headerTitleStyle: {
            color: theme.colors.forest,
            fontSize: 18,
            fontWeight: "800" as const,
          },
        }),
  }
}

/**
 * OA-21: the screen draws its own title, so the native one is hidden. `headerTitle: () => null` is
 * not enough on iOS (the native title is still drawn from `title`, OA-109, doubled "Compte"), so it
 * is made invisible too. `title` stays for the back button and accessibility.
 */
export const hiddenNativeTitle = {
  headerTitle: () => null,
  headerTitleStyle: { color: "transparent" },
} as const

/** iOS 26 and later draw the scroll edge effect under the bar themselves (Liquid Glass). */
function hasSystemScrollEdgeEffect(): boolean {
  return Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26
}

/**
 * 12.2-17 (owner: "quand je scroll, le titre disparaît"): the native iOS large title. The title sits
 * large under the bar while the page is at its top and shrinks into the small centred title of the
 * bar as the page scrolls, the system behaviour (`UINavigationBar` large title). Kept on top of
 * `backdropHeader`, so the halo stays continuous behind the bar:
 *
 * - the large title state is fully transparent (`headerLargeStyle`, no shadow);
 * - on iOS 26 and later the bar keeps no blur: the system's scroll edge effect fades the content
 *   that passes under it. Before iOS 26 the collapsed bar gets the system material, the classic
 *   look, so the small title never sits on bare content;
 * - Sora SemiBold in the theme's strong text colour (per scheme), for both titles. The weight is
 *   given with the family: native-stack adds the system weight 700 to the large title, and iOS
 *   resolves a font name plus a weight inside its family, which would pick Sora Bold.
 *
 * Its pair is `<ScreenFrame largeTitle>` in the route, which leaves the insets to the system (the
 * page's first scroll view uses `contentInsetAdjustmentBehavior="automatic"`).
 */
export function nativeLargeTitle(theme: BrandTheme): NativeStackNavigationOptions {
  const color = theme.semanticColors.textStrong
  return {
    headerLargeTitleEnabled: true,
    headerLargeTitleShadowVisible: false,
    headerLargeStyle: { backgroundColor: "transparent" },
    headerLargeTitleStyle: { ...brandTypography.navLargeTitle, fontWeight: "600", color },
    headerTitleStyle: { ...brandTypography.navTitle, fontWeight: "600", color },
    headerBlurEffect: hasSystemScrollEdgeEffect() ? "none" : "systemChromeMaterial",
  }
}

/**
 * The title options of a page that has a title of its own: the native large title in the native
 * iOS tab tree (`usesNativeLargeTitle`), otherwise the page draws its title and the native one is
 * hidden (OA-21, unchanged on Android and in Expo Go).
 */
export function pageTitleOptions(theme: BrandTheme): NativeStackNavigationOptions {
  return usesNativeLargeTitle() ? nativeLargeTitle(theme) : hiddenNativeTitle
}
