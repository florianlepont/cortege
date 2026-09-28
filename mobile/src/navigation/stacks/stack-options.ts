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
