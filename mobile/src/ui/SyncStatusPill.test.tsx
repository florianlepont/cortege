import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { resolveSyncStatusPillState, SyncStatusPill } from "./SyncStatusPill"
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
    tree = renderer.create(<SyncStatusPill {...props} onPress={onPress} />)
  })
  const root = tree!.root
  const texts = root
    .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
  const icon = root.findAllByType(Ionicons)[0]
  const pressable = root.findByType("Pressable" as never)
  return { texts, icon, onPress, pressable, rerender: tree!.update }
}

describe("resolveSyncStatusPillState (SYNC-02)", () => {
  test("offline always wins, even mid-sync or with work pending", () => {
    expect(resolveSyncStatusPillState({ isOnline: false, isSyncing: true, pendingCount: 3 })).toBe(
      "offline",
    )
  })

  test("syncing wins over pending work when online", () => {
    expect(resolveSyncStatusPillState({ isOnline: true, isSyncing: true, pendingCount: 2 })).toBe(
      "syncing",
    )
  })

  test("pending work shows toSend once idle", () => {
    expect(resolveSyncStatusPillState({ isOnline: true, isSyncing: false, pendingCount: 2 })).toBe(
      "toSend",
    )
  })

  test("nothing pending and online reads up to date", () => {
    expect(resolveSyncStatusPillState({ isOnline: true, isSyncing: false, pendingCount: 0 })).toBe(
      "upToDate",
    )
  })
})

describe("SyncStatusPill renders the matching label and icon", () => {
  test("offline", () => {
    const { texts, icon } = render({ isOnline: false, isSyncing: false, pendingCount: 0 })
    expect(texts).toContain(fr.components.syncStatusPill.offline)
    expect(icon.props.name).toBe("cloud-offline-outline")
  })

  test("toSend with a count", () => {
    const { texts, icon } = render({ isOnline: true, isSyncing: false, pendingCount: 4 })
    expect(texts).toContain(fr.components.syncStatusPill.toSend({ count: 4 }))
    expect(icon.props.name).toBe("cloud-upload-outline")
  })

  test("syncing shows a spinner, not the sync icon", () => {
    const { texts, icon } = render({ isOnline: true, isSyncing: true, pendingCount: 0 })
    expect(texts).toContain(fr.components.syncStatusPill.syncing)
    expect(icon).toBeUndefined()
  })

  test("up to date", () => {
    const { texts, icon } = render({ isOnline: true, isSyncing: false, pendingCount: 0 })
    expect(texts).toContain(fr.components.syncStatusPill.upToDate)
    expect(icon.props.name).toBe("checkmark-circle-outline")
  })
})

describe("SyncStatusPill interaction", () => {
  test("tapping the pill calls onPress", () => {
    const { pressable, onPress } = render({ isOnline: true, isSyncing: false, pendingCount: 0 })
    act(() => {
      pressable.props.onPress()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("a haptic success fires only on the syncing-to-up-to-date transition", () => {
    const notifySuccess = jest.spyOn(Haptics, "notificationAsync")
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <SyncStatusPill isOnline isSyncing pendingCount={0} onPress={jest.fn()} />,
      )
    })
    expect(notifySuccess).not.toHaveBeenCalled()

    act(() => {
      tree!.update(
        <SyncStatusPill isOnline isSyncing={false} pendingCount={0} onPress={jest.fn()} />,
      )
    })
    expect(notifySuccess).toHaveBeenCalledTimes(1)

    act(() => {
      tree!.update(
        <SyncStatusPill isOnline isSyncing={false} pendingCount={2} onPress={jest.fn()} />,
      )
    })
    expect(notifySuccess).toHaveBeenCalledTimes(1)

    notifySuccess.mockRestore()
  })
})
