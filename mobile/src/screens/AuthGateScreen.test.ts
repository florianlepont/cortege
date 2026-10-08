import React from "react"
import renderer, { act } from "react-test-renderer"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) {
      return
    }
    if (message.includes("The current testing environment is not configured to support act")) {
      return
    }
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const mockComponent = (name: string) => {
    const ReactRef = require("react") as typeof import("react")
    return ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  }

  const animatedValue = () => ({
    interpolate: jest.fn(() => ({})),
    setValue: jest.fn(),
  })

  const Animated = {
    Value: jest.fn(() => animatedValue()),
    View: mockComponent("Animated.View"),
    Text: mockComponent("Animated.Text"),
    Image: mockComponent("Animated.Image"),
    timing: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn((anims: { start: (cb?: () => void) => void }[]) => ({
      start: (cb?: () => void) => {
        anims.forEach((a) => a.start())
        cb?.()
      },
    })),
    parallel: jest.fn((anims: { start: (cb?: () => void) => void }[]) => ({
      start: (cb?: () => void) => {
        anims.forEach((a) => a.start())
        cb?.()
      },
    })),
    loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    stagger: jest.fn((_delay: number, anims: { start: (cb?: () => void) => void }[]) => ({
      start: (cb?: () => void) => {
        anims.forEach((a) => a.start())
        cb?.()
      },
    })),
  }

  return {
    Animated,
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    },
    AppState: {
      currentState: "active",
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    Pressable: mockComponent("Pressable"),
    Image: mockComponent("Image"),
    ImageBackground: mockComponent("ImageBackground"),
    KeyboardAvoidingView: mockComponent("KeyboardAvoidingView"),
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
    },
    ScrollView: mockComponent("ScrollView"),
    StatusBar: mockComponent("StatusBar"),
    TouchableWithoutFeedback: mockComponent("TouchableWithoutFeedback"),
    View: mockComponent("View"),
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Modal: mockComponent("Modal"),
    Platform: {
      OS: "ios",
      select: <T>(options: { ios?: T; android?: T; default?: T }): T | undefined =>
        options.ios ?? options.default,
    },
    Keyboard: {
      dismiss: jest.fn(),
    },
    useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
    StyleSheet: {
      create: <T extends object>(value: T): T => value,
      hairlineWidth: 0.5,
    },
    Easing: {
      out: jest.fn((fn: unknown) => fn),
      cubic: jest.fn((t: number) => t),
    },
  }
})

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

import { compositeOver, contrastRatio } from "../app/contrast"
import { buildTheme, defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import { GlassButton } from "../ui/GlassButton"
import { AuthGateScreen } from "./AuthGateScreen"

type Handlers = {
  onLogin: jest.Mock<Promise<string | null>, []>
  onRegister: jest.Mock<Promise<string | null>, []>
  onForgotPassword: jest.Mock<Promise<void>, []>
}

const makeHandlers = (): Handlers => ({
  onLogin: jest.fn(async (): Promise<string | null> => null),
  onRegister: jest.fn(async (): Promise<string | null> => null),
  onForgotPassword: jest.fn(async (): Promise<void> => undefined),
})

const renderScreen = async (handlers: Handlers): Promise<renderer.ReactTestRenderer> => {
  let component: renderer.ReactTestRenderer | undefined
  await act(async () => {
    component = renderer.create(
      React.createElement(AuthGateScreen, {
        apiUrl: "http://localhost:3000/v1",
        onApiUrlChange: jest.fn(),
        ...handlers,
      }),
    )
  })
  return component!
}

const collectText = (node: renderer.ReactTestRendererJSON | string | null): string[] => {
  if (node === null) return []
  if (typeof node === "string") return [node]
  return (node.children ?? []).flatMap((child) => collectText(child))
}

const renderedTexts = (component: renderer.ReactTestRenderer): string[] => {
  const json = component.toJSON()
  const roots = Array.isArray(json) ? json : [json]
  return roots.flatMap((root) => collectText(root))
}

describe("AuthGateScreen", () => {
  it("calls login handler when pressing the login button", async () => {
    const handlers = makeHandlers()
    const component = await renderScreen(handlers)

    const submitButton = component.root.findByProps({ testID: "auth-submit" })
    await act(async () => {
      submitButton.props.onPress()
    })

    expect(handlers.onLogin).toHaveBeenCalledTimes(1)
    expect(handlers.onRegister).not.toHaveBeenCalled()
  })

  it("binds the register and forgot-password actions to their own handlers", async () => {
    const handlers = makeHandlers()
    const component = await renderScreen(handlers)

    await act(async () => {
      component.root.findByProps({ testID: "auth-register" }).props.onPress()
    })
    expect(handlers.onRegister).toHaveBeenCalledTimes(1)
    expect(handlers.onLogin).not.toHaveBeenCalled()

    await act(async () => {
      component.root.findByProps({ testID: "auth-forgot-password" }).props.onPress()
    })
    expect(handlers.onForgotPassword).toHaveBeenCalledTimes(1)
  })

  it("shows the sign-in texts from the French catalogue", async () => {
    const component = await renderScreen(makeHandlers())
    const texts = fr.authGate

    expect(component.root.findByProps({ testID: "auth-submit" }).props.label).toBe(
      texts.panel.login,
    )
    expect(component.root.findByProps({ testID: "auth-register" }).props.label).toBe(
      texts.panel.register,
    )
    expect(
      component.root.findByProps({ testID: "auth-forgot-password" }).props.accessibilityLabel,
    ).toBe(texts.panel.forgotPassword)

    const shown = renderedTexts(component)
    expect(shown).toEqual(
      expect.arrayContaining([
        texts.hero.title,
        texts.hero.subtitle,
        texts.panel.title,
        texts.panel.subtitle,
        texts.panel.forgotPassword,
        texts.legal.terms,
        texts.legal.privacy,
        texts.legal.website,
      ]),
    )
  })

  it("shows the error returned by the login handler", async () => {
    const handlers = makeHandlers()
    handlers.onLogin.mockResolvedValueOnce("Identifiants invalides")
    const component = await renderScreen(handlers)

    await act(async () => {
      component.root.findByProps({ testID: "auth-submit" }).props.onPress()
    })

    expect(renderedTexts(component)).toContain("Identifiants invalides")
    // 12.2-21 dark pass: the danger ink of the scheme, not the brand terracotta (3:1 in light).
    const message = component.root.find(
      (node) =>
        (node.type as unknown) === "Text" && node.props.children === "Identifiants invalides",
    )
    const style = Object.assign({}, ...[message.props.style].flat(3).filter(Boolean))
    expect(style.color).toBe(defaultTheme.onSurface.danger)
  })

  it("the error message reads at 4.5:1 on its banner in both schemes (12.2-21)", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = buildTheme("automatic", scheme, () => {})
      const surface = theme.semanticColors.errorSurface
      const banner = surface.startsWith("rgba")
        ? compositeOver(surface, theme.colors.canvas)
        : surface
      expect(contrastRatio(theme.onSurface.danger, banner)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("uses the glass buttons: forest primary, neutral secondary, the link stays a text link", async () => {
    const component = await renderScreen(makeHandlers())

    const submit = component.root.findByProps({ testID: "auth-submit" })
    const register = component.root.findByProps({ testID: "auth-register" })
    expect(submit.type).toBe(GlassButton)
    expect(register.type).toBe(GlassButton)
    expect(submit.props.variant).toBeUndefined()
    expect(register.props.variant).toBe("secondary")
    // The big buttons keep their 44 pt minimum height.
    expect(submit.props.size ?? "lg").toBe("lg")
    expect(register.props.size).toBe("md")
    expect(component.root.findByProps({ testID: "auth-forgot-password" }).type).not.toBe(
      GlassButton,
    )
  })

  it("shows the loading state on the login button and disables the register one while signing in", async () => {
    const handlers = makeHandlers()
    let finish: (value: string | null) => void = () => undefined
    handlers.onLogin.mockImplementationOnce(
      () => new Promise<string | null>((resolve) => (finish = resolve)),
    )
    const component = await renderScreen(handlers)

    await act(async () => {
      component.root.findByProps({ testID: "auth-submit" }).props.onPress()
    })
    const submit = component.root.findByProps({ testID: "auth-submit" })
    expect(submit.props.loading).toBe(true)
    expect(submit.props.label).toBe(fr.authGate.panel.loginInProgress)
    expect(component.root.findByProps({ testID: "auth-register" }).props.disabled).toBe(true)

    await act(async () => {
      finish(null)
    })
    expect(component.root.findByProps({ testID: "auth-submit" }).props.loading).toBe(false)
  })
})
