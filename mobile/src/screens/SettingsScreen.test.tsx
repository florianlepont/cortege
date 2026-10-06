/**
 * Tests for SettingsScreen (Phase 2 / BUG-05, then OA-74/78/79): one grouped list (appearance, offline
 * maps, about, account deletion), no sync tools, and the delete button confirms once, through
 * onDeleteAccount, without an extra local Alert.
 */
import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { fr } from "../i18n"
import { SettingsScreen } from "./SettingsScreen"

const mockAlert = jest.fn()
const mockShouldShowDevTools = jest.fn(() => false)
const mockSetMode = jest.fn()
const mockOfflineEnabled = jest.fn(() => true)

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
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "1.2.3" } },
}))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useAppBottomTabBarHeight: () => 50 }))
jest.mock("../app/dev-tools", () => ({ shouldShowDevTools: () => mockShouldShowDevTools() }))
jest.mock("../app/feature-flags", () => ({ isOfflineMapsEnabled: () => mockOfflineEnabled() }))
jest.mock("../app/theme", () => {
  const actual = jest.requireActual("../app/theme") as typeof import("../app/theme")
  return {
    ...actual,
    useBrandTheme: () => ({
      ...actual.useBrandTheme(),
      mode: "dark",
      setMode: (mode: string) => mockSetMode(mode),
    }),
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
jest.mock("../ui/AppGroupedList", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppGroupedList: ({
      sections,
    }: {
      sections: { rows: { key: string; content?: unknown }[] }[]
    }) =>
      ReactRef.createElement(
        "AppGroupedList",
        { sections },
        sections.flatMap((section) =>
          section.rows.map((candidate) =>
            ReactRef.createElement(
              ReactRef.Fragment,
              { key: candidate.key },
              (candidate.content ?? null) as never,
            ),
          ),
        ),
      ),
  }
})

type Row = {
  key: string
  kind?: string
  label?: string
  value?: string
  destructive?: boolean
  loading?: boolean
  onPress?: () => void
  content?: React.ReactElement
}
type Section = { key: string; title?: string; footer?: string; rows: Row[] }

let tree: ReactTestRenderer

function makeProps(overrides: Partial<React.ComponentProps<typeof SettingsScreen>> = {}) {
  return {
    apiUrl: "http://localhost:3000",
    onApiUrlChange: jest.fn(),
    offlineAreas: { count: 0, bytes: 0 },
    onOpenOfflineAreas: jest.fn(),
    onDeleteAccount: jest.fn(async () => undefined),
    onDebugResetIbpData: jest.fn(async () => undefined),
    onDebugResetUserData: jest.fn(async () => undefined),
    ...overrides,
  }
}

function mount(props: React.ComponentProps<typeof SettingsScreen>) {
  act(() => {
    tree = renderer.create(<SettingsScreen {...props} />)
  })
}

const sections = (): Section[] =>
  tree.root.findByType("AppGroupedList" as never).props.sections as Section[]
const row = (sectionKey: string, rowKey: string): Row =>
  sections()
    .find((section) => section.key === sectionKey)!
    .rows.find((candidate) => candidate.key === rowKey)!

beforeEach(() => {
  mockAlert.mockClear()
  mockSetMode.mockClear()
  mockShouldShowDevTools.mockReturnValue(false)
  mockOfflineEnabled.mockReturnValue(true)
})

afterEach(() => {
  act(() => tree.unmount())
})

describe("SettingsScreen", () => {
  test("the sections are appearance, maps, about, then the account deletion last (OA-79)", () => {
    mount(makeProps())
    expect(sections().map((section) => section.key)).toEqual([
      "appearance",
      "maps",
      "about",
      "delete",
    ])
  })

  test("there is no sync tool and no status line any more (OA-77, OA-78)", () => {
    mount(makeProps())
    const labels = sections().flatMap((section) => section.rows.map((r) => r.label))
    expect(labels.join(" ")).not.toMatch(/Synchronis|Récupérer|Rafraîchir/)
    expect(tree.root.findAllByType("AppNotice" as never)).toHaveLength(0)
  })

  test("the appearance row offers the three themes and switches to the chosen one", () => {
    mount(makeProps())
    const chips = tree.root.findAllByType("AppChoiceChip" as never)
    expect(chips.map((chip) => chip.props.label)).toEqual([
      fr.settings.appearance.automatic,
      fr.settings.appearance.light,
      fr.settings.appearance.dark,
    ])
    expect(chips.find((chip) => chip.props.active)?.props.label).toBe(fr.settings.appearance.dark)
    act(() => chips[1].props.onPress())
    expect(mockSetMode).toHaveBeenCalledWith("light")
  })

  describe("Cartes hors ligne row", () => {
    test("says there is no zone yet, and opens the zones screen", () => {
      const onOpenOfflineAreas = jest.fn()
      mount(makeProps({ onOpenOfflineAreas }))
      const offline = row("maps", "offline-areas")
      expect(offline.value).toBe(fr.settings.maps.offlineNone)
      offline.onPress?.()
      expect(onOpenOfflineAreas).toHaveBeenCalledTimes(1)
    })

    test("sums up the zones and their size", () => {
      mount(makeProps({ offlineAreas: { count: 2, bytes: 38_000_000 } }))
      expect(row("maps", "offline-areas").value).toBe(
        fr.settings.maps.offlineSummary({ count: 2, megabytes: "38.0" }),
      )
    })

    test("is hidden when offline maps are switched off", () => {
      mockOfflineEnabled.mockReturnValue(false)
      mount(makeProps())
      expect(sections().some((section) => section.key === "maps")).toBe(false)
    })
  })

  describe("À propos", () => {
    test("shows the app version, and the credits open an alert (OA-74)", () => {
      mount(makeProps())
      expect(row("about", "version").value).toBe("1.2.3")
      row("about", "credits").onPress?.()
      expect(mockAlert).toHaveBeenCalledWith(
        fr.account.credits.alertTitle,
        fr.account.credits.alertMessage,
      )
    })
  })

  describe("account deletion", () => {
    test("pressing it calls onDeleteAccount directly, with no extra local Alert (BUG-05)", async () => {
      const props = makeProps()
      mount(props)
      const remove = row("delete", "delete-account")
      expect(remove.destructive).toBe(true)
      await act(async () => {
        remove.onPress?.()
      })
      expect(props.onDeleteAccount).toHaveBeenCalledTimes(1)
      expect(mockAlert).not.toHaveBeenCalled()
    })

    test("the footer says surveys are anonymised, not deleted", () => {
      mount(makeProps())
      const footer = sections().find((section) => section.key === "delete")!.footer
      expect(footer).toContain("anonymis")
      expect(footer).not.toContain("y compris vos relevés")
    })
  })

  describe("developer tools", () => {
    test("are hidden in production builds", () => {
      mount(makeProps())
      expect(tree.root.findAllByType("AppCollapsibleSection" as never)).toHaveLength(0)
    })

    test("edit the API URL and confirm before emptying the local databases", () => {
      mockShouldShowDevTools.mockReturnValue(true)
      const props = makeProps()
      mount(props)
      const field = tree.root.findByType("AppField" as never) as ReactTestInstance
      act(() => field.props.onChangeText("http://other"))
      expect(props.onApiUrlChange).toHaveBeenCalledWith("http://other")

      const buttons = tree.root.findAllByType("AppButton" as never)
      const resetIbp = buttons.find(
        (button) => button.props.label === fr.settings.devTools.resetIbpData,
      )
      const resetUser = buttons.find(
        (button) => button.props.label === fr.settings.devTools.resetUserData,
      )

      act(() => resetIbp!.props.onPress())
      const ibpButtons = mockAlert.mock.calls[0][2] as { text: string; onPress?: () => void }[]
      act(() => ibpButtons.find((button) => button.text === fr.settings.alerts.empty)!.onPress?.())
      expect(props.onDebugResetIbpData).toHaveBeenCalledTimes(1)

      act(() => resetUser!.props.onPress())
      const userButtons = mockAlert.mock.calls[1][2] as { text: string; onPress?: () => void }[]
      act(() => userButtons.find((button) => button.text === fr.settings.alerts.empty)!.onPress?.())
      expect(props.onDebugResetUserData).toHaveBeenCalledTimes(1)
    })
  })
})
