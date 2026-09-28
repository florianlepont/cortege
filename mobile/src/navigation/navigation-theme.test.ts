jest.mock("@react-navigation/native", () => ({
  DefaultTheme: { dark: false, colors: { primary: "light-primary", notification: "light-notif" } },
  DarkTheme: { dark: true, colors: { primary: "dark-primary", notification: "dark-notif" } },
}))

import { buildNavigationTheme, statusBarStyleForScheme } from "./navigation-theme"

const semanticColors = {
  backgroundCanvas: "canvas",
  surfaceElevated: "elevated",
  textPrimary: "text",
  surfaceSoft: "soft",
} as never

describe("statusBarStyleForScheme", () => {
  test("dark scheme reads light-content", () => {
    expect(statusBarStyleForScheme("dark")).toBe("light-content")
  })

  test("light scheme reads dark-content", () => {
    expect(statusBarStyleForScheme("light")).toBe("dark-content")
  })
})

describe("buildNavigationTheme", () => {
  test("dark scheme starts from DarkTheme and overlays the app's semantic colors", () => {
    const theme = buildNavigationTheme("dark", semanticColors)
    expect(theme.dark).toBe(true)
    expect(theme.colors.primary).toBe("dark-primary")
    expect(theme.colors.background).toBe("canvas")
    expect(theme.colors.card).toBe("elevated")
    expect(theme.colors.text).toBe("text")
    expect(theme.colors.border).toBe("soft")
  })

  test("light scheme starts from DefaultTheme and overlays the app's semantic colors", () => {
    const theme = buildNavigationTheme("light", semanticColors)
    expect(theme.dark).toBe(false)
    expect(theme.colors.primary).toBe("light-primary")
    expect(theme.colors.background).toBe("canvas")
  })
})
