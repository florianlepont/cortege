/**
 * 12.2-17 (collapsing titles): the native iOS large title options and the one switch that turns
 * them on (the native iOS tab tree), so a page never gets the native title without its insets.
 */

const mockPlatform: { OS: "ios" | "android"; Version: number | string | undefined } = {
  OS: "ios",
  Version: 26,
}

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatform.OS
    },
    get Version() {
      return mockPlatform.Version
    },
  },
}))

const mockAvailability = { native: true }
jest.mock("../native-tabs-availability", () => ({
  getNativeTabsAvailability: () => ({ native: mockAvailability.native }),
}))

import { brandTypography } from "../../app/brand-tokens"
import { buildTheme, defaultTheme } from "../../app/theme"
import { usesNativeLargeTitle } from "../large-title"
import {
  COLLAPSED_BAR_BLUR,
  hiddenNativeTitle,
  nativeLargeTitle,
  pageTitleOptions,
} from "./stack-options"

beforeEach(() => {
  mockPlatform.OS = "ios"
  mockPlatform.Version = 26
  mockAvailability.native = true
})

describe("nativeLargeTitle", () => {
  test("a large title that collapses into the small centred title, transparent and shadowless", () => {
    const options = nativeLargeTitle(defaultTheme)
    expect(options.headerLargeTitleEnabled).toBe(true)
    expect(options.headerLargeTitleShadowVisible).toBe(false)
    expect(options.headerLargeStyle).toEqual({ backgroundColor: "transparent" })
    // The deprecated alias is not used: it would be overridden by the new name anyway.
    expect(options).not.toHaveProperty("headerLargeTitle")
  })

  test("both titles in Sora SemiBold and the theme's strong text colour, weight given with the family", () => {
    const options = nativeLargeTitle(defaultTheme)
    const color = defaultTheme.semanticColors.textStrong
    expect(options.headerLargeTitleStyle).toEqual({
      fontFamily: brandTypography.navLargeTitle.fontFamily,
      fontSize: brandTypography.navLargeTitle.fontSize,
      fontWeight: "600",
      color,
    })
    expect(options.headerTitleStyle).toEqual({
      fontFamily: brandTypography.navTitle.fontFamily,
      fontSize: brandTypography.navTitle.fontSize,
      fontWeight: "600",
      color,
    })
    expect(brandTypography.navLargeTitle).toEqual({ fontSize: 28, fontFamily: "Sora-SemiBold" })
    expect(brandTypography.navTitle).toEqual({ fontSize: 17, fontFamily: "Sora-SemiBold" })
  })

  test("follows the scheme: the dark theme's strong text colour", () => {
    const dark = buildTheme("dark", "dark", () => {})
    const options = nativeLargeTitle(dark)
    const large = options.headerLargeTitleStyle as { color: string }
    const small = options.headerTitleStyle as { color: string }
    expect(large.color).toBe(dark.semanticColors.textStrong)
    expect(small.color).toBe(dark.semanticColors.textStrong)
    expect(large.color).not.toBe(defaultTheme.semanticColors.textStrong)
  })

  test.each([
    [26, true],
    ["26.1", true],
    [27, true],
    ["27.0.1", true],
    [18, false],
    ["17.5", false],
    [undefined, false],
  ])(
    "iOS %s: the collapsed bar is blurred; top scroll edge effect hidden: %s",
    (version, hidesEdge) => {
      mockPlatform.Version = version
      const options = nativeLargeTitle(defaultTheme)
      // Owner, batch 3 round 2: a blur behind the collapsed title, on every iOS version.
      expect(options.headerBlurEffect).toBe("systemChromeMaterial")
      expect(COLLAPSED_BAR_BLUR).toBe("systemChromeMaterial")
      if (hidesEdge) {
        // Only the top edge: the bottom edge (the tab bar) keeps the system default.
        expect(options.scrollEdgeEffects).toEqual({ top: "hidden" })
      } else {
        expect(options).not.toHaveProperty("scrollEdgeEffects")
      }
    },
  )

  test("the large title state stays transparent, so the blur shows only once content is under it", () => {
    const options = nativeLargeTitle(defaultTheme)
    expect(options.headerLargeStyle).toEqual({ backgroundColor: "transparent" })
    expect(options.headerBlurEffect).not.toBe("none")
  })

  test("no iOS 26 scroll edge setting outside iOS", () => {
    mockPlatform.OS = "android"
    mockPlatform.Version = 34
    const options = nativeLargeTitle(defaultTheme)
    expect(options.headerBlurEffect).toBe("systemChromeMaterial")
    expect(options).not.toHaveProperty("scrollEdgeEffects")
  })
})

describe("pageTitleOptions and usesNativeLargeTitle", () => {
  test("the native iOS tab tree uses the native large title", () => {
    mockAvailability.native = true
    expect(usesNativeLargeTitle()).toBe(true)
    expect(pageTitleOptions(defaultTheme)).toEqual(nativeLargeTitle(defaultTheme))
  })

  test("Android and Expo Go keep the page's own title and hide the native one (OA-21)", () => {
    mockAvailability.native = false
    expect(usesNativeLargeTitle()).toBe(false)
    expect(pageTitleOptions(defaultTheme)).toBe(hiddenNativeTitle)
  })
})
