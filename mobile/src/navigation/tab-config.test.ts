/**
 * BUG-07 (UX audit, Phase 2): the Android native tab bar's Accueil icon must not alias Mes
 * Relevés' icon file. The Jest image mock resolves every require("*.png") to the same value
 * (test/image.mock.ts), so the fix is verified structurally: each tab requires its own asset path.
 */
import { readFileSync } from "fs"
import { join } from "path"

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  StyleSheet: { create: <T>(value: T): T => value },
  View: "View",
}))

import { brandTypography } from "../app/brand-tokens"
import { buildTheme, defaultTheme } from "../app/theme"
import { buildJsTabBarStyle, jsTabScreenOptions } from "./tab-config"

const route = { route: { name: "home" as const } }

describe("ANDROID_TAB_ICONS (tab-config.tsx)", () => {
  test("home requires its own icon file, not surveys'", () => {
    const source = readFileSync(join(__dirname, "tab-config.tsx"), "utf8")
    const androidIcons = source.slice(
      source.indexOf("const ANDROID_TAB_ICONS"),
      source.indexOf("} as const", source.indexOf("const ANDROID_TAB_ICONS")),
    )
    const requirePathOf = (key: string): string => {
      const match = new RegExp(`${key}: require\\("([^"]+)"\\)`).exec(androidIcons)
      if (!match) throw new Error(`No require() found for ${key} in ANDROID_TAB_ICONS`)
      return match[1]
    }
    expect(requirePathOf("home")).not.toBe(requirePathOf("surveys"))
  })
})

describe("JS tab bar restyle (D-08)", () => {
  test("the bar takes the glass fill and hairline, keeps its height and stays in the layout flow", () => {
    const style = buildJsTabBarStyle(defaultTheme, { bottom: 0 })
    expect(style).toMatchObject({
      backgroundColor: defaultTheme.visual.tab.background,
      borderTopColor: defaultTheme.visual.tab.border,
      borderTopWidth: 1,
      height: 56 + 8 + 16,
      paddingBottom: 16,
      paddingTop: 8,
    })
    expect(style).not.toHaveProperty("position")
    expect(buildJsTabBarStyle(defaultTheme, { bottom: 34 }).height).toBe(56 + 8 + 34)
  })

  test.each(["light", "dark"] as const)("the %s options come from theme.visual.tab", (scheme) => {
    const theme = buildTheme(scheme)
    const options = jsTabScreenOptions(theme, route)
    expect(options.tabBarActiveTintColor).toBe(theme.visual.tab.activeTint)
    expect(options.tabBarInactiveTintColor).toBe(theme.visual.tab.inactiveTint)
    expect(options.tabBarStyle).toEqual(buildJsTabBarStyle(theme))
    expect(options.tabBarLabelStyle.fontFamily).toBe(brandTypography.meta.fontFamily)
    expect(options.tabBarLabelStyle).not.toHaveProperty("fontWeight")
  })

  test("the tab animation is a fade, and none under Reduce Motion", () => {
    expect(jsTabScreenOptions(defaultTheme, route).animation).toBe("fade")
    expect(jsTabScreenOptions(defaultTheme, route, { bottom: 0 }, {}).animation).toBe("fade")
    expect(
      jsTabScreenOptions(defaultTheme, route, { bottom: 0 }, { reducedMotion: true }).animation,
    ).toBe("none")
  })
})
