/**
 * BUG-07 (UX audit, Phase 2): the Android native tab bar's Accueil icon must not alias Mes
 * Relevés' icon file. The Jest image mock resolves every require("*.png") to the same value
 * (test/image.mock.ts), so the fix is verified structurally: each tab requires its own asset path.
 */
import { readFileSync } from "fs"
import { join } from "path"

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
