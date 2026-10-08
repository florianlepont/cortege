import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { useHeaderHeight } from "@react-navigation/elements"
import { useBrandTheme } from "../app/theme"
import { FrameLargeTitleContext } from "./frame-large-title"
import { ScreenBackdrop } from "./ScreenBackdrop"

type ScreenFrameProps = {
  children: ReactNode
  testID?: string
  /**
   * 12.2-17: the stack gives this page the native large title (`nativeLargeTitle` in
   * `navigation/stacks/stack-options.ts`). The frame then adds no header padding (the system insets
   * the scroll view, and the header height changes while the title collapses), and paints the halo
   * on itself instead of in a child view: iOS finds the scroll view that drives the collapse (and
   * the iOS 26 scroll edge effect) by following the first subview from the screen down, so nothing
   * may come before the page's scroll view, and the frame must stay a real parent of it (see
   * `LargeTitleFrame`).
   */
  largeTitle?: boolean
}

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
 * With `largeTitle` (native iOS tab tree, 12.2-17) the same page colour and halo fill the frame,
 * but the content starts at the top of the screen and the system insets it (see the prop).
 *
 * The screen inside draws no background of its own on its root and scroll views (the frame is the
 * page), and does not add the header height again. One frame per screen, no animation, no blur.
 */
export function ScreenFrame({
  children,
  testID = "screen-frame",
  largeTitle = false,
}: ScreenFrameProps) {
  return largeTitle ? (
    <LargeTitleFrame testID={testID}>{children}</LargeTitleFrame>
  ) : (
    <HeaderInsetFrame testID={testID}>{children}</HeaderInsetFrame>
  )
}

function HeaderInsetFrame({ children, testID }: { children: ReactNode; testID: string }) {
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

/**
 * No `useHeaderHeight()` here: under a large title the header height changes while the page
 * scrolls, and the frame has nothing to do with it.
 *
 * `collapsable={false}` (12.2-17, found on the simulator): a view that only paints (background
 * colour, gradient, test id) gets a native view but no stacking context in Fabric, so React Native
 * mounts its children beside it, in its parent. The frame then sat empty in front of the page's
 * scroll view, iOS followed the first subview into it, found no scroll view, and the large title
 * neither collapsed nor blurred while the rows slid under it. Non-collapsable, the frame keeps its
 * children inside, and the page's scroll view is the first view iOS meets.
 */
function LargeTitleFrame({ children, testID }: { children: ReactNode; testID: string }) {
  const theme = useBrandTheme()
  return (
    <FrameLargeTitleContext.Provider value>
      <View
        collapsable={false}
        style={[
          styles.frame,
          {
            backgroundColor: theme.colors.canvas,
            experimental_backgroundImage: theme.visual.backdrop,
          },
        ]}
        testID={testID}
      >
        {children}
      </View>
    </FrameLargeTitleContext.Provider>
  )
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
})
