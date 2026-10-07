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
 * `ScreenFrame` in its route; a screen that does not draw the halo yet opts out with
 * `pageColourHeader`.
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
 * The opaque page-colour header of a screen that does not draw the backdrop halo (OA-94, OA-125):
 * the header takes the page colour, so it does not read as a band of another colour above the
 * content, and the content scrolling under it is hidden. On iOS the header stays laid out over the
 * screen (the screen insets itself by `useHeaderHeight()`); on Android it is in the layout flow.
 * Left for the survey form screens until their plans give them the halo (12.2-15, 12.2-16).
 */
export function pageColourHeader(theme: BrandTheme) {
  return Platform.OS === "ios"
    ? {
        headerBlurEffect: "none" as const,
        headerStyle: { backgroundColor: theme.colors.canvas },
      }
    : {
        headerTransparent: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.canvas },
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
