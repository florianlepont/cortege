jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import { brandColors } from "./brand-tokens"
import { compositeOver, contrastRatio } from "./contrast"
import { buildTheme } from "./theme"
import { mapControlGlass, tabActiveTint } from "./visual-tokens"

// 12.2-23 (owner on iOS 26 in dark: "le tab de navigation sélectionné est peu lisible"). The native
// bar, its selection pill and its glass are system drawn, so they are modelled at their worst:
// - dark: the pill at its darkest grey (#3A3A3C), and the bar's dark glass (a 72% Graphite) over the
//   dark list of Mes Relevés and over the white plan of the Explorer;
// - light: the pill at its darkest light grey (#D1D1D6), and the bar's light glass (a 72% paper)
//   over the white plan and over the dark orthophoto.
// The selected icon needs 3:1 and its label 4.5:1 on each.
const themes = {
  light: buildTheme("light"),
  dark: buildTheme("dark"),
}

const darkGlass = "rgba(28, 28, 30, 0.72)"
const lightGlass = "rgba(250, 250, 250, 0.72)"
const whitePlan = "#FFFFFF"
const darkOrthophoto = "#1C2618"

const backgrounds = {
  dark: {
    "selection pill": "#3A3A3C",
    "glass over the list": compositeOver(darkGlass, themes.dark.colors.canvas),
    "glass over a card": compositeOver(darkGlass, themes.dark.colors.panel),
    "glass over the white plan": compositeOver(darkGlass, whitePlan),
  },
  light: {
    "selection pill": "#D1D1D6",
    "glass over the white plan": compositeOver(lightGlass, whitePlan),
    "glass over the list": compositeOver(lightGlass, themes.light.colors.canvas),
    "glass over the orthophoto": compositeOver(lightGlass, darkOrthophoto),
  },
} as const

describe("selected tab tint (12.2-23)", () => {
  test("light keeps the charter forest, dark takes the light moss of the map controls", () => {
    expect(tabActiveTint.light).toBe(brandColors.forest)
    expect(tabActiveTint.dark).toBe(mapControlGlass.dark.icon)
  })

  test.each(["light", "dark"] as const)("the %s theme's tab tint is that scheme's token", (s) => {
    expect(themes[s].visual.tab.activeTint).toBe(tabActiveTint[s])
  })

  describe.each(["light", "dark"] as const)("%s bar", (scheme) => {
    test.each(Object.keys(backgrounds[scheme]))(
      "the selected icon reaches 3:1 and its label 4.5:1 on the %s",
      (key) => {
        const background = backgrounds[scheme][key as keyof (typeof backgrounds)[typeof scheme]]
        const ratio = contrastRatio(tabActiveTint[scheme], background)
        expect(ratio).toBeGreaterThanOrEqual(3)
        expect(ratio).toBeGreaterThanOrEqual(4.5)
      },
    )
  })

  test("the dark accent moss it replaces failed 4.5:1 on the dark glass over the white plan", () => {
    const before = themes.dark.visual.accentText
    expect(before).not.toBe(tabActiveTint.dark)
    expect(contrastRatio(before, backgrounds.dark["glass over the white plan"])).toBeLessThan(4.5)
  })

  test("the JS bar's tint keeps 4.5:1 on its own glass over the canvas, both schemes", () => {
    for (const scheme of ["light", "dark"] as const) {
      const { visual, colors } = themes[scheme]
      const bar = compositeOver(visual.tab.background, colors.canvas)
      expect(contrastRatio(visual.tab.activeTint, bar)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
