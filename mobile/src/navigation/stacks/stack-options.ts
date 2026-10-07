import { Platform } from "react-native"
import { BrandTheme } from "../../app/theme"

/** Screen options shared by every stack navigator. Call with the caller's `useBrandTheme()` value. */
export function createBaseStackScreenOptions(theme: BrandTheme) {
  return {
    headerBackButtonDisplayMode: "minimal" as const,
    contentStyle: { backgroundColor: theme.colors.canvas },
    ...(Platform.OS === "ios"
      ? {
          headerTransparent: true,
          headerBlurEffect: "systemMaterial" as const,
        }
      : {
          headerStyle: { backgroundColor: theme.colors.canvas },
          headerShadowVisible: false,
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
 * OA-94, OA-125: on iOS the header takes the page colour (no blur tint), so it does not read as a
 * band of another colour above the content. Compte, Paramètres and the other pushed pages share it.
 */
export function pageColourHeader(theme: BrandTheme) {
  return Platform.OS === "ios"
    ? {
        headerBlurEffect: "none" as const,
        headerStyle: { backgroundColor: theme.colors.canvas },
      }
    : {}
}

/**
 * 12.2-10: the native iOS header of a screen that draws the backdrop halo (`ScreenBackdrop`, Accueil
 * only). It is transparent, with no blur, tint or shadow, so the halo runs on behind it and there is
 * no seam where an opaque canvas band used to cut it (owner check on the iPhone). The screen insets
 * its content by `useHeaderHeight()`, so nothing scrolls under the title. Pages without a halo keep
 * `pageColourHeader`, where a transparent header would let their content slide under the title.
 */
export const backdropHeader = {
  headerTransparent: true,
  headerBlurEffect: "none" as const,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: "transparent" },
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
