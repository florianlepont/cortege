import React from "react"
import renderer, { act } from "react-test-renderer"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    if (message.includes("not configured to support act")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => ({
  StyleSheet: { create: <T,>(value: T): T => value },
}))

import { ExplorerSheet } from "./ExplorerSheet"

function render(props: Partial<React.ComponentProps<typeof ExplorerSheet>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <ExplorerSheet visible={false} onDismiss={jest.fn()} {...props}>
        {props.children ?? "content"}
      </ExplorerSheet>,
    )
  })
  return tree!
}

/** The mocked BottomSheet's `onChange` prop — the mock's imperative handle calls it directly. */
function sheetOnChange(tree: renderer.ReactTestRenderer): (index: number) => void {
  const node = tree.root.find((n) => typeof n.props.onChange === "function")
  return node.props.onChange as (index: number) => void
}

describe("ExplorerSheet (MAP-01: tiered sheet)", () => {
  test("renders its children inside a scrollable sheet body", () => {
    const tree = render({ visible: true, children: "hello" })
    expect(
      tree.root.findAll((node) => (node.type as unknown) === "BottomSheetScrollView"),
    ).toHaveLength(1)
    expect(tree.toJSON()).not.toBeNull()
  })

  test("becoming visible snaps the sheet open; becoming hidden closes it, both without throwing", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <ExplorerSheet visible={false} onDismiss={jest.fn()}>
          content
        </ExplorerSheet>,
      )
    })
    act(() => {
      tree!.update(
        <ExplorerSheet visible={true} onDismiss={jest.fn()}>
          content
        </ExplorerSheet>,
      )
    })
    act(() => {
      tree!.update(
        <ExplorerSheet visible={false} onDismiss={jest.fn()}>
          content
        </ExplorerSheet>,
      )
    })
  })

  test("the sheet reporting index -1 (swipe-to-dismiss) reports the dismissal", () => {
    const onDismiss = jest.fn()
    const tree = render({ visible: true, onDismiss })
    act(() => sheetOnChange(tree)(-1))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  test("a change to an open detent does not report a dismissal", () => {
    const onDismiss = jest.fn()
    const tree = render({ visible: true, onDismiss })
    act(() => sheetOnChange(tree)(1))
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
