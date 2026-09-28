import React, { forwardRef, useImperativeHandle } from "react"

// Minimal Jest mock for @gorhom/bottom-sheet (MAP-01): the real package pulls in
// react-native-gesture-handler's native module, which doesn't initialize under this project's
// plain node/ts-jest environment (no RN preset — same reasoning as react-native-reanimated.mock.ts).
// The imperative handle actually drives `onChange`, so a test can assert on ExplorerSheet's
// visible->snapToIndex and onDismiss<-onChange wiring instead of only checking props were passed.

type BottomSheetProps = {
  children?: React.ReactNode
  onChange?: (index: number) => void
}

export type BottomSheetRef = {
  snapToIndex: (index: number) => void
  snapToPosition: (position: string | number) => void
  expand: () => void
  collapse: () => void
  close: () => void
  forceClose: () => void
}

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(function BottomSheet(
  { children, onChange },
  ref,
) {
  useImperativeHandle(ref, () => ({
    snapToIndex: (index: number) => onChange?.(index),
    snapToPosition: () => undefined,
    expand: () => onChange?.(1),
    collapse: () => onChange?.(0),
    close: () => onChange?.(-1),
    forceClose: () => onChange?.(-1),
  }))
  return React.createElement(React.Fragment, null, children)
})

export default BottomSheet

function passthrough(name: string) {
  return function Passthrough({ children, ...props }: { children?: React.ReactNode }) {
    return React.createElement(name, props, children)
  }
}

export const BottomSheetView = passthrough("BottomSheetView")
export const BottomSheetScrollView = passthrough("BottomSheetScrollView")
export const BottomSheetFlatList = passthrough("BottomSheetFlatList")
