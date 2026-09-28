/**
 * Tests for SettingsScreen (Phase 2 / BUG-05): the delete-account button confirms once, through
 * onDeleteAccount, without an extra local Alert; the danger zone renders last, not first.
 */
import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { fr } from "../i18n"
import { SettingsScreen } from "./SettingsScreen"

const mockAlert = jest.fn()
const mockShouldShowDevTools = jest.fn(() => false)

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 44 }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useAppBottomTabBarHeight: () => 50 }))
jest.mock("../app/dev-tools", () => ({ shouldShowDevTools: () => mockShouldShowDevTools() }))
jest.mock("../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})
jest.mock("../ui/AppCollapsibleSection", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCollapsibleSection: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCollapsibleSection", null, children),
  }
})
jest.mock("../ui/AppField", () => {
  const ReactRef = require("react") as typeof import("react")
  return { AppField: (props: object) => ReactRef.createElement("AppField", props) }
})
jest.mock("../ui/AppNotice", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppNotice: ({ message }: { message: string }) =>
      ReactRef.createElement("AppNotice", { message }),
  }
})
jest.mock("../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({ title }: { title: string }) =>
      ReactRef.createElement("AppSectionHeader", { title }),
  }
})
jest.mock("../ui/AppSettingsRow", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSettingsRow: ({ label, onPress }: { label: string; onPress: () => void }) =>
      ReactRef.createElement("AppSettingsRow", { label, onPress }),
  }
})
jest.mock("../ui/AppButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppButton: ({ label, onPress }: { label: string; onPress: () => void }) =>
      ReactRef.createElement("AppButton", { label, onPress }),
  }
})
jest.mock("../ui/AppChoiceChip", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppChoiceChip: ({
      label,
      active,
      onPress,
    }: {
      label: string
      active?: boolean
      onPress?: () => void
    }) => ReactRef.createElement("AppChoiceChip", { label, active, onPress }),
  }
})

let tree: ReactTestRenderer

function makeProps(overrides: Partial<React.ComponentProps<typeof SettingsScreen>> = {}) {
  return {
    apiUrl: "http://localhost:3000",
    onApiUrlChange: jest.fn(),
    onSync: jest.fn(async () => undefined),
    onPullChanges: jest.fn(async () => undefined),
    onRefreshLocalList: jest.fn(async () => undefined),
    onRefreshLocalAttachments: jest.fn(async () => undefined),
    onDeleteAccount: jest.fn(async () => undefined),
    onDebugResetIbpData: jest.fn(async () => undefined),
    onDebugResetUserData: jest.fn(async () => undefined),
    status: "",
    ...overrides,
  }
}

function mount(props: React.ComponentProps<typeof SettingsScreen>) {
  act(() => {
    tree = renderer.create(<SettingsScreen {...props} />)
  })
}

beforeEach(() => {
  mockAlert.mockClear()
  mockShouldShowDevTools.mockReturnValue(false)
})

afterEach(() => {
  act(() => tree.unmount())
})

describe("SettingsScreen", () => {
  test("pressing delete calls onDeleteAccount directly, with no extra local Alert (BUG-05)", async () => {
    const props = makeProps()
    mount(props)
    const button = tree.root.find(
      (node) =>
        (node.type as unknown) === "AppButton" &&
        node.props.label === fr.settings.account.deleteButton,
    )
    await act(async () => {
      button.props.onPress()
    })
    expect(props.onDeleteAccount).toHaveBeenCalledTimes(1)
    expect(mockAlert).not.toHaveBeenCalled()
  })

  test("the danger zone is the last section, not the first (BUG-05)", () => {
    mount(makeProps())
    const headers = tree.root
      .findAll((node) => (node.type as unknown) === "AppSectionHeader")
      .map((node) => node.props.title as string)
    expect(headers[0]).not.toBe(fr.settings.account.title)
    expect(headers[headers.length - 1]).toBe(fr.settings.account.title)
  })

  test("the danger notice says surveys are anonymised, not deleted", () => {
    mount(makeProps())
    const notice = tree.root.find(
      (node) => (node.type as unknown) === "AppNotice",
    ) as ReactTestInstance
    expect(String(notice.props.message)).toContain("anonymis")
    expect(String(notice.props.message)).not.toContain("y compris vos relevés")
  })
})
