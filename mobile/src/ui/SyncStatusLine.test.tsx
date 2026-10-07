import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import * as Haptics from "expo-haptics"
import * as reanimated from "../../test/react-native-reanimated.mock"
import {
  isSyncStatusLineVisible,
  resolveSyncStatusLineState,
  SyncStatusLine,
} from "./SyncStatusLine"
import { fr } from "../i18n"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)

  type PressableRenderProp<T> = T | ((state: { pressed: boolean }) => T)
  const resolvePressableProp = <T,>(prop: PressableRenderProp<T> | undefined): T | undefined =>
    typeof prop === "function"
      ? (prop as (state: { pressed: boolean }) => T)({ pressed: false })
      : prop

  return {
    Pressable: ({
      children,
      style,
      ...props
    }: {
      children?: PressableRenderProp<React.ReactNode>
      style?: PressableRenderProp<unknown>
    }) =>
      ReactActual.createElement(
        "Pressable",
        { ...props, style: resolvePressableProp(style) },
        resolvePressableProp(children),
      ),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    ActivityIndicator: mockComponent("ActivityIndicator"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: {
      OS: "ios",
      select: <T,>(options: { ios?: T; android?: T; default?: T }): T | undefined =>
        options.ios ?? options.default,
    },
  }
})

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) {
      return
    }
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

function render(props: { isOnline: boolean; isSyncing: boolean; pendingCount: number }) {
  let tree: renderer.ReactTestRenderer | undefined
  const onPress = jest.fn()
  act(() => {
    tree = renderer.create(<SyncStatusLine {...props} onPress={onPress} />)
  })
  const root = tree!.root
  if (tree!.toJSON() === null) {
    return { texts: [], spinner: undefined, onPress, pressable: undefined, rerender: tree!.update }
  }
  const texts = root
    .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
  const spinner = root.findAll((node) => (node.type as unknown) === "ActivityIndicator")[0]
  const pressable = root.findByType("Pressable" as never)
  return { texts, spinner, onPress, pressable, rerender: tree!.update }
}

describe("resolveSyncStatusLineState (SYNC-02)", () => {
  test("offline always wins, even mid-sync or with work pending", () => {
    expect(resolveSyncStatusLineState({ isOnline: false, isSyncing: true, pendingCount: 3 })).toBe(
      "offline",
    )
  })

  test("syncing wins over pending work when online", () => {
    expect(resolveSyncStatusLineState({ isOnline: true, isSyncing: true, pendingCount: 2 })).toBe(
      "syncing",
    )
  })

  test("pending work shows toSend once idle", () => {
    expect(resolveSyncStatusLineState({ isOnline: true, isSyncing: false, pendingCount: 2 })).toBe(
      "toSend",
    )
  })

  test("nothing pending and online reads up to date", () => {
    expect(resolveSyncStatusLineState({ isOnline: true, isSyncing: false, pendingCount: 0 })).toBe(
      "upToDate",
    )
  })
})

describe("SyncStatusLine renders the matching label", () => {
  test("offline", () => {
    const { texts, spinner } = render({ isOnline: false, isSyncing: false, pendingCount: 0 })
    expect(texts).toContain(fr.components.syncStatusLine.offline)
    expect(spinner).toBeUndefined()
  })

  test("toSend with a count", () => {
    const { texts, spinner } = render({ isOnline: true, isSyncing: false, pendingCount: 4 })
    expect(texts).toContain(fr.components.syncStatusLine.toSend({ count: 4 }))
    expect(spinner).toBeUndefined()
  })

  test("syncing shows a spinner, not a dot", () => {
    const { texts, spinner } = render({ isOnline: true, isSyncing: true, pendingCount: 0 })
    expect(texts).toContain(fr.components.syncStatusLine.syncing)
    expect(spinner).toBeDefined()
  })

  test("up to date draws nothing at all (D-20b): no text, no dot, no view", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <SyncStatusLine isOnline isSyncing={false} pendingCount={0} onPress={jest.fn()} />,
      )
    })
    expect(tree!.toJSON()).toBeNull()
    expect(Object.keys(fr.components.syncStatusLine)).not.toContain("upToDate")
  })

  test("it appears again as soon as there is something to say, and goes when it is done", () => {
    let tree: renderer.ReactTestRenderer | undefined
    const line = (pendingCount: number, isSyncing = false) => (
      <SyncStatusLine
        isOnline
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        onPress={jest.fn()}
      />
    )
    act(() => {
      tree = renderer.create(line(0))
    })
    expect(tree!.toJSON()).toBeNull()
    act(() => tree!.update(line(2)))
    expect(tree!.toJSON()).not.toBeNull()
    act(() => tree!.update(line(2, true)))
    expect(
      tree!.root.findAll((node) => (node.type as unknown) === "ActivityIndicator"),
    ).toHaveLength(1)
    act(() => tree!.update(line(2)))
    act(() => tree!.update(line(0)))
    expect(tree!.toJSON()).toBeNull()
  })

  test("isSyncStatusLineVisible is false only when up to date", () => {
    expect(isSyncStatusLineVisible({ isOnline: true, isSyncing: false, pendingCount: 0 })).toBe(
      false,
    )
    expect(isSyncStatusLineVisible({ isOnline: true, isSyncing: false, pendingCount: 1 })).toBe(
      true,
    )
    expect(isSyncStatusLineVisible({ isOnline: true, isSyncing: true, pendingCount: 0 })).toBe(true)
    expect(isSyncStatusLineVisible({ isOnline: false, isSyncing: false, pendingCount: 0 })).toBe(
      true,
    )
  })
})

describe("SyncStatusLine interaction", () => {
  test("tapping the line calls onPress", () => {
    const { pressable, onPress } = render({ isOnline: true, isSyncing: false, pendingCount: 2 })
    act(() => {
      pressable!.props.onPress()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("a haptic success fires only on the syncing-to-up-to-date transition", () => {
    const notifySuccess = jest.spyOn(Haptics, "notificationAsync")
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <SyncStatusLine isOnline isSyncing pendingCount={0} onPress={jest.fn()} />,
      )
    })
    expect(notifySuccess).not.toHaveBeenCalled()

    act(() => {
      tree!.update(
        <SyncStatusLine isOnline isSyncing={false} pendingCount={0} onPress={jest.fn()} />,
      )
    })
    expect(notifySuccess).toHaveBeenCalledTimes(1)

    act(() => {
      tree!.update(
        <SyncStatusLine isOnline isSyncing={false} pendingCount={2} onPress={jest.fn()} />,
      )
    })
    expect(notifySuccess).toHaveBeenCalledTimes(1)

    notifySuccess.mockRestore()
  })

  describe("status dot spring (D-08 status icons)", () => {
    const withSequenceSpy = jest.spyOn(reanimated, "withSequence")

    beforeEach(() => {
      withSequenceSpy.mockClear()
    })

    afterEach(() => {
      reanimated.setReducedMotion(false)
    })

    function finishSync() {
      const notifySuccess = jest.spyOn(Haptics, "notificationAsync")
      let tree: renderer.ReactTestRenderer | undefined
      act(() => {
        tree = renderer.create(
          <SyncStatusLine isOnline isSyncing pendingCount={0} onPress={jest.fn()} />,
        )
      })
      act(() => {
        tree!.update(
          <SyncStatusLine isOnline isSyncing={false} pendingCount={0} onPress={jest.fn()} />,
        )
      })
      const calls = notifySuccess.mock.calls.length
      notifySuccess.mockRestore()
      return calls
    }

    test("a finished sync springs the dot in and still fires the haptic once", () => {
      expect(finishSync()).toBe(1)
      expect(withSequenceSpy).toHaveBeenCalledTimes(1)
    })

    test("under Reduce Motion the haptic fires but the dot does not animate", () => {
      reanimated.setReducedMotion(true)
      expect(finishSync()).toBe(1)
      expect(withSequenceSpy).not.toHaveBeenCalled()
    })

    test("no spring without a syncing-to-up-to-date transition", () => {
      render({ isOnline: true, isSyncing: false, pendingCount: 2 })
      expect(withSequenceSpy).not.toHaveBeenCalled()
    })
  })
})
