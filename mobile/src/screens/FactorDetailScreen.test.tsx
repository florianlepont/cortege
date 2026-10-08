import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2, type IbpMethodVersion } from "@cortege/ibp-domain"
import type { FactorField, FactorKey } from "../app/types"
import { fr } from "../i18n"
import { defaultTheme } from "../app/theme"
import { FactorDetailScreen } from "./FactorDetailScreen"
import {
  createDetailStyles,
  HELP_LINK_MIN_HEIGHT,
  SCORE_LINE_MIN_HEIGHT,
} from "./factor-detail.styles"

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
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  }
})

jest.mock("../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({
      children,
      variant,
      padding,
    }: {
      children?: React.ReactNode
      variant?: string
      padding?: number
    }) => ReactRef.createElement("AppCard", { variant, padding }, children),
  }
})

jest.mock("../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({ title, subtitle }: { title: string; subtitle?: string }) =>
      ReactRef.createElement("AppSectionHeader", { title, subtitle }),
  }
})

// The status variant is not under test here: only the selectable chips render.
jest.mock("../ui/AppChoiceChip", () => {
  const actual = jest.requireActual<typeof import("../ui/AppChoiceChip")>("../ui/AppChoiceChip")
  return {
    AppChoiceChip: (props: { variant?: string }) =>
      props.variant === "status" ? null : actual.AppChoiceChip(props as never),
  }
})

jest.mock("../ui/AppField", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppField: (props: { label: string }) => ReactRef.createElement("AppField", props),
  }
})

jest.mock("../ui/FactorGenusListInput", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    FactorGenusListInput: (props: { label: string }) =>
      ReactRef.createElement("FactorGenusListInput", props),
  }
})

// FactorAGenusRecognitionEntry pulls in the camera/model flow (Modal, ActivityIndicator,
// expo-image-picker), none of which this file's minimal react-native mock provides - it is
// Factor A's own entry point, not something FactorDetailScreen's own rendering behaviour needs to
// exercise; its own test file covers it.
jest.mock("./FactorAGenusRecognitionEntry", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    FactorAGenusRecognitionEntry: (props: { genusField: { label: string } }) =>
      ReactRef.createElement("FactorAGenusRecognitionEntry", props),
  }
})

const field = (label: string, overrides: Partial<FactorField> = {}): FactorField => ({
  label,
  value: "",
  onChange: jest.fn(),
  required: true,
  error: null,
  touched: false,
  onTouch: jest.fn(),
  ...overrides,
})

const renderDetail = (
  factor: FactorKey,
  fields: FactorField[],
  methodVersion: IbpMethodVersion | null,
) => {
  let tree!: renderer.ReactTestRenderer
  const onOpenHelp = jest.fn()
  act(() => {
    tree = renderer.create(
      <FactorDetailScreen
        factor={factor}
        fields={fields}
        retainedScore={null}
        methodVersion={methodVersion}
        onOpenHelp={onOpenHelp}
      />,
    )
  })
  // Open the help sheet: its texts go to the route, which is where they are drawn.
  act(() => {
    tree.root
      .findAll(
        (node) =>
          (node.type as unknown) === "Pressable" &&
          node.props.accessibilityLabel === fr.factorDetail.helpLink,
      )[0]
      .props.onPress()
  })
  const [help, hints] = onOpenHelp.mock.calls[0] as [string, string[]]
  const texts = [help, ...hints]
  const inputs = tree.root.findAllByType("AppField" as unknown as React.ElementType)
  return { tree, texts, inputs }
}

// The genus-list field is never "required" (an explicit empty list is a valid observation,
// mirroring useSurveyForm.ts's real factorSections.A[0]).
const A_FIELDS = [field("genera", { required: false }), field("native_cover_percent")]

describe("FactorDetailScreen help per method version", () => {
  test("v3.2 shows the v3.2 help and hints for A (with the cover cap)", () => {
    const { texts } = renderDetail("A", A_FIELDS, IBP_METHOD_V3_2)
    expect(texts).toContain(fr.ibpMethod.factorHelp.A)
    expect(fr.ibpMethod.factorHelp.A).toContain("50 %")
    for (const hint of fr.ibpMethod.factorInputHints.A) {
      expect(texts).toContain(hint)
    }
    expect(texts).not.toContain(fr.labels.factorHelp.A)
  })

  test.each<[string, IbpMethodVersion | null]>([
    ["v3.0", IBP_METHOD_V3_0],
    ["untagged", null],
  ])("%s shows the v3.0 help and hints", (_name, version) => {
    const { texts } = renderDetail("A", A_FIELDS, version)
    expect(texts).toContain(fr.labels.factorHelp.A)
    for (const hint of fr.labels.factorInputHints.A) {
      expect(texts).toContain(hint)
    }
    expect(texts).not.toContain(fr.ibpMethod.factorHelp.A)
  })
})

describe("FactorDetailScreen fields", () => {
  test("A renders the genus list (not an AppField) and the native cover AppField", () => {
    const { tree, inputs } = renderDetail("A", A_FIELDS, IBP_METHOD_V3_2)
    expect(inputs.map((input) => input.props.label)).toEqual([
      fr.factorDetail.requiredField({ label: fr.factorDetail.fieldLabels.native_cover_percent }),
    ])
    const genusLists = tree.root.findAllByType(
      "FactorGenusListInput" as unknown as React.ElementType,
    )
    expect(genusLists).toHaveLength(1)
    expect(genusLists[0].props.label).toBe(fr.factorDetail.fieldLabels.genera)
  })

  test("A mounts the photo-recognition entry point, wired to the genus-list field", () => {
    const { tree } = renderDetail("A", A_FIELDS, IBP_METHOD_V3_2)
    const entries = tree.root.findAllByType(
      "FactorAGenusRecognitionEntry" as unknown as React.ElementType,
    )
    expect(entries).toHaveLength(1)
    // genusField is the raw fields[0] passed to FactorDetailScreen (fr.factorDetail.fieldLabels
    // only applies inside renderFactorField's own humanizeFieldLabel, not to this raw prop).
    expect(entries[0].props.genusField.label).toBe(A_FIELDS[0].label)
  })

  test("B mounts no photo-recognition entry point (Factor A only)", () => {
    const { tree } = renderDetail("B", [field("strata_count")], IBP_METHOD_V3_2)
    expect(
      tree.root.findAllByType("FactorAGenusRecognitionEntry" as unknown as React.ElementType),
    ).toHaveLength(0)
  })

  test("B renders no AppField (chips variant, FLOW-01)", () => {
    const { inputs } = renderDetail("B", [field("strata_count")], IBP_METHOD_V3_2)
    expect(inputs).toHaveLength(0)
  })

  test("B renders one chip per strata tier", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor="B"
          fields={[field("strata_count")]}
          retainedScore={null}
          methodVersion={IBP_METHOD_V3_2}
          onOpenHelp={jest.fn()}
        />,
      )
    })
    const chips = tree.root.findAll(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        node.props.accessibilityState &&
        "selected" in node.props.accessibilityState,
    )
    expect(chips).toHaveLength(fr.factorInput.strataOptions.length)
  })

  test("C renders two counters and one numeric surface field", () => {
    const { inputs } = renderDetail(
      "C",
      [field("bmg_count"), field("bmm_count"), field("surface_ha")],
      IBP_METHOD_V3_2,
    )
    // Only the numeric surface_ha field renders as an AppField; the two counts are counters.
    expect(inputs).toHaveLength(1)
    expect(inputs[0].props.label).toBe(
      fr.factorDetail.requiredField({ label: fr.factorDetail.fieldLabels.surface_ha }),
    )
  })

  test("H renders no AppField (segmented variant, 0/2/5 only)", () => {
    const { inputs } = renderDetail("H", [field("class_score")], IBP_METHOD_V3_2)
    expect(inputs).toHaveLength(0)
  })
})

describe("FactorDetailScreen variant I hierarchy, field sizes unchanged (12.2-15)", () => {
  type Style = Record<string, unknown>
  const flat = (style: unknown): Style =>
    Array.isArray(style)
      ? style.reduce<Style>((acc, part) => ({ ...acc, ...flat(part) }), {})
      : ((style ?? {}) as Style)
  const glass = defaultTheme.visual.glass
  const renderPlain = (retainedScore: { selected_class: string; score: number } | null) => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor="F"
          fields={[field("trees_per_ha")]}
          retainedScore={retainedScore as never}
          methodVersion={IBP_METHOD_V3_2}
          onOpenHelp={jest.fn()}
        />,
      )
    })
    return tree
  }
  const scoreLine = (tree: renderer.ReactTestRenderer) =>
    flat(
      tree.root.findAll(
        (n) => (n.type as unknown) === "View" && n.props.testID === "factor-score-line",
      )[0].props.style,
    )

  test("the input card is the glass card, padding 16 kept", () => {
    const card = renderPlain(null).root.findAllByType("AppCard" as unknown as React.ElementType)[0]
    expect(card.props.variant).toBe("glass")
    expect(card.props.padding).toBe(16)
  })

  test("the pending score line is glass at the card radius and keeps its 52 pt", () => {
    const style = scoreLine(renderPlain(null))
    expect(style.backgroundColor).toBe(glass.cardFill)
    expect(style.borderColor).toBe(glass.cardBorder)
    expect(style.borderRadius).toBe(22)
    expect(SCORE_LINE_MIN_HEIGHT).toBe(52)
    expect(style.minHeight).toBe(52)
  })

  test("a scored factor keeps its soft green line", () => {
    const style = scoreLine(renderPlain({ selected_class: "S2", score: 2 }))
    expect(style.backgroundColor).toBe(defaultTheme.colors.successSoft)
    expect(style.minHeight).toBe(52)
  })

  test("the help link keeps its 44 pt target", () => {
    const link = renderPlain(null).root.findAll(
      (n) =>
        (n.type as unknown) === "Pressable" &&
        n.props.accessibilityLabel === fr.factorDetail.helpLink,
    )[0]
    expect(HELP_LINK_MIN_HEIGHT).toBe(44)
    expect(flat(link.props.style).minHeight).toBe(44)
  })

  test("the help hints are glass rows, block gaps on the 4-grid, input chrome untouched", () => {
    const styles = createDetailStyles(defaultTheme)
    expect(styles.hintRow.backgroundColor).toBe(glass.cardFill)
    expect(styles.hintRow.borderColor).toBe(glass.cardBorder)
    expect(styles.hintRow.borderRadius).toBe(22)
    expect(styles.hintDot.backgroundColor).toBe(defaultTheme.visual.score.high)
    for (const gap of [
      styles.screen.gap,
      styles.panel.gap,
      styles.fieldsList.gap,
      styles.hintsList.gap,
      styles.sheet.gap,
    ]) {
      expect((gap as number) % 4).toBe(0)
    }
    // UI-SPEC Typography exception: the field input chrome keeps its legacy roles.
    expect(styles.fieldLabel.fontFamily).toBe("Sora-ExtraBold")
    expect(styles.input).toEqual({ paddingHorizontal: 14, paddingVertical: 12 })
    expect(styles.sheetClose.width).toBe(44)
    expect(styles.sheetClose.height).toBe(44)
  })
})
