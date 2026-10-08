import React from "react"
import renderer, { act, ReactTestRenderer } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2, IbpCas } from "@cortege/ibp-domain"
import { SurveyDetailResponse } from "../../app/types"
import { brandComponentTokens, brandRadius } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { LocalDraftMeta } from "./useLocalDraftSummary"
import { resolveScoringContext, ScoringContext, ScoringContextEditor } from "./ScoringContextEditor"

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
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Switch: mockComponent("Switch"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
  }
})

jest.mock("../../ui/AppChoiceChip", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppChoiceChip: ({
      label,
      active,
      onPress,
    }: {
      label: string
      active?: boolean
      onPress?: () => void
    }) => ReactRef.createElement("AppChoiceChip", { label, active, onPress }),
  }
})
jest.mock("../../ui/AppStatusChip", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppStatusChip: ({ label }: { label: string }) =>
      ReactRef.createElement("AppStatusChip", { label }),
  }
})
jest.mock("../../ui/AppButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppButton: ({
      label,
      accessibilityLabel,
      onPress,
    }: {
      label: string
      accessibilityLabel?: string
      onPress?: () => void
    }) => ReactRef.createElement("AppButton", { label, accessibilityLabel, onPress }),
  }
})
jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})
jest.mock("../../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({
      title,
      subtitle,
      trailing,
    }: {
      title: string
      subtitle?: string
      trailing?: React.ReactNode
    }) => ReactRef.createElement("AppSectionHeader", { title, subtitle }, trailing),
  }
})

const SURVEY_ID = "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f"
const m = fr.ibpMethod
const t = fr.surveyDetail.summary

type Handlers = {
  onOpenParcels: jest.Mock
  onUpdateRegionVersion: jest.Mock
  onUpdateVegetationStage: jest.Mock
  onUpdateIbpCas: jest.Mock
  onUpdateCas3Scale: jest.Mock
  onSwitchToV32: jest.Mock
}

const makeHandlers = (): Handlers => ({
  onOpenParcels: jest.fn(),
  onUpdateRegionVersion: jest.fn(),
  onUpdateVegetationStage: jest.fn(),
  onUpdateIbpCas: jest.fn(),
  onUpdateCas3Scale: jest.fn(),
  onSwitchToV32: jest.fn(),
})

const render = (
  scoringContext: ScoringContext,
  canEditSurvey: boolean,
  handlers: Handlers = makeHandlers(),
): ReactTestRenderer => {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <ScoringContextEditor
        surveyId={SURVEY_ID}
        canEditSurvey={canEditSurvey}
        scoringContext={scoringContext}
        activeRegion="ACA"
        activeVegetationStage="collineen"
        {...handlers}
      />,
    )
  })
  return tree as ReactTestRenderer
}

const allText = (tree: ReactTestRenderer): string => JSON.stringify(tree.toJSON())
const chips = (tree: ReactTestRenderer) => tree.root.findAllByType("AppChoiceChip" as never)
const chipByLabel = (tree: ReactTestRenderer, label: string) =>
  chips(tree).find((chip) => chip.props.label === label)
const buttons = (tree: ReactTestRenderer) => tree.root.findAllByType("AppButton" as never)
const casOptions = (tree: ReactTestRenderer) =>
  tree.root.findAll(
    (node) =>
      (node.type as unknown) === "Pressable" &&
      String(node.props.testID ?? "").startsWith("cas-option-"),
  )
const casOption = (tree: ReactTestRenderer, cas: number) =>
  tree.root.find(
    (node) => (node.type as unknown) === "Pressable" && node.props.testID === `cas-option-${cas}`,
  )
const switches = (tree: ReactTestRenderer) => tree.root.findAllByType("Switch" as never)
const statusLabels = (tree: ReactTestRenderer): string[] =>
  tree.root.findAllByType("AppStatusChip" as never).map((chip) => chip.props.label as string)

const v32 = (cas: IbpCas | null, flag = false): ScoringContext => ({
  ibp_method_version: IBP_METHOD_V3_2,
  ibp_cas: cas,
  ibp_cas3_scale: flag,
})
const untagged: ScoringContext = { ibp_method_version: null, ibp_cas: null, ibp_cas3_scale: false }
const v30: ScoringContext = {
  ibp_method_version: IBP_METHOD_V3_0,
  ibp_cas: null,
  ibp_cas3_scale: false,
}

describe("ScoringContextEditor, submitted surveys (D-02: read-only)", () => {
  test("a submitted v3.2 survey shows its version and cas, with nothing pressable", () => {
    const tree = render(v32(3), false)
    expect(statusLabels(tree)).toEqual(
      expect.arrayContaining([m.versions[IBP_METHOD_V3_2], m.casLabels[3]]),
    )
    expect(allText(tree)).toContain("IBP v3.2")
    expect(allText(tree)).toContain("Cas 3")
    expect(allText(tree)).toContain(m.versionLockedHint)
    expect(chips(tree)).toHaveLength(0)
    expect(switches(tree)).toHaveLength(0)
    expect(buttons(tree)).toHaveLength(0)
  })

  test("a submitted v3.2 survey on the cas-3 scale says so", () => {
    const tree = render(v32(2, true), false)
    expect(statusLabels(tree)).toEqual(expect.arrayContaining([m.casLabels[2], m.cas3ScaleLabel]))
  })

  test("a submitted v3.2 survey without a cas shows no cas chip", () => {
    const tree = render(v32(null), false)
    expect(statusLabels(tree)).toEqual([m.versions[IBP_METHOD_V3_2]])
  })

  test("an untagged submitted survey reads as v3.0 with its region and stage", () => {
    const tree = render(untagged, false)
    const labels = statusLabels(tree)
    expect(labels[0]).toBe(m.legacyVersionLabel)
    expect(labels[0]).toContain("IBP v3.0")
    expect(labels).toEqual(
      expect.arrayContaining([
        t.region(fr.labels.regions.ACA),
        t.vegetation(fr.labels.vegetationStages.collineen),
      ]),
    )
    expect(chips(tree)).toHaveLength(0)
    expect(buttons(tree)).toHaveLength(0)
  })

  test("an explicit v3.0 submitted survey shows the v3.0 version label", () => {
    const tree = render(v30, false)
    expect(statusLabels(tree)[0]).toBe(m.versions[IBP_METHOD_V3_0])
  })

  test("an unsupported version shows the unknown-method label and no controls", () => {
    const tree = render({ ibp_method_version: "v9", ibp_cas: null, ibp_cas3_scale: false }, true)
    expect(statusLabels(tree)).toEqual([t.unknownMethod])
    expect(chips(tree)).toHaveLength(0)
    expect(switches(tree)).toHaveLength(0)
    expect(buttons(tree).map((button) => button.props.label)).toEqual([t.editParcels])
  })
})

describe("ScoringContextEditor, v3.0 drafts", () => {
  test("a v3.0 draft shows the region and stage chips and the switch to v3.2", () => {
    const handlers = makeHandlers()
    const tree = render(v30, true, handlers)
    const labels = chips(tree).map((chip) => chip.props.label as string)
    expect(labels.length).toBeGreaterThan(2)
    expect(labels).not.toContain(m.casLabels[1])

    const switchButton = buttons(tree).find((button) => button.props.label === m.switchToV32)
    expect(switchButton).toBeDefined()
    expect(allText(tree)).toContain(m.switchToV32Hint)
    act(() => switchButton!.props.onPress())
    expect(handlers.onSwitchToV32).toHaveBeenCalledWith(SURVEY_ID)

    act(() => chips(tree)[1].props.onPress())
    expect(handlers.onUpdateRegionVersion).toHaveBeenCalledWith(SURVEY_ID, "M")
    const stageChip = chipByLabel(tree, fr.labels.vegetationStages.collineen)
    act(() => stageChip!.props.onPress())
    expect(handlers.onUpdateVegetationStage).toHaveBeenCalledWith(SURVEY_ID, "collineen")
  })

  test("an untagged draft also offers the switch and shows the legacy label", () => {
    const handlers = makeHandlers()
    const tree = render(untagged, true, handlers)
    expect(statusLabels(tree)[0]).toBe(m.legacyVersionLabel)
    const switchButton = buttons(tree).find((button) => button.props.label === m.switchToV32)
    act(() => switchButton!.props.onPress())
    expect(handlers.onSwitchToV32).toHaveBeenCalledWith(SURVEY_ID)
  })

  test("the edit-parcels button opens the parcels", () => {
    const handlers = makeHandlers()
    const tree = render(v30, true, handlers)
    const parcels = buttons(tree).find((button) => button.props.label === t.editParcels)
    act(() => parcels!.props.onPress())
    expect(handlers.onOpenParcels).toHaveBeenCalledTimes(1)
  })
})

describe("ScoringContextEditor, v3.2 drafts (D-08)", () => {
  test("pressing Cas 2 updates the cas and the switch updates the cas-3 scale", () => {
    const handlers = makeHandlers()
    const tree = render(v32(1), true, handlers)
    expect(casOptions(tree).map((option) => option.props.accessibilityLabel)).toEqual(
      [1, 2, 3, 4].map((cas) =>
        fr.surveyForm.wizard.optionA11y({
          label: m.casLabels[cas as IbpCas],
          caption: m.casCaptions[cas as IbpCas],
        }),
      ),
    )
    expect(casOption(tree, 1).props.accessibilityState).toEqual({ selected: true })
    expect(allText(tree)).toContain(m.casCaptions[1])
    expect(buttons(tree).map((button) => button.props.label)).not.toContain(m.switchToV32)

    act(() => casOption(tree, 2).props.onPress())
    expect(handlers.onUpdateIbpCas).toHaveBeenCalledWith(SURVEY_ID, 2)

    const [scaleSwitch] = switches(tree)
    expect(scaleSwitch.props.value).toBe(false)
    expect(scaleSwitch.props.accessibilityRole).toBe("switch")
    expect(scaleSwitch.props.accessibilityLabel).toBe(m.cas3ScaleLabel)
    act(() => scaleSwitch.props.onValueChange(true))
    expect(handlers.onUpdateCas3Scale).toHaveBeenCalledWith(SURVEY_ID, true)
  })

  test("a v3.2 draft without a cas shows the cas chips with none selected", () => {
    const tree = render(v32(null), true)
    expect(casOptions(tree)).toHaveLength(4)
    expect(
      casOptions(tree).some((option) => option.props.accessibilityState.selected === true),
    ).toBe(false)
    expect(allText(tree)).toContain(t.casMissing)
  })

  test("the switch reflects a set cas-3 scale", () => {
    const tree = render(v32(2, true), true)
    expect(switches(tree)[0].props.value).toBe(true)
  })
})

describe("resolveScoringContext", () => {
  const localMeta = (overrides: Partial<LocalDraftMeta> = {}): LocalDraftMeta => ({
    site_name: "Bois",
    region_version: "ACA",
    vegetation_stage: "collineen",
    ibp_method_version: IBP_METHOD_V3_2,
    ibp_cas: 2,
    ibp_cas3_scale: true,
    parcel_ids: [],
    observation_year: null,
    version_number: null,
    ...overrides,
  })
  const detail = (overrides: Partial<SurveyDetailResponse> = {}): SurveyDetailResponse =>
    ({
      id: SURVEY_ID,
      factor_results: {},
      scores: { ibp_total: 0, ibp_peuplement_gestion: 0, ibp_contexte: 0 },
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 4,
      ibp_cas3_scale: false,
      ...overrides,
    }) as SurveyDetailResponse

  test("a submitted survey reads the server detail first", () => {
    expect(resolveScoringContext(localMeta(), detail(), true)).toEqual(v32(4, false))
  })

  test("a draft reads its local payload first", () => {
    expect(resolveScoringContext(localMeta(), detail(), false)).toEqual(v32(2, true))
  })

  test("falls back to the other source, then to an untagged context", () => {
    expect(resolveScoringContext(localMeta(), undefined, true)).toEqual(v32(2, true))
    expect(resolveScoringContext(null, detail(), false)).toEqual(v32(4, false))
    expect(resolveScoringContext(null, undefined, false)).toEqual(untagged)
  })

  test("normalises absent and malformed fields", () => {
    expect(
      resolveScoringContext(
        null,
        detail({ ibp_method_version: undefined, ibp_cas: undefined, ibp_cas3_scale: null }),
        true,
      ),
    ).toEqual(untagged)
    expect(
      resolveScoringContext(
        localMeta({ ibp_method_version: "", ibp_cas: 7, ibp_cas3_scale: false }),
        undefined,
        false,
      ),
    ).toEqual(untagged)
  })
})

describe("ScoringContextEditor, variant I card", () => {
  test("the card is glass (fill, hairline, radius 22) on a 4 grid and keeps its chips at 44 pt", () => {
    const tree = render(v30, true)
    const card = tree.root.findAllByType("View" as never)[0]?.props.style as Record<string, unknown>
    expect(card).toMatchObject({
      backgroundColor: defaultTheme.visual.glass.cardFill,
      borderColor: defaultTheme.visual.glass.cardBorder,
      borderRadius: brandRadius.card,
    })
    expect((card.padding as number) % 4).toBe(0)
    expect((card.gap as number) % 4).toBe(0)
    expect(brandComponentTokens.choiceChip.minHeight).toBeGreaterThanOrEqual(44)
    expect(chips(tree).length).toBeGreaterThan(0)
  })
})
