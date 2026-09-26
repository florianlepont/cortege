import React from "react"
import renderer, { act } from "react-test-renderer"
import {
  IBP_CAS_VALUES,
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  type IbpMethodVersion,
} from "@cortege/ibp-domain"
import { REGION_OPTIONS, VEGETATION_STAGE_OPTIONS_BY_REGION } from "../../app/constants"
import { fr } from "../../i18n"
import type { SurveyFormMethod } from "./MethodVersionPicker"
import { ScoringContextSection, scoringContextPills } from "./ScoringContextSection"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) {
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
  return {
    Pressable: mockComponent("Pressable"),
    Switch: mockComponent("Switch"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
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
    AppSectionHeader: ({ title, subtitle }: { title: string; subtitle?: string }) =>
      ReactRef.createElement("AppSectionHeader", { title, subtitle }),
  }
})

jest.mock("../../ui/AppChoiceChip", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppChoiceChip: (props: { label: string; active?: boolean; onPress?: () => void }) =>
      ReactRef.createElement("AppChoiceChip", props),
  }
})

type Node = renderer.ReactTestInstance

const textOf = (node: Node): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

const makeMethod = (overrides: Partial<SurveyFormMethod> = {}): SurveyFormMethod => ({
  version: IBP_METHOD_V3_2,
  cas: 1,
  cas3Scale: false,
  locked: false,
  setVersion: jest.fn(),
  setCas: jest.fn(),
  setCas3Scale: jest.fn(),
  ...overrides,
})

const renderSection = (method: SurveyFormMethod) => {
  const onRegionChange = jest.fn()
  const setVegetationStage = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <ScoringContextSection
        method={method}
        regionVersion="ACA"
        vegetationStage="collineen"
        onRegionChange={onRegionChange}
        setVegetationStage={setVegetationStage}
      />,
    )
  })
  const chips = tree.root.findAllByType("AppChoiceChip" as unknown as React.ElementType)
  const switches = tree.root.findAllByType("Switch" as unknown as React.ElementType)
  const texts = tree.root
    .findAllByType("Text" as unknown as React.ElementType)
    .map((node) => textOf(node))
  const header = tree.root.findByType("AppSectionHeader" as unknown as React.ElementType)
  return { chips, switches, texts, header, onRegionChange, setVegetationStage }
}

describe("ScoringContextSection, v3.2", () => {
  test("shows the four cas chips with their captions, cas 1 selected, and the cas-3 switch", () => {
    const { chips, switches, texts, header } = renderSection(makeMethod())
    expect(chips.map((chip) => chip.props.label)).toEqual(
      IBP_CAS_VALUES.map((cas) => fr.ibpMethod.casLabels[cas]),
    )
    expect(chips.map((chip) => chip.props.active)).toEqual([true, false, false, false])
    for (const cas of IBP_CAS_VALUES) {
      expect(texts).toContain(fr.ibpMethod.casCaptions[cas])
    }
    expect(header.props.title).toBe(fr.surveyForm.region.title)
    expect(header.props.subtitle).toBe(fr.surveyForm.scoringContext.casSubtitle)
    expect(texts).toContain(fr.ibpMethod.casTitle)
    expect(texts).toContain(fr.ibpMethod.cas3ScaleLabel)
    expect(texts).toContain(fr.ibpMethod.cas3ScaleHint)
    expect(switches).toHaveLength(1)
    expect(switches[0].props.value).toBe(false)
    expect(switches[0].props.accessibilityRole).toBe("switch")
    expect(switches[0].props.accessibilityLabel).toBe(fr.ibpMethod.cas3ScaleLabel)
    expect(switches[0].props.accessibilityHint).toBe(fr.ibpMethod.cas3ScaleHint)
    // No region or stage chip in v3.2.
    expect(texts).not.toContain(fr.surveyForm.region.label)
  })

  test("pressing Cas 3 selects cas 3; toggling the switch sets the cas-3 scale", () => {
    const method = makeMethod()
    const { chips, switches } = renderSection(method)
    act(() => {
      chips[2].props.onPress()
    })
    expect(method.setCas).toHaveBeenCalledWith(3)
    act(() => {
      switches[0].props.onValueChange(true)
    })
    expect(method.setCas3Scale).toHaveBeenCalledWith(true)
  })

  test("with no cas yet, no chip is selected and the section asks for one", () => {
    const { chips, texts } = renderSection(makeMethod({ cas: null, cas3Scale: true }))
    expect(chips.every((chip) => chip.props.active === false)).toBe(true)
    expect(texts).toContain(fr.surveyForm.scoringContext.casMissing)
  })
})

describe("ScoringContextSection, v3.0 and untagged", () => {
  test.each<[string, IbpMethodVersion | null]>([
    ["v3.0", IBP_METHOD_V3_0],
    ["untagged", null],
  ])("%s shows the region and stage chips and no cas", (_name, version) => {
    const { chips, switches, texts, header, onRegionChange, setVegetationStage } = renderSection(
      makeMethod({ version, cas: null }),
    )
    const stages = VEGETATION_STAGE_OPTIONS_BY_REGION.ACA
    expect(chips.map((chip) => chip.props.label)).toEqual([
      ...REGION_OPTIONS.map((option) => option.label),
      ...stages.map((option) => option.label),
    ])
    expect(switches).toHaveLength(0)
    expect(header.props.subtitle).toBe(fr.surveyForm.region.subtitle)
    expect(texts).toContain(fr.surveyForm.region.label)
    expect(texts).toContain(fr.surveyForm.vegetation.label)
    expect(texts).not.toContain(fr.ibpMethod.casTitle)

    act(() => {
      chips[1].props.onPress()
    })
    expect(onRegionChange).toHaveBeenCalledWith(REGION_OPTIONS[1].value)
    act(() => {
      chips[REGION_OPTIONS.length].props.onPress()
    })
    expect(setVegetationStage).toHaveBeenCalledWith(stages[0].value)
  })
})

describe("scoringContextPills (wizard hero copy)", () => {
  test("a new v3.2 survey shows its cas and the version", () => {
    const pills = scoringContextPills({
      version: IBP_METHOD_V3_2,
      cas: 1,
      regionLabel: "Atlantique",
      vegetationLabel: "Collinéen",
    })
    expect(pills).toEqual([fr.ibpMethod.casLabels[1], fr.ibpMethod.versions[IBP_METHOD_V3_2]])
    expect(pills.join(" ")).toContain("Cas 1")
    expect(pills.join(" ")).toContain("IBP v3.2")
  })

  test("a v3.2 survey without a cas says the cas is missing", () => {
    expect(
      scoringContextPills({
        version: IBP_METHOD_V3_2,
        cas: null,
        regionLabel: "R",
        vegetationLabel: "V",
      })[0],
    ).toBe(fr.surveyForm.scoringContext.casMissing)
  })

  test.each<[string, IbpMethodVersion | null]>([
    ["v3.0", IBP_METHOD_V3_0],
    ["untagged", null],
  ])("a %s survey shows its region and stage", (_name, version) => {
    expect(
      scoringContextPills({ version, cas: null, regionLabel: "R", vegetationLabel: "V" }),
    ).toEqual(["R", "V"])
  })
})
