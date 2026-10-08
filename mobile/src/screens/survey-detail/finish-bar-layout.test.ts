import { brandComponentTokens } from "../../app/brand-tokens"
import { estimateFinishBarHeight, FINISH_BAR, finishBarBottomPadding } from "./finish-bar-layout"

describe("finish bar layout", () => {
  test("the button sits above the tab bar: clearance plus an 8 pt gap", () => {
    expect(FINISH_BAR.tabBarGap).toBe(8)
    expect(finishBarBottomPadding(90)).toBe(98)
  })

  test("the bar height is the air above, the 50 pt large button and the bottom padding", () => {
    expect(brandComponentTokens.button.minHeightLarge).toBe(50)
    expect(estimateFinishBarHeight(90)).toBe(10 + 50 + 98)
  })

  test("a taller tab bar makes a taller bar, point for point", () => {
    expect(estimateFinishBarHeight(110) - estimateFinishBarHeight(90)).toBe(20)
  })
})
