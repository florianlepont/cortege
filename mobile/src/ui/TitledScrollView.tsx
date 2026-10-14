import { createContext, forwardRef, useCallback, useContext, useEffect, useRef } from "react"
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, ScrollViewProps } from "react-native"
import { useBrandTheme } from "../app/theme"
import { androidHeaderTitleStyle } from "../app/header-title-style"
import { useFrameLargeTitle } from "./frame-large-title"

/**
 * How far the page scrolls before its title moves into the bar: about the height of the title
 * block under the header, so the small title shows as the large one leaves the screen.
 */
export const TITLE_COLLAPSE_OFFSET = 44

type HeaderNavigation = {
  setOptions: (options: {
    headerTitle: string
    headerTitleStyle: ReturnType<typeof androidHeaderTitleStyle>
  }) => void
}

const NoNavigationContext = createContext<HeaderNavigation | undefined>(undefined)

/** The navigation of the screen this view sits in, undefined outside a navigator (tests). */
function getNavigationContext(): React.Context<HeaderNavigation | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const native = require("@react-navigation/native") as {
      NavigationContext?: React.Context<HeaderNavigation | undefined>
    }
    return native.NavigationContext ?? NoNavigationContext
  } catch {
    return NoNavigationContext
  }
}

type TitledScrollViewProps = ScrollViewProps & {
  /** The page's title: shown small in the bar once the large one has scrolled away. */
  collapsingTitle: string
  /**
   * A page that swaps its content in place (the route step's questions) passes the id of what it
   * shows: when it changes the page is back at the top, so a bar title taken while scrolled is given
   * back. A keyboard that scrolled the field out of view and back fires no scroll event, which left
   * the small title beside the large one.
   */
  resetKey?: string
}

/**
 * A `ScrollView` for a page that draws its own large title (`PageTitle`, the survey's name). On
 * Android and in the JS tab tree the stack's bar is empty at the top of the page; as the page
 * scrolls past the title, the bar takes the title, as the native large title does on iOS. Under
 * the native iOS large title (`<ScreenFrame largeTitle>`) the system does it, so this is a plain
 * `ScrollView` there.
 */
export const TitledScrollView = forwardRef<ScrollView, TitledScrollViewProps>(
  function TitledScrollView({ collapsingTitle, resetKey, onScroll, ...rest }, ref) {
    const nativeTitle = useFrameLargeTitle()
    const theme = useBrandTheme()
    const navigation = useContext(getNavigationContext())
    const collapsed = useRef(false)

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        onScroll?.(event)
        if (nativeTitle || !navigation) return
        const shouldCollapse = event.nativeEvent.contentOffset.y > TITLE_COLLAPSE_OFFSET
        if (shouldCollapse === collapsed.current) return
        collapsed.current = shouldCollapse
        navigation.setOptions({
          headerTitle: shouldCollapse ? collapsingTitle : "",
          headerTitleStyle: androidHeaderTitleStyle(theme),
        })
      },
      [collapsingTitle, navigation, nativeTitle, onScroll, theme],
    )

    useEffect(() => {
      if (nativeTitle || !navigation || !collapsed.current) return
      collapsed.current = false
      navigation.setOptions({
        headerTitle: "",
        headerTitleStyle: androidHeaderTitleStyle(theme),
      })
      // Only when the page's content changes, not when the theme does.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey])

    return <ScrollView ref={ref} scrollEventThrottle={16} {...rest} onScroll={handleScroll} />
  },
)
