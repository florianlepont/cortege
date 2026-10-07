import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { useHeaderHeight } from "@react-navigation/elements"
import { useBrandTheme } from "../app/theme"
import { ScreenBackdrop } from "./ScreenBackdrop"

/**
 * D-19: the frame of a stack screen that shows the backdrop halo under a transparent header
 * (`backdropHeader` in `navigation/stacks/stack-options.ts`). The route component wraps its
 * screen in it, so the screen itself knows nothing about the header:
 *
 * - the page colour, then `ScreenBackdrop` as an absolute fill: it runs on behind the transparent
 *   header too, so there is no band of another colour at the top;
 * - the content is pushed down by the header height (`useHeaderHeight()`, 0 when the stack hides
 *   its header), so a scroll view starts below the title and is clipped there: nothing slides
 *   under the title (OA-94) and a pull-to-refresh spinner opens below it, as on Accueil.
 *
 * The screen inside draws no background of its own on its root and scroll views (the frame is the
 * page), and does not add the header height again. One frame per screen, no animation, no blur.
 */
export function ScreenFrame({
  children,
  testID = "screen-frame",
}: {
  children: ReactNode
  testID?: string
}) {
  const theme = useBrandTheme()
  const headerHeight = useHeaderHeight()
  return (
    <View
      style={[styles.frame, { backgroundColor: theme.colors.canvas, paddingTop: headerHeight }]}
      testID={testID}
    >
      <ScreenBackdrop testID={`${testID}-backdrop`} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
})
