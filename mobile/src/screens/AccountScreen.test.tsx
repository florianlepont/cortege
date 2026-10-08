import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { Alert } from "react-native"
import type { AuthUser } from "../app/types"
import { fr } from "../i18n"
import { Ionicons } from "@expo/vector-icons"
import { AccountScreen } from "./AccountScreen"
import { FrameLargeTitleContext } from "../ui/frame-large-title"

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
  const ReactRef = jest.requireActual("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)

  type PressableRenderProp<T> = T | ((state: { pressed: boolean }) => T)
  const resolvePressableProp = <T,>(prop: PressableRenderProp<T> | undefined): T | undefined =>
    typeof prop === "function"
      ? (prop as (state: { pressed: boolean }) => T)({ pressed: false })
      : prop
  const Pressable = ({
    children,
    style,
    ...props
  }: {
    children?: PressableRenderProp<React.ReactNode>
    style?: PressableRenderProp<unknown>
  }) =>
    ReactRef.createElement(
      "Pressable",
      { ...props, style: resolvePressableProp(style) },
      resolvePressableProp(children),
    )

  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    ScrollView: mockComponent("ScrollView"),
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable,
    Alert: { alert: jest.fn() },
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
  }
})

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 44 }))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useAppBottomTabBarHeight: () => 68 }))
jest.mock("./account/IdentityCard", () => ({ IdentityCard: "IdentityCard" }))
jest.mock("../ui/GlassSurface", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return {
    GlassSurface: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", null, children),
  }
})

const user: AuthUser = {
  id: "user-1",
  email: "marie@example.org",
  display_name: "Marie",
  role: "",
  first_name: "Marie",
  last_name: "Curie",
  profile_picture_url: null,
}

function makeProps(overrides: Partial<React.ComponentProps<typeof AccountScreen>> = {}) {
  return {
    accessToken: "token",
    currentUser: user,
    profile: "",
    profileUpdating: false,
    apiUrl: "http://localhost:3000/v1",
    onSaveProfile: jest.fn(async () => undefined),
    onChangeEmail: jest.fn(async () => undefined),
    onPasswordReset: jest.fn(async () => undefined),
    onPickProfilePictureFromLibrary: jest.fn(async () => undefined),
    onTakeProfilePictureFromCamera: jest.fn(async () => undefined),
    onRemoveProfilePicture: jest.fn(async () => undefined),
    onLogout: jest.fn(async () => undefined),
    ...overrides,
  }
}

let tree: ReactTestRenderer

function mount(props: React.ComponentProps<typeof AccountScreen>) {
  act(() => {
    tree = renderer.create(<AccountScreen {...props} />)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  act(() => tree?.unmount())
})

const findAlertButtons = () => {
  const call = (Alert.alert as jest.Mock).mock.calls[0] as [
    string,
    string | undefined,
    { text: string; style?: string; onPress?: () => void }[],
  ]
  return call[2]
}

describe("AccountScreen", () => {
  test("shows a loading spinner until currentUser is available", () => {
    mount(makeProps({ currentUser: null }))
    expect(tree.root.findAllByType("IdentityCard" as never)).toHaveLength(0)
    expect(tree.root.findByType("ActivityIndicator" as never)).toBeTruthy()
  })

  test("renders the identity, then the profile fields as rows of the grouped list (OA-70)", () => {
    mount(makeProps())
    expect(tree.root.findByType("IdentityCard" as never).props.currentUser).toBe(user)
    const input = (label: string) =>
      tree.root.findByProps({ accessibilityLabel: label, autoCapitalize: "words" })
    expect(input(fr.account.profile.firstName).props.value).toBe("Marie")
    expect(input(fr.account.profile.lastName).props.value).toBe("Curie")
    expect(input(fr.account.profile.displayName).props.value).toBe("Marie")
  })

  test("gives every row an outline icon, in list order", () => {
    mount(makeProps())
    const names = tree.root
      .findAllByType(Ionicons as unknown as React.ComponentType<{ name: string }>)
      .map((node) => node.props.name)
      .filter((name) => name !== "chevron-forward-outline")
    expect(names).toEqual([
      "person-outline",
      "person-outline",
      "at-outline",
      "mail-outline",
      "key-outline",
      "log-out-outline",
    ])
    names.forEach((name) => expect(name.endsWith("-outline")).toBe(true))
  })

  test("shows 'Non renseigné' for a missing e-mail, never an em dash", () => {
    mount(makeProps({ currentUser: { ...user, email: null as unknown as string } }))
    const texts = tree.root
      .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
      .map((node) => String([node.props.children].flat().join("")))
    expect(fr.account.email.empty).toBe("Non renseigné")
    expect(texts).toContain("Non renseigné")
    expect(fr.account.email.empty).not.toContain("\u2014")
  })

  describe("the unsaved-changes bar (OA-72)", () => {
    const editFirstName = (value: string) => {
      const input = tree.root.findByProps({
        accessibilityLabel: fr.account.profile.firstName,
        autoCapitalize: "words",
      })
      act(() => input.props.onChangeText(value))
    }

    test("is not shown while nothing changed", () => {
      mount(makeProps())
      expect(tree.root.findAllByType("GlassSurface" as never)).toHaveLength(0)
    })

    test("appears when a field changes, and saving sends the three fields", () => {
      const onSaveProfile = jest.fn(async () => undefined)
      mount(makeProps({ onSaveProfile }))
      editFirstName("Marie-Sklodowska")
      expect(tree.root.findAllByType("GlassSurface" as never)).toHaveLength(1)

      const save = tree.root.findByProps({ accessibilityLabel: fr.account.profile.save })
      act(() => save.props.onPress())
      expect(onSaveProfile).toHaveBeenCalledWith({
        first_name: "Marie-Sklodowska",
        last_name: "Curie",
        display_name: "Marie",
      })
    })

    test("cancel puts the saved values back and hides the bar", () => {
      mount(makeProps())
      editFirstName("Autre")
      const cancel = tree.root.findByProps({ accessibilityLabel: fr.account.profile.cancel })
      act(() => cancel.props.onPress())
      expect(
        tree.root.findByProps({
          accessibilityLabel: fr.account.profile.firstName,
          autoCapitalize: "words",
        }).props.value,
      ).toBe("Marie")
      expect(tree.root.findAllByType("GlassSurface" as never)).toHaveLength(0)
    })

    test("while saving the buttons are disabled and the label says so", () => {
      mount(makeProps({ profileUpdating: true }))
      editFirstName("Autre")
      const save = tree.root.findByProps({ accessibilityLabel: fr.account.profile.save })
      expect(save.props.disabled).toBe(true)
      const texts = tree.root
        .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
        .map((node) => String([node.props.children].flat().join("")))
      expect(texts).toContain(fr.account.profile.saving)
    })
  })

  describe("Connexion section", () => {
    test("the email row shows the current email and opens an editable field on press", () => {
      mount(makeProps())
      const textsBefore = tree.root
        .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
        .map((node) => String([node.props.children].flat().join("")))
      expect(textsBefore).toContain("marie@example.org")

      const emailRow = tree.root.findByProps({ accessibilityLabel: fr.account.a11y.editEmail })
      act(() => emailRow.props.onPress())

      const texts = tree.root
        .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
        .map((node) => String([node.props.children].flat().join("")))
      expect(texts).toContain(fr.account.email.newLabel)
    })

    test("saving a new email calls onChangeEmail and closes the editor", async () => {
      const onChangeEmail = jest.fn(async () => undefined)
      mount(makeProps({ onChangeEmail }))
      act(() =>
        tree.root.findByProps({ accessibilityLabel: fr.account.a11y.editEmail }).props.onPress(),
      )

      const input = tree.root.findByProps({ label: fr.account.email.newLabel })
      act(() => input.props.onChangeText("new@example.org"))

      const saveButtons = tree.root
        .findAllByProps({ label: fr.common.actions.save })
        .filter((node) => typeof node.props.onPress === "function")
      await act(async () => {
        saveButtons[0].props.onPress()
        await Promise.resolve()
      })
      expect(onChangeEmail).toHaveBeenCalledWith("new@example.org")
    })

    test("the password row confirms before resetting", () => {
      const onPasswordReset = jest.fn(async () => undefined)
      mount(makeProps({ onPasswordReset }))
      const passwordRow = tree.root.findByProps({
        accessibilityLabel: fr.account.a11y.resetPassword,
      })
      act(() => passwordRow.props.onPress())

      expect(Alert.alert).toHaveBeenCalledWith(
        fr.account.alerts.passwordReset.title,
        fr.account.alerts.passwordReset.message("marie@example.org"),
        expect.any(Array),
      )
      const confirm = findAlertButtons().find(
        (button) => button.text === fr.account.alerts.passwordReset.confirm,
      )
      act(() => confirm?.onPress?.())
      expect(onPasswordReset).toHaveBeenCalled()
    })
  })

  test("data and about moved to Paramètres: no version, no credits row here (OA-74, OA-75)", () => {
    mount(makeProps())
    const texts = tree.root
      .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
      .map((node) => String([node.props.children].flat().join("")))
    expect(texts).not.toContain("1.2.3")
    expect(texts).not.toContain(fr.account.credits.label)
  })

  test("Se déconnecter is destructive, isolated, and confirms before logging out", () => {
    const onLogout = jest.fn(async () => undefined)
    mount(makeProps({ onLogout }))
    const signOutRow = tree.root.findByProps({ accessibilityLabel: fr.account.logout })
    act(() => signOutRow.props.onPress())

    expect(Alert.alert).toHaveBeenCalledWith(
      fr.account.alerts.logout.title,
      fr.account.alerts.logout.message,
      expect.any(Array),
    )
    const confirm = findAlertButtons().find(
      (button) => button.text === fr.account.alerts.logout.confirm,
    )
    expect(confirm?.style).toBe("destructive")
    act(() => confirm?.onPress?.())
    expect(onLogout).toHaveBeenCalled()
  })
})

type LargeStyle = Record<string, unknown>
function flattenLarge(style: unknown): LargeStyle {
  if (Array.isArray(style))
    return style.reduce<LargeStyle>((acc, s) => ({ ...acc, ...flattenLarge(s) }), {})
  return (style as LargeStyle | null | undefined) ?? {}
}

describe("AccountScreen under the native large title (12.2-17)", () => {
  function mountLarge(props: React.ComponentProps<typeof AccountScreen>) {
    act(() => {
      tree = renderer.create(
        <FrameLargeTitleContext.Provider value>
          <AccountScreen {...props} />
        </FrameLargeTitleContext.Provider>,
      )
    })
  }
  const pageTitles = () =>
    tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.children === fr.account.title,
    )

  test("the header names the page: no in-page title, the title is never doubled", () => {
    mountLarge(makeProps())
    expect(pageTitles()).toHaveLength(0)
  })

  test("the scroll view leaves the insets to iOS: automatic, no tab bar padding or indicator inset", () => {
    mountLarge(makeProps())
    const scroll = tree.root.findByType("ScrollView" as never)
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("automatic")
    expect(scroll.props.scrollIndicatorInsets).toBeUndefined()
    const content = flattenLarge(scroll.props.contentContainerStyle)
    // The 16 pt margins only; the 68 pt tab bar is inset by the system.
    expect(content.paddingTop).toBe(16)
    expect(content.paddingBottom).toBe(16)
  })

  test("outside it the page keeps its title and its own tab bar clearance", () => {
    mount(makeProps())
    expect(pageTitles()).toHaveLength(1)
    const scroll = tree.root.findByType("ScrollView" as never)
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("never")
    expect(scroll.props.scrollIndicatorInsets).toEqual({ bottom: 68 })
    expect(flattenLarge(scroll.props.contentContainerStyle).paddingBottom).toBe(68 + 16)
  })
})
