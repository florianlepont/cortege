jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import { compositeOver, contrastRatio } from "../app/contrast"
import { buildTheme } from "../app/theme"

// Redesign brief B-C3: the drawing ink (`semanticColors.ctaPrimary`) on its moss plate
// (`visual.glass.iconTile`). A drawing is a graphic, not text: 3:1 (WCAG 1.4.11). The plate sits on
// the sheet, whose glass is approximated by the card fill over the canvas, or by the canvas alone.
const GRAPHIC = 3

describe.each(["light", "dark"] as const)(
  "dendromicrohabitat drawing contrast, %s scheme",
  (scheme) => {
    const { colors, semanticColors, visual } = buildTheme(scheme)
    const card = compositeOver(visual.glass.cardFill, colors.canvas)
    const plates = {
      "over the canvas": compositeOver(visual.glass.iconTile, colors.canvas),
      "over the glass card": compositeOver(visual.glass.iconTile, card),
    }

    test.each(Object.keys(plates))("the brand ink on the plate %s is at least 3:1", (where) => {
      const plate = plates[where as keyof typeof plates]
      expect(contrastRatio(semanticColors.ctaPrimary, plate)).toBeGreaterThanOrEqual(GRAPHIC)
    })
  },
)
