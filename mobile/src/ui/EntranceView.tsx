import type { ReactNode } from "react"
import type { StyleProp, ViewStyle } from "react-native"
import Animated from "react-native-reanimated"
import { useFocusEntrance } from "./useFocusEntrance"

type EntranceViewProps = {
  /** Position of the section on its screen: sets the stagger. */
  index: number
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

/** A screen section that slides up when its screen becomes visible (see `useFocusEntrance`). */
export function EntranceView({ index, style, children }: EntranceViewProps) {
  const entranceStyle = useFocusEntrance(index)
  return <Animated.View style={[style, entranceStyle]}>{children}</Animated.View>
}
