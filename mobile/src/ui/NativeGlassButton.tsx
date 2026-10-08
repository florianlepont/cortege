import type { NativeGlassButtonProps } from "./NativeGlassButton.types"

/**
 * Android (and any platform without SwiftUI) half of the native glass button split (D-28). Metro
 * picks `NativeGlassButton.ios.tsx` on iOS; everywhere else it picks this file, which never imports
 * `@expo/ui/swift-ui`, so the SwiftUI side is never bundled for Android (its native module is also
 * kept out of the Android build by `expo.autolinking.android.exclude` in `package.json`).
 * `GlassButton` then draws its flat translucent fallback.
 */
export const NATIVE_GLASS_BUTTON_AVAILABLE = false

export function NativeGlassButton(_props: NativeGlassButtonProps): null {
  return null
}
