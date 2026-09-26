import {
  DEFAULT_VEGETATION_STAGE_BY_REGION,
  REGION_VERSIONS,
  VEGETATION_STAGES_BY_REGION,
} from "@cortege/ibp-domain"
import * as constants from "./constants"
import * as vegetation from "./vegetation"

// constants.ts reads Platform for the default API URL; the unit Jest setup does not load
// react-native itself.
jest.mock("react-native", () => ({
  Platform: { select: (options: { default?: unknown }) => options.default },
}))

// The v3.0 station context comes from the shared package (phase 01.8); the app only adds labels.
describe("vegetation (package-backed v3.0 context)", () => {
  test("offers the package's regions and stages, in the package's order", () => {
    expect(vegetation.REGION_OPTIONS.map((option) => option.value)).toEqual([...REGION_VERSIONS])
    for (const region of REGION_VERSIONS) {
      expect(
        vegetation.VEGETATION_STAGE_OPTIONS_BY_REGION[region].map((option) => option.value),
      ).toEqual([...VEGETATION_STAGES_BY_REGION[region]])
    }
  })

  test("takes each region's default stage from the package", () => {
    for (const region of REGION_VERSIONS) {
      expect(vegetation.defaultVegetationStageForRegion(region)).toBe(
        DEFAULT_VEGETATION_STAGE_BY_REGION[region],
      )
    }
  })

  test("constants re-exports the same context helpers", () => {
    expect(constants.REGION_OPTIONS).toBe(vegetation.REGION_OPTIONS)
    expect(constants.VEGETATION_STAGE_OPTIONS_BY_REGION).toBe(
      vegetation.VEGETATION_STAGE_OPTIONS_BY_REGION,
    )
    expect(constants.defaultVegetationStageForRegion).toBe(
      vegetation.defaultVegetationStageForRegion,
    )
    expect(constants.normalizeVegetationStageForRegion).toBe(
      vegetation.normalizeVegetationStageForRegion,
    )
    expect(constants.normalizeVegetationStageForRegion("M", undefined)).toBe("thermo_mediterraneen")
  })
})
