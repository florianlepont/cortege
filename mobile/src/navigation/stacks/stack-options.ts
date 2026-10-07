import { Platform } from "react-native"
import { BrandTheme } from "../../app/theme"

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
