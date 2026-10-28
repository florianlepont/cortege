import React from "react"
import renderer, { act } from "react-test-renderer"
import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  type BStratumCode,
  type DmhGroupCode,
  type IbpMethodVersion,
} from "@cortege/ibp-domain"
import type { FactorField, FactorKey } from "../app/types"
import { FACTOR_TITLES } from "../app/constants"
import { withoutPercentUnit } from "../app/decimal-text"
import { fr } from "../i18n"
import { defaultTheme } from "../app/theme"
import { FactorDetailScreen } from "./FactorDetailScreen"
import { createDetailStyles } from "./factor-detail.styles"

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

// Follow-up 32-30: the genus list (a search field and 34 rows) is under test in
// factor-detail/GenusChoice.test.tsx; here it is a probe that keeps its props.
jest.mock("./factor-detail/GenusChoice", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GenusChoice: (props: { title: string }) => ReactRef.createElement("GenusChoice", props),
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

// Phase 27: the strip is under test in factor-detail/DoubtNoteStrip.test.tsx; here it is a probe.
jest.mock("./factor-detail/DoubtNoteStrip", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    DoubtNoteStrip: (props: Record<string, unknown>) =>
      ReactRef.createElement("DoubtNoteStrip", props),
  }
})

// Phase 30 (plan 30-19): the two detail blocks are under test in factor-detail/*.test.tsx; here
// they are probes that keep their props.
jest.mock("./factor-detail/StrataCoverFields", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    StrataCoverFields: (props: Record<string, unknown>) =>
      ReactRef.createElement("StrataCoverFields", props),
  }
})
jest.mock("./factor-detail/DmhCountFields", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    DmhCountFields: (props: Record<string, unknown>) =>
      ReactRef.createElement("DmhCountFields", props),
  }
})

// Follow-up 32-35: G's zone list is under test in factor-detail/OpenAreasSection.test.tsx; here it
// is a probe that keeps its props.
jest.mock("./factor-detail/OpenAreasSection", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    OpenAreasSection: (props: Record<string, unknown>) =>
      ReactRef.createElement("OpenAreasSection", props),
  }
})

// Phase 32 (plan 32-14): the group list is under test in factor-detail/DmhGroupList.test.tsx; here it
// is a probe that keeps its props.
jest.mock("./factor-detail/DmhGroupList", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    DmhGroupList: (props: Record<string, unknown>) => ReactRef.createElement("DmhGroupList", props),
  }
})

const STRIP_PROPS = {
  doubt: false,
  note: "",
  onChangeDoubt: jest.fn(),
  onChangeNote: jest.fn(),
  onCommitNote: jest.fn(),
}

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
        {...STRIP_PROPS}
      />,
    )
  })
  // Open the help sheet: its texts go to the route, which is where they are drawn.
  act(() => {
    tree.root
      .findAll(
        (node) => (node.type as unknown) === "Text" && node.props.testID === "factor-help-link",
      )[0]
      .props.onPress()
  })
  const [help, hints] = onOpenHelp.mock.calls[0] as [string, string[]]
  const texts = [help, ...hints]
  // Follow-up 32-31: a numeric control is a grouped row; its stepper is one adjustable element.
  const inputs = tree.root.findAll(
    (n) => (n.type as unknown) === "View" && n.props.accessibilityRole === "adjustable",
  )
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
  test("A renders the genus list (not a value row) and the native cover row, without its (%)", () => {
    const { tree, inputs } = renderDetail("A", A_FIELDS, IBP_METHOD_V3_2)
    // The cover is one percent row: the typed value, then its draggable track (no -/+ capsule).
    const coverLabel = withoutPercentUnit(
      fr.factorDetail.requiredField({ label: fr.factorDetail.fieldLabels.native_cover_percent }),
    )
    expect(inputs.map((input) => input.props.accessibilityLabel)).toEqual([
      coverLabel,
      fr.factorDetail.valueRows.slider.a11yLabel({ label: coverLabel, percent: 0 }),
    ])
    const genusLists = tree.root.findAllByType("GenusChoice" as unknown as React.ElementType)
    expect(genusLists).toHaveLength(1)
    expect(genusLists[0].props.title).toBe(fr.factorDetail.fieldLabels.genera)
  })

  test("A hands the genus list the survey's method and cas (follow-up 32-33)", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor="A"
          fields={A_FIELDS}
          retainedScore={null}
          methodVersion={IBP_METHOD_V3_2}
          ibpCas={3}
          onOpenHelp={jest.fn()}
          {...STRIP_PROPS}
        />,
      )
    })
    const list = tree.root.findByType("GenusChoice" as unknown as React.ElementType)
    expect(list.props.methodVersion).toBe(IBP_METHOD_V3_2)
    expect(list.props.ibpCas).toBe(3)
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

  test("B renders no value row (choice list, FLOW-01)", () => {
    const { inputs } = renderDetail("B", [field("strata_count")], IBP_METHOD_V3_2)
    expect(inputs).toHaveLength(0)
  })

  test("B renders one choice row per strata tier", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor="B"
          fields={[field("strata_count")]}
          retainedScore={null}
          methodVersion={IBP_METHOD_V3_2}
          onOpenHelp={jest.fn()}
          {...STRIP_PROPS}
        />,
      )
    })
    const rows = tree.root.findAll(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        String(node.props.testID).startsWith("choice-row-B-"),
    )
    expect(rows).toHaveLength(fr.factorInput.strataOptions.length)
  })

  test("C renders two counters and one surface row, with the form's labels", () => {
    const { inputs } = renderDetail(
      "C",
      [field("bmg_count"), field("bmm_count"), field("surface_ha")],
      IBP_METHOD_V3_2,
    )
    expect(inputs.map((input) => input.props.accessibilityLabel)).toEqual(
      ["bmg_count", "bmm_count", "surface_ha"].map((key) =>
        fr.factorDetail.requiredField({
          label: fr.factorDetail.fieldLabels[key as "bmg_count"],
        }),
      ),
    )
  })

  test("H renders no value row (single choice list, 0/2/5 only)", () => {
    const { inputs } = renderDetail("H", [field("class_score")], IBP_METHOD_V3_2)
    expect(inputs).toHaveLength(0)
  })
})

describe("FactorDetailScreen selections (D-12, D-09)", () => {
  const renderPlain = (
    factor: FactorKey,
    fields: FactorField[],
    methodVersion: IbpMethodVersion | null,
  ) => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor={factor}
          fields={fields}
          retainedScore={null}
          methodVersion={methodVersion}
          onOpenHelp={jest.fn()}
          {...STRIP_PROPS}
        />,
      )
    })
    return tree
  }
  const chipsOf = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAll(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        String(node.props.testID).startsWith("choice-row-") &&
        node.props.accessibilityRole === "checkbox",
    )
  const withSelection = (
    label: string,
    selected: string[] | null,
    value = "",
    onChange = jest.fn(),
  ) => field(label, { value, selection: { selected, onChange } })
  const textsOf = (tree: renderer.ReactTestRenderer): string[] =>
    tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => String(n.props.children))

  test("B ticks the stored strata and reports a tap through the selection", () => {
    const onChange = jest.fn()
    const tree = renderPlain(
      "B",
      [withSelection("strata_count", ["low", "high"], "2", onChange)],
      IBP_METHOD_V3_2,
    )
    const chips = chipsOf(tree)
    expect(chips.map((chip) => chip.props.accessibilityState.checked)).toEqual([
      false,
      true,
      false,
      true,
      false,
    ])
    act(() => {
      chips[0].props.onPress()
    })
    expect(onChange).toHaveBeenCalledWith(["very_low", "low", "high"])
  })

  test("B with a count and no selection shows the legacy line and no ticked chip", () => {
    const tree = renderPlain("B", [withSelection("strata_count", null, "3")], IBP_METHOD_V3_2)
    expect(chipsOf(tree).every((chip) => !chip.props.accessibilityState.checked)).toBe(true)
    expect(textsOf(tree)).toContain(fr.factorInput.chips.legacyCount({ count: 3 }))
  })

  test.each<[string, FactorKey, IbpMethodVersion | null, number]>([
    ["I v3.2", "I", IBP_METHOD_V3_2, 11],
    ["I v3.0", "I", IBP_METHOD_V3_0, 10],
    ["I untagged", "I", null, 10],
    ["J v3.2", "J", IBP_METHOD_V3_2, 12],
    ["J v3.0", "J", IBP_METHOD_V3_0, 9],
    ["J untagged", "J", null, 9],
  ])("%s offers the CNPF types of the method", (_name, factor, version, count) => {
    const tree = renderPlain(factor, [withSelection("count", [])], version)
    expect(chipsOf(tree)).toHaveLength(count)
  })

  test("I offers the sea only under v3.2, J the lower rock only under v3.0", () => {
    const seaLabel = "Mer ou océan"
    const lowerRock = fr.factorInput.rockyHabitatTypes.v3_0.find((o) => o.value === "lower_rock")!
    const i32 = renderPlain("I", [withSelection("count", [])], IBP_METHOD_V3_2)
    const i30 = renderPlain("I", [withSelection("count", [])], IBP_METHOD_V3_0)
    const j30 = renderPlain("J", [withSelection("count", [])], IBP_METHOD_V3_0)
    expect(textsOf(i32)).toContain(seaLabel)
    expect(textsOf(i30)).not.toContain(seaLabel)
    expect(textsOf(j30)).toContain(lowerRock.label)
  })

  test("J under v3.2 with lower_rock selected shows 13 chips, lower_rock ticked", () => {
    const tree = renderPlain("J", [withSelection("count", ["lower_rock"], "1")], IBP_METHOD_V3_2)
    const chips = chipsOf(tree)
    expect(chips).toHaveLength(13)
    expect(chips[12].props.accessibilityState.checked).toBe(true)
  })

  test("F without a counting entry renders the typed trees row then the group list, with the field's selection", () => {
    const onChange = jest.fn()
    const onOpenDmhGuide = jest.fn()
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor="F"
          fields={[withSelection("trees_per_ha", ["dmh_02"], "120", onChange)]}
          retainedScore={null}
          methodVersion={IBP_METHOD_V3_2}
          onOpenHelp={jest.fn()}
          onOpenDmhGuide={onOpenDmhGuide}
          {...STRIP_PROPS}
        />,
      )
    })
    const lists = tree.root.findAll((n) => (n.type as unknown) === "DmhGroupList")
    expect(lists).toHaveLength(1)
    expect(chipsOf(tree)).toHaveLength(0)
    const props = lists[0].props
    expect(props.methodVersion).toBe(IBP_METHOD_V3_2)
    expect(props.selected).toEqual(["dmh_02"])
    expect(props.counting).toBeUndefined()
    props.onChangeSelection(["dmh_01", "dmh_02"])
    expect(onChange).toHaveBeenCalledWith(["dmh_01", "dmh_02"])
    props.onOpenDmhGuide("dmh_05")
    expect(onOpenDmhGuide).toHaveBeenCalledWith("dmh_05")
    // The typed row comes first, the list after it, both straight on the canvas: no glass card.
    const order = tree.root
      .findAll(
        (n) =>
          ((n.type as unknown) === "View" && n.props.testID === "density-F-section") ||
          (n.type as unknown) === "DmhGroupList",
      )
      .map((n) => ((n.type as unknown) === "View" ? "row" : "list"))
    expect(order).toEqual(["row", "list"])
    expect(tree.root.findAll((n) => (n.type as unknown) === "AppCard")).toHaveLength(0)
  })

  test("H renders the class as a single choice and the 3 optional sources under it", () => {
    const { tree } = renderDetail(
      "H",
      [withSelection("class_score", ["field_signs"], "5")],
      IBP_METHOD_V3_2,
    )
    const evidence = chipsOf(tree)
    expect(evidence).toHaveLength(3)
    expect(evidence.map((row) => row.props.accessibilityLabel)).toEqual(
      fr.factorInput.continuityEvidenceOptions.map((o) => o.label),
    )
    expect(textsOf(tree)).toContain(fr.factorDetail.companionLabels.evidence)
    expect(evidence[2].props.accessibilityState.checked).toBe(true)
    const classes = tree.root.findAll(
      (node) => (node.type as unknown) === "Pressable" && node.props.accessibilityRole === "radio",
    )
    expect(classes.map((row) => row.props.accessibilityState.checked)).toEqual([false, false, true])
  })

  test("a companion renders without a selection, nothing ticked, and without the guide opener", () => {
    const tree = renderPlain("F", [field("trees_per_ha")], IBP_METHOD_V3_2)
    const list = tree.root.find((n) => (n.type as unknown) === "DmhGroupList")
    expect(list.props.selected).toBeNull()
    expect(() => list.props.onChangeSelection(["dmh_01"])).not.toThrow()
    expect(() => list.props.onOpenDmhGuide("dmh_05")).not.toThrow()
  })
})

describe("FactorDetailScreen variant I hierarchy, field sizes unchanged (12.2-15)", () => {
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
          {...STRIP_PROPS}
        />,
      )
    })
    return tree
  }
  test("the typed fields are grouped rows on the canvas: no glass input card (follow-up 32-31)", () => {
    const tree = renderPlain(null)
    expect(tree.root.findAll((n) => (n.type as unknown) === "AppCard")).toHaveLength(0)
    expect(tree.root.findAll((n) => n.props.testID === "density-F-section")).not.toHaveLength(0)
  })

  test("the page has no score line any more: the score is in the pager header (follow-up 32-26)", () => {
    for (const retained of [null, { selected_class: "S2", score: 2 }]) {
      const tree = renderPlain(retained)
      expect(tree.root.findAll((n) => n.props.testID === "factor-score-line")).toHaveLength(0)
      const texts = tree.root
        .findAll((n) => (n.type as unknown) === "Text")
        .map((n) => String(n.props.children))
        .join("|")
      expect(texts).not.toMatch(/Score du facteur|Classe|En attente/)
    }
  })

  test("the help link ends the intro paragraph, inline, and opens the help", () => {
    const onOpenHelp = jest.fn()
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor="C"
          fields={[field("bmg_count")]}
          retainedScore={null}
          methodVersion={IBP_METHOD_V3_2}
          onOpenHelp={onOpenHelp}
          {...STRIP_PROPS}
        />,
      )
    })
    const paragraph = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.testID === "factor-intro",
    )[0]
    const link = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.testID === "factor-help-link",
    )[0]
    expect(link.props.accessibilityRole).toBe("link")
    expect(link.props.accessibilityLabel).toBe(fr.factorDetail.helpLink)
    expect(textsIn(paragraph).startsWith(fr.factorDetail.intro.C)).toBe(true)
    expect(textsIn(paragraph).endsWith(textsIn(link))).toBe(true)
    act(() => link.props.onPress())
    expect(onOpenHelp).toHaveBeenCalledTimes(1)
  })

  test("the help hints are glass rows, block gaps on the 4-grid", () => {
    const styles = createDetailStyles(defaultTheme)
    expect(styles.hintRow.backgroundColor).toBe(glass.cardFill)
    expect(styles.hintRow.borderColor).toBe(glass.cardBorder)
    expect(styles.hintRow.borderRadius).toBe(22)
    expect(styles.hintDot.backgroundColor).toBe(defaultTheme.visual.score.high)
    for (const gap of [styles.screen.gap, styles.hintsList.gap, styles.sheetContent.gap]) {
      expect((gap as number) % 4).toBe(0)
    }
    expect(styles.sheetClose.width).toBe(44)
    expect(styles.sheetClose.height).toBe(44)
  })
})

describe("FactorDetailScreen strip (phase 27, D-16)", () => {
  const renderWith = (
    overrides: Partial<typeof STRIP_PROPS> = {},
    retainedScore: { selected_class: string; score: number } | null = null,
  ) => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor="C"
          fields={[field("bmg_count"), field("bmm_count"), field("surface_ha")]}
          retainedScore={retainedScore as never}
          methodVersion={IBP_METHOD_V3_2}
          onOpenHelp={jest.fn()}
          {...STRIP_PROPS}
          {...overrides}
        />,
      )
    })
    return tree
  }
  const stripOf = (tree: renderer.ReactTestRenderer) =>
    tree.root.findByType("DoubtNoteStrip" as unknown as React.ElementType)
  test("sits under the intro and the hero card, above the input card (follow-ups 32-27, 32-29)", () => {
    const tree = renderWith()
    const screen = tree.root
      .findByType(FactorDetailScreen)
      .findAll((n) => (n.type as unknown) === "View")[0]
    // Each child of the root View is a mocked composite (View, AppPressable, the probe): the
    // host node under it carries the identity.
    const names = screen.children
      .filter((child): child is renderer.ReactTestInstance => typeof child !== "string")
      .map((child) =>
        child.props.onCommitNote
          ? "strip"
          : child.props.onOpenHelp
            ? "intro"
            : child.props.figure
              ? "hero"
              : (child.props.testID ?? child.props.accessibilityLabel ?? "other"),
      )
    expect(names.slice(0, 3)).toEqual(["intro", "hero", "strip"])
    // The old link at the very bottom is gone: nothing follows the input card.
    expect(names.indexOf(fr.factorDetail.helpLink)).toBe(-1)
    expect(names.indexOf("factor-help-link")).toBe(-1)
  })

  test("hands the factor, its title, the doubt, the note and the callbacks to the strip", () => {
    const callbacks = {
      onChangeDoubt: jest.fn(),
      onChangeNote: jest.fn(),
      onCommitNote: jest.fn(),
    }
    const strip = stripOf(renderWith({ doubt: true, note: "Vu en mai", ...callbacks }))
    expect(strip.props.factor).toBe("C")
    expect(strip.props.title).toBe(FACTOR_TITLES.C)
    expect(strip.props.doubt).toBe(true)
    expect(strip.props.note).toBe("Vu en mai")
    expect(strip.props.onChangeDoubt).toBe(callbacks.onChangeDoubt)
    expect(strip.props.onChangeNote).toBe(callbacks.onChangeNote)
    expect(strip.props.onCommitNote).toBe(callbacks.onCommitNote)
  })
})

describe("FactorDetailScreen counting mode and route surface (Phase 30, D-07)", () => {
  const mount = (
    factor: FactorKey,
    fields: FactorField[],
    extra: { uncappedFactors?: FactorKey[]; zoneSurfaceHa?: number | null } = {},
  ) => {
    const element = (nextFields: FactorField[]) => (
      <FactorDetailScreen
        factor={factor}
        fields={nextFields}
        retainedScore={null}
        methodVersion={IBP_METHOD_V3_2}
        onOpenHelp={jest.fn()}
        {...STRIP_PROPS}
        {...extra}
      />
    )
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(element(fields))
    })
    return {
      tree,
      update: (next: FactorField[]) => act(() => tree.update(element(next))),
      caption: () =>
        tree.root.findAll(
          (n) => typeof n.type === "string" && n.props.testID === "counting-caption",
        ),
      byId: (id: string) =>
        tree.root.findAll((n) => typeof n.type === "string" && n.props.testID === id),
    }
  }
  const cFields = (surface: Partial<FactorField> = {}) => [
    field("bmg_count"),
    field("bmm_count"),
    field("surface_ha", surface),
  ]

  test("a factor counted in full opens with its counting-mode sentence, in the intro, no caption box", () => {
    const { tree, caption } = mount("B", [field("strata_count")], { uncappedFactors: ["B", "F"] })
    expect(caption()).toHaveLength(0)
    const intro = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.testID === "factor-intro",
    )[0]
    expect(textsIn(intro).startsWith(fr.factorDetail.countingMode.B)).toBe(true)
    expect(textsIn(intro)).not.toContain(fr.factorDetail.intro.B)
  })

  test("a capped factor, or a survey with no route, opens with its plain sentence", () => {
    for (const m of [
      mount("B", [field("strata_count")], { uncappedFactors: ["F"] }),
      mount("B", [field("strata_count")]),
    ]) {
      const intro = m.tree.root.findAll(
        (n) => (n.type as unknown) === "Text" && n.props.testID === "factor-intro",
      )[0]
      expect(textsIn(intro).startsWith(fr.factorDetail.intro.B)).toBe(true)
      expect(m.caption()).toHaveLength(0)
    }
  })

  test("H is never counted in full: its sentence stays the plain one", () => {
    const { tree } = mount("H", [field("class_score")], { uncappedFactors: ["H"] as FactorKey[] })
    const intro = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.testID === "factor-intro",
    )[0]
    expect(textsIn(intro).startsWith(fr.factorDetail.intro.H)).toBe(true)
  })

  test("C starts from the zone: the empty field is filled once and one caption line replaces its section", () => {
    const onChange = jest.fn()
    const { update, byId } = mount("C", cFields({ onChange }), { zoneSurfaceHa: 1.2 })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("1,2")
    update(cFields({ onChange, value: "1,2" }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(byId("surface-C-section")).toHaveLength(0)
    expect(byId("surface-C-increase")).toHaveLength(0)
    const row = byId("surface-C-from-route")
    expect(row).toHaveLength(1)
    expect(textsIn(row[0])).toContain("Surface décrite : 1,2 ha, d'après le parcours")
    expect(row[0].props.onPress).toBeUndefined()
    expect(byId("surface-C-from-route-modify")).toHaveLength(0)
  })

  test("a surface that differs from the route's keeps its row, with no caption line", () => {
    const onChange = jest.fn()
    const { byId } = mount("E", cFields({ onChange, value: "3" }), {
      zoneSurfaceHa: 1.2,
    })
    expect(byId("surface-E-section")).toHaveLength(1)
    expect(byId("surface-E-from-route")).toHaveLength(0)
  })

  test("without a route surface the row stays and keeps its error", () => {
    const { byId } = mount("C", cFields({ value: "", error: "Surface requise", touched: true }))
    expect(byId("surface-C-section")).toHaveLength(1)
    expect(byId("surface-C-from-route")).toHaveLength(0)
    expect(byId("surface-C-section-error")).toHaveLength(1)
  })

  test("the surface field is found by its place, whatever its label (the form hands French labels)", () => {
    const onChange = jest.fn()
    const labels = fr.validation.fields
    mount(
      "C",
      [field(labels.bmg_count), field(labels.bmm_count), field(labels.surface_ha, { onChange })],
      { zoneSurfaceHa: 1 },
    )
    expect(onChange).toHaveBeenCalledWith("1")
  })

  test("the caption line goes away once the value differs from the route's, and is never refilled", () => {
    const onChange = jest.fn()
    const { update, byId } = mount("D", cFields({ onChange }), { zoneSurfaceHa: 1.2 })
    update(cFields({ onChange, value: "1,2" }))
    expect(byId("surface-D-from-route")).toHaveLength(1)
    update(cFields({ onChange, value: "2" }))
    expect(byId("surface-D-from-route")).toHaveLength(0)
    expect(byId("surface-D-section")).toHaveLength(1)
    update(cFields({ onChange, value: "" }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test("a field that already has a value is never overwritten", () => {
    const onChange = jest.fn()
    const { byId } = mount("E", cFields({ onChange, value: "3" }), { zoneSurfaceHa: 1.2 })
    expect(onChange).not.toHaveBeenCalled()
    expect(byId("surface-E-from-route")).toHaveLength(0)
  })

  test("the lower counter is left off the capped page while not needed, and kept on the counted-in-full one", () => {
    const lower = { notNeeded: true, required: false, value: "7" }
    const fieldsFor = () => [
      field("bmg_count", { value: "4" }),
      field("bmm_count", lower),
      field("surface_ha", { value: "2" }),
    ]
    const capped = mount("C", fieldsFor(), { zoneSurfaceHa: 2 })
    expect(capped.byId("counter-C-0-row")).not.toHaveLength(0)
    expect(capped.byId("counter-C-1-row")).toHaveLength(0)
    const full = mount("C", fieldsFor(), { zoneSurfaceHa: 2, uncappedFactors: ["C"] })
    expect(full.byId("counter-C-1-row")).not.toHaveLength(0)
  })

  test("no route zone, no prefill; and other factors are untouched", () => {
    const onChange = jest.fn()
    mount("C", cFields({ onChange }))
    mount("G", [field("open_flowering_percent", { onChange })], { zoneSurfaceHa: 1.2 })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe("FactorDetailScreen detail fields of B and F counted in full (Phase 30, plan 30-19)", () => {
  const entry = {
    state: {
      strataCoverText: { very_low: "25" } as Partial<Record<BStratumCode, string>>,
      dmhCounts: { dmh_01: 3 } as Partial<Record<DmhGroupCode, number>>,
      fSurfaceText: "1,2",
      openAreasHa: [] as number[],
    },
    setStratumCover: jest.fn(),
    setDmhCount: jest.fn(),
    bumpDmhGroup: jest.fn(),
    markNoDmhGroup: jest.fn(),
    setFSurface: jest.fn(),
    addOpenArea: jest.fn(),
    setOpenArea: jest.fn(),
    removeOpenArea: jest.fn(),
    markNoOpenArea: jest.fn(),
  }
  const mount = (
    factor: FactorKey,
    fields: FactorField[],
    extra: Partial<React.ComponentProps<typeof FactorDetailScreen>> = {},
  ) => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor={factor}
          fields={fields}
          retainedScore={null}
          methodVersion={IBP_METHOD_V3_2}
          onOpenHelp={jest.fn()}
          {...STRIP_PROPS}
          {...extra}
        />,
      )
    })
    const byType = (type: string) => tree.root.findAll((n) => (n.type as unknown) === type)
    return {
      tree,
      strata: () => byType("StrataCoverFields"),
      dmh: () => byType("DmhCountFields"),
      chips: () => byType("FactorChipsInput"),
      fields: () => byType("View").filter((n) => n.props.accessibilityRole === "adjustable"),
      list: () => byType("DmhGroupList"),
      // Follow-up 32-27: F's hero card, read-only, under the intro paragraph.
      hero: () => byType("View").filter((n) => n.props.testID === "trees-per-ha-value"),
      // Follow-up 32-26: the card exists only when something is left in it.
      card: () => byType("AppCard"),
    }
  }
  const bFields = [
    field("strata_count", { value: "2", selection: { selected: null, onChange: jest.fn() } }),
  ]
  const fFields = [
    field("trees_per_ha", {
      value: "3",
      selection: { selected: ["dmh_01", "dmh_13"], onChange: jest.fn() },
    }),
  ]

  test("B counted in full shows the cover per stratum instead of the strata list", () => {
    const { strata, tree } = mount("B", bFields, { uncappedFactors: ["B"], uncappedEntry: entry })
    expect(strata()).toHaveLength(1)
    const props = strata()[0].props
    expect(props.coverText).toBe(entry.state.strataCoverText)
    expect(props.strataCountText).toBe("2")
    expect(props.methodVersion).toBe(IBP_METHOD_V3_2)
    expect(
      tree.root.findAll(
        (n) =>
          typeof n.type !== "string" &&
          n.props.label === fr.factorDetail.fieldLabels.strata_count &&
          n.props.options !== undefined,
      ),
    ).toHaveLength(0)
    props.onChange("low", "30")
    expect(entry.setStratumCover).toHaveBeenCalledWith("low", "30")
  })

  test("B capped keeps the strata list, with the count as it was", () => {
    const { strata, tree } = mount("B", bFields, { uncappedFactors: ["F"], uncappedEntry: entry })
    expect(strata()).toHaveLength(0)
    const chips = tree.root.findAll(
      (n) => n.props.options !== undefined && n.props.selected !== undefined,
    )
    expect(chips.length).toBeGreaterThan(0)
  })

  test("F counted in full gives the list the counting entry; the surface block sits above the list", () => {
    const { dmh, fields, tree } = mount("F", fFields, {
      uncappedFactors: ["F"],
      uncappedEntry: entry,
      zoneSurfaceHa: 1.2,
    })
    // The trees per hectare is derived from the counts and the surface: the list's sum line.
    expect(fields()).toHaveLength(0)
    const list = tree.root.find((n) => (n.type as unknown) === "DmhGroupList")
    expect(list.props.counting.counts).toBe(entry.state.dmhCounts)
    list.props.counting.onBump("dmh_13", 1)
    list.props.counting.onSetCount("dmh_13", 2)
    expect(entry.bumpDmhGroup).toHaveBeenCalledWith("dmh_13", 1)
    expect(entry.setDmhCount).toHaveBeenCalledWith("dmh_13", 2)
    expect(dmh()).toHaveLength(1)
    const props = dmh()[0].props
    expect(props.selectedGroups).toBeUndefined()
    expect(props.counts).toBeUndefined()
    expect(props.surfaceText).toBe("1,2")
    expect(props.zoneSurfaceHa).toBe(1.2)
    props.onChangeSurface("2")
    expect(entry.setFSurface).toHaveBeenCalledWith("2")
    const order = tree.root
      .findAll((n) => ["DmhGroupList", "DmhCountFields"].includes(n.type as never))
      .map((n) => n.type as unknown as string)
    // The surface field sits in the card, above the list (A-C1).
    expect(order).toEqual(["DmhCountFields", "DmhGroupList"])
  })

  test("F capped without a route entry keeps the tick-only list; with the entry it counts per hectare", () => {
    const { dmh, tree } = mount("F", fFields, {})
    expect(dmh()).toHaveLength(0)
    const plain = tree.root.find((n) => (n.type as unknown) === "DmhGroupList")
    expect(plain.props.counting).toBeUndefined()
    expect(mount("F", fFields, { uncappedFactors: ["F"] }).dmh()).toHaveLength(0)
    expect(mount("B", bFields, { uncappedFactors: ["B"] }).strata()).toHaveLength(0)

    // Follow-up of phase 32: the capped mode counts trees per hectare, 0 to 2 per group, no surface.
    const capped = mount("F", fFields, { uncappedFactors: ["B"], uncappedEntry: entry })
    expect(capped.dmh()).toHaveLength(0)
    const list = capped.tree.root.find((n) => (n.type as unknown) === "DmhGroupList")
    expect(list.props.counting.counts).toBe(entry.state.dmhCounts)
    expect(list.props.counting.max).toBe(2)
    entry.bumpDmhGroup.mockClear()
    entry.setDmhCount.mockClear()
    list.props.counting.onBump("dmh_13", 1)
    list.props.counting.onSetCount("dmh_13", 2)
    expect(entry.bumpDmhGroup).toHaveBeenCalledWith("dmh_13", 1, 2)
    expect(entry.setDmhCount).toHaveBeenCalledWith("dmh_13", 2, 2)
  })

  test("F with the group counters: the trees per hectare is the list's sum line, never an input or a card, in both modes", () => {
    for (const uncappedFactors of [[], ["F"]] as FactorKey[][]) {
      const counted = mount("F", fFields, { uncappedFactors, uncappedEntry: entry })
      expect(counted.fields()).toHaveLength(0)
      expect(counted.tree.root.findAll((n) => (n.type as unknown) === "TextInput")).toHaveLength(0)
      // The stored figure goes to the list as text, which draws the line.
      expect(counted.list()[0].props.treesPerHaText).toBe("3")
      expect(
        counted.tree.root.findAll((n) => n.props.testID === "trees-derived-caption"),
      ).toHaveLength(0)
    }
    // Follow-up 32-31: no glass card in either mode; counted in full the surface block stands on
    // the canvas above the list.
    expect(mount("F", fFields, { uncappedFactors: [], uncappedEntry: entry }).card()).toHaveLength(
      0,
    )
    expect(
      mount("F", fFields, { uncappedFactors: ["F"], uncappedEntry: entry }).card(),
    ).toHaveLength(0)
  })

  test("without the counting entry the field stays a typed row, on the canvas, with no hero card", () => {
    const plain = mount("F", fFields, {})
    expect(plain.fields()).toHaveLength(1)
    expect(plain.card()).toHaveLength(0)
    expect(plain.hero()).toHaveLength(0)
  })

  test("F: the hero card shows the stored figure, the Maximum pill when the top score is retained, only for F", () => {
    const top = { selected_class: "S5", score: 5 } as never
    const low = { selected_class: "S2", score: 2 } as never
    for (const uncappedFactors of [[], ["F"]] as FactorKey[][]) {
      const heroOf = (retainedScore: never | null) => {
        const m = mount("F", fFields, { uncappedFactors, uncappedEntry: entry, retainedScore })
        expect(m.hero()).toHaveLength(1)
        return m.hero()[0]
      }
      expect(heroOf(top).props.accessibilityLabel).toBe("Arbres par hectare, 3")
      expect(heroOf(top).props.accessibilityHint).toBe(fr.factorDetail.dmhList.topScoreHint)
      expect(heroOf(low).props.accessibilityHint).toBeUndefined()
      expect(heroOf(null).props.accessibilityHint).toBeUndefined()
    }
    expect(
      mount("G", [field("open_flowering_percent")], { retainedScore: top }).hero(),
    ).toHaveLength(0)
  })

  test("F: the sub-label follows the mode, and the page order is intro, hero, strip, surface, list", () => {
    const capped = mount("F", fFields, { uncappedFactors: [], uncappedEntry: entry })
    const full = mount("F", fFields, { uncappedFactors: ["F"], uncappedEntry: entry })
    const subOf = (m: typeof capped) =>
      m
        .hero()[0]
        .findAll((n) => (n.type as unknown) === "Text")
        .map((n) => n.props.children)[2]
    expect(subOf(capped)).toBe(fr.factorDetail.dmhList.hero.subCapped)
    expect(subOf(full)).toBe(fr.factorDetail.dmhList.hero.subFull)
    const root = full.tree.root
      .findByType(FactorDetailScreen)
      .findAll((n) => (n.type as unknown) === "View")[0]
    const order = root.children
      .filter((child): child is renderer.ReactTestInstance => typeof child !== "string")
      .map((child) =>
        child.props.onOpenHelp
          ? "intro"
          : child.props.onCommitNote
            ? "strip"
            : child.props.treesPerHaText !== undefined && child.props.counted !== undefined
              ? "hero"
              : child.props.entry !== undefined
                ? "surface"
                : child.props.methodVersion !== undefined
                  ? "list"
                  : "other",
      )
    expect(order).toEqual(["intro", "hero", "strip", "surface", "list"])
  })

  test("the other factors get no detail block, whatever the route says", () => {
    const g = mount("G", [field("open_flowering_percent")], {
      uncappedFactors: ["G"],
      uncappedEntry: entry,
    })
    expect(g.strata()).toHaveLength(0)
    expect(g.dmh()).toHaveLength(0)
  })
})

describe("FactorDetailScreen key figure hero (follow-up 32-29)", () => {
  const mountFactor = (
    factor: FactorKey,
    values: string[],
    extra: { retainedScore?: never | null; uncappedFactors?: FactorKey[] } = {},
  ) => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor={factor}
          fields={values.map((value, index) => field(`f${index}`, { value }))}
          retainedScore={null}
          methodVersion={IBP_METHOD_V3_2}
          onOpenHelp={jest.fn()}
          {...STRIP_PROPS}
          {...extra}
        />,
      )
    })
    const byId = (id: string) =>
      tree.root.findAll((n) => typeof n.type === "string" && n.props.testID === id)
    return {
      tree,
      hero: () => byId("factor-hero-value"),
      pill: () => byId("factor-hero-top-score"),
    }
  }
  const textsOf = (hero: renderer.ReactTestInstance) =>
    hero.findAll((n) => (n.type as unknown) === "Text").map(textsIn)

  test.each<[FactorKey, string[], string[]]>([
    ["A", ["Fagus,Acer", "70"], ["2", "genres autochtones", "d'après la liste ci-dessous"]],
    ["B", ["3"], ["3", "strates de végétation", "d'après vos choix"]],
    [
      "C",
      ["3", "4", "2"],
      ["1,5", "gros bois morts sur pied par hectare", "calculé d'après la surface décrite"],
    ],
    [
      "D",
      ["6", "0", "2"],
      ["3", "gros bois morts au sol par hectare", "calculé d'après la surface décrite"],
    ],
    [
      "E",
      ["2", "9", "4"],
      ["0,5", "très gros bois vivants par hectare", "calculé d'après la surface décrite"],
    ],
    ["G", ["3"], ["3\u00A0%", "milieux ouverts fleuris", "part de la surface"]],
    ["H", ["2"], ["Partielle", "continuité boisée", "ancienneté de l'état boisé"]],
    ["I", ["2"], ["2", "types de milieux aquatiques", "d'après vos choix"]],
    ["J", ["1"], ["1", "types de milieux rocheux", "d'après vos choix"]],
  ])(
    "%s: the hero card shows the key figure, its label and its origin",
    (factor, values, texts) => {
      const { hero } = mountFactor(factor, values)
      expect(hero()).toHaveLength(1)
      expect(textsOf(hero()[0])).toEqual(texts)
      expect(hero()[0].props.accessibilityLabel).toBe(`${texts[1]}, ${texts[0]}`)
      expect(hero()[0].props.accessible).toBe(true)
    },
  )

  test("B counted in full says the figure follows the cover of each stratum", () => {
    const { hero } = mountFactor("B", ["3"], { uncappedFactors: ["B"] })
    expect(textsOf(hero()[0])[2]).toBe("d'après le couvert de chaque strate")
  })

  test("C, D and E without a count or a surface read 'À calculer'; G 'À estimer'; H 'À choisir'", () => {
    expect(textsOf(mountFactor("C", ["3", "4", ""]).hero()[0])[0]).toBe("À calculer")
    expect(textsOf(mountFactor("E", ["", "", ""]).hero()[0])[0]).toBe("À calculer")
    expect(textsOf(mountFactor("G", [""]).hero()[0])[0]).toBe("À estimer")
    expect(textsOf(mountFactor("H", [""]).hero()[0])[0]).toBe("À choisir")
  })

  test("the Maximum pill shows only when the retained score is the factor's highest", () => {
    const top = { selected_class: "S5", score: 5 } as never
    const low = { selected_class: "S2", score: 2 } as never
    for (const factor of ["A", "B", "C", "D", "E", "G", "H", "I", "J"] as const) {
      const at = mountFactor(factor, ["1", "1", "1"], { retainedScore: top })
      expect(at.pill()).toHaveLength(1)
      expect(textsIn(at.pill()[0])).toBe("Maximum")
      expect(at.hero()[0].props.accessibilityHint).toBe(fr.factorDetail.dmhList.topScoreHint)
      const below = mountFactor(factor, ["1", "1", "1"], { retainedScore: low })
      expect(below.pill()).toHaveLength(0)
      expect(below.hero()[0].props.accessibilityHint).toBeUndefined()
      expect(mountFactor(factor, ["1", "1", "1"]).pill()).toHaveLength(0)
    }
  })

  test("F keeps its own hero and gets no generic one", () => {
    const { hero } = mountFactor("F", ["3"])
    expect(hero()).toHaveLength(0)
  })

  const FIELD_COUNT: Record<FactorKey, number> = {
    A: 2,
    B: 1,
    C: 3,
    D: 3,
    E: 3,
    F: 1,
    G: 1,
    H: 1,
    I: 1,
    J: 1,
  }
  // Follow-ups 32-30 and 32-31: the choice controls and the numeric rows are grouped lists on the
  // canvas, no glass card. A also has the photo entry above its list; H has two lists; C, D and E
  // have the counters then the surface.
  test.each<[FactorKey, string[]]>([
    ["A", ["entry", "choice", "value"]],
    ["B", ["choice"]],
    ["C", ["value", "value"]],
    ["D", ["value", "value"]],
    ["E", ["value", "value"]],
    ["G", ["value"]],
    ["H", ["choice", "choice"]],
    ["I", ["choice"]],
    ["J", ["choice"]],
  ])("%s: the page order is intro, hero, strip, then the inputs", (factor, inputs) => {
    // As many fields as the factor has: a spare field would be one more typed row.
    const { tree } = mountFactor(factor, ["Fagus", "1", "1"].slice(0, FIELD_COUNT[factor]))
    const root = tree.root
      .findByType(FactorDetailScreen)
      .findAll((n) => (n.type as unknown) === "View")[0]
    const order = root.children
      .filter((child): child is renderer.ReactTestInstance => typeof child !== "string")
      .map((child) =>
        child.props.onOpenHelp
          ? "intro"
          : child.props.onCommitNote
            ? "strip"
            : child.props.figure
              ? "hero"
              : child.props.genusField
                ? "entry"
                : /^(counters|cover|surface|percent|density)-/.test(String(child.props.testID))
                  ? "value"
                  : String(child.props.testID).startsWith("choice-list") || child.props.title
                    ? "choice"
                    : "other",
      )
    expect(order).toEqual(["intro", "hero", "strip", ...inputs])
  })
})

const textsIn = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textsIn(child))).join("")

describe("FactorDetailScreen G zones (follow-up 32-35)", () => {
  const entry = {
    state: { strataCoverText: {}, dmhCounts: {}, fSurfaceText: "", openAreasHa: [0.3, 0.1] },
    setStratumCover: jest.fn(),
    setDmhCount: jest.fn(),
    bumpDmhGroup: jest.fn(),
    markNoDmhGroup: jest.fn(),
    setFSurface: jest.fn(),
    addOpenArea: jest.fn(),
    setOpenArea: jest.fn(),
    removeOpenArea: jest.fn(),
    markNoOpenArea: jest.fn(),
  }
  const mount = (
    factor: FactorKey,
    extra: Partial<React.ComponentProps<typeof FactorDetailScreen>> = {},
    value = "20",
  ) => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FactorDetailScreen
          factor={factor}
          fields={[field("open_flowering_percent", { value })]}
          retainedScore={null}
          methodVersion={IBP_METHOD_V3_2}
          onOpenHelp={jest.fn()}
          {...STRIP_PROPS}
          {...extra}
        />,
      )
    })
    const byType = (type: string) => tree.root.findAll((n) => (n.type as unknown) === type)
    const byId = (id: string) =>
      tree.root.findAll((n) => typeof n.type === "string" && n.props.testID === id)
    return {
      zones: () => byType("OpenAreasSection"),
      percent: () => byId("percent-G-section"),
      hero: () => byId("factor-hero-value"),
    }
  }
  const textsOf = (node: renderer.ReactTestInstance) =>
    node.findAll((n) => (n.type as unknown) === "Text").map(textsIn)

  test("G with a described surface lists its zones instead of the percent track", () => {
    const { zones, percent } = mount("G", { uncappedEntry: entry, zoneSurfaceHa: 2 })
    expect(zones()).toHaveLength(1)
    expect(percent()).toHaveLength(0)
    const props = zones()[0].props
    expect(props.areas).toEqual([0.3, 0.1])
    expect(props.zoneSurfaceHa).toBe(2)
    expect(props.percentText).toBe("20")
  })

  test("the section hands the survey surface to the form with every change", () => {
    const { zones } = mount("G", { uncappedEntry: entry, zoneSurfaceHa: 2 })
    const props = zones()[0].props
    props.onAdd()
    expect(entry.addOpenArea).toHaveBeenCalledTimes(1)
    props.onChangeArea(1, 0.4)
    expect(entry.setOpenArea).toHaveBeenCalledWith(1, 0.4, 2)
    props.onRemove(0)
    expect(entry.removeOpenArea).toHaveBeenCalledWith(0, 2)
    props.onMarkNone(true)
    expect(entry.markNoOpenArea).toHaveBeenCalledWith(true)
  })

  test("the hero keeps the percent and says it is computed from the zones", () => {
    const { hero } = mount("G", { uncappedEntry: entry, zoneSurfaceHa: 2 })
    expect(textsOf(hero()[0])).toEqual([
      "20\u00A0%",
      "milieux ouverts fleuris",
      "calculé d'après les zones et la surface décrite",
    ])
  })

  test("an older G with only a percent shows it in the hero and starts with no zone", () => {
    const empty = { ...entry, state: { ...entry.state, openAreasHa: [] as number[] } }
    const { zones, hero } = mount("G", { uncappedEntry: empty, zoneSurfaceHa: 2 }, "12")
    expect(zones()[0].props.areas).toEqual([])
    expect(textsOf(hero()[0])[0]).toBe("12\u00A0%")
  })

  test("without a described surface, or without the form entry, the plain percent row stays", () => {
    for (const extra of [
      { uncappedEntry: entry },
      { uncappedEntry: entry, zoneSurfaceHa: null },
      { uncappedEntry: entry, zoneSurfaceHa: 0 },
      { zoneSurfaceHa: 2 },
    ]) {
      const { zones, percent, hero } = mount("G", extra)
      expect(zones()).toHaveLength(0)
      expect(percent()).toHaveLength(1)
      expect(textsOf(hero()[0])[2]).toBe("part de la surface")
    }
  })

  test("the other factors never get the zone list", () => {
    expect(mount("A", { uncappedEntry: entry, zoneSurfaceHa: 2 }).zones()).toHaveLength(0)
  })
})
