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
          {...STRIP_PROPS}
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
        node.props.accessibilityState &&
        "selected" in node.props.accessibilityState,
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
    expect(chips.map((chip) => chip.props.accessibilityState.selected)).toEqual([
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
    expect(chipsOf(tree).every((chip) => !chip.props.accessibilityState.selected)).toBe(true)
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
    expect(chips[12].props.accessibilityState.selected).toBe(true)
  })

  test("F renders the numeric trees field then the group list, with the field's selection", () => {
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
    // The numeric field comes first, the list after the card.
    const order = tree.root
      .findAll((n) => ["AppField", "DmhGroupList"].includes(n.type as unknown as string))
      .map((n) => n.type as unknown as string)
    expect(order).toEqual(["AppField", "DmhGroupList"])
    // The list is not inside the input card: one container level, straight on the canvas (A-C1).
    const card = tree.root.findAll((n) => (n.type as unknown) === "AppCard")[0]
    expect(card.findAll((n) => (n.type as unknown) === "DmhGroupList")).toHaveLength(0)
    expect(card.findAll((n) => (n.type as unknown) === "AppField")).toHaveLength(1)
  })

  test("H renders the segmented class and the 3 optional source chips under it", () => {
    const { tree } = renderDetail(
      "H",
      [withSelection("class_score", ["field_signs"], "5")],
      IBP_METHOD_V3_2,
    )
    const chips = chipsOf(tree).filter((chip) =>
      fr.factorInput.continuityEvidenceOptions.some(
        (o) => o.label === chip.props.accessibilityLabel,
      ),
    )
    expect(chips).toHaveLength(3)
    expect(textsOf(tree)).toContain(fr.factorDetail.companionLabels.evidence)
    expect(chips[2].props.accessibilityState.selected).toBe(true)
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
  test("the input card is the glass card, padding 16 kept", () => {
    const card = renderPlain(null).root.findAllByType("AppCard" as unknown as React.ElementType)[0]
    expect(card.props.variant).toBe("glass")
    expect(card.props.padding).toBe(16)
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
      styles.sheetContent.gap,
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
      fromRoute: () =>
        tree.root.findAll(
          (n) => typeof n.type === "string" && n.props.testID === "surface-from-route",
        ),
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

  test("C starts from the zone: the empty field is filled once and says where it comes from", () => {
    const onChange = jest.fn()
    const { update, fromRoute } = mount("C", cFields({ onChange }), { zoneSurfaceHa: 1.2 })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("1,2")
    expect(fromRoute()).toHaveLength(0)
    update(cFields({ onChange, value: "1,2" }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(fromRoute()).toHaveLength(1)
    expect(textsIn(fromRoute()[0])).toBe("D'après le parcours")
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

  test("the note goes away once the observer types another value, and the value is kept", () => {
    const onChange = jest.fn()
    const { update, fromRoute } = mount("D", cFields({ onChange }), { zoneSurfaceHa: 1.2 })
    update(cFields({ onChange, value: "1,2" }))
    update(cFields({ onChange, value: "2" }))
    expect(fromRoute()).toHaveLength(0)
    update(cFields({ onChange, value: "" }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test("a field that already has a value is never overwritten", () => {
    const onChange = jest.fn()
    const { fromRoute } = mount("E", cFields({ onChange, value: "3" }), { zoneSurfaceHa: 1.2 })
    expect(onChange).not.toHaveBeenCalled()
    expect(fromRoute()).toHaveLength(0)
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
    },
    setStratumCover: jest.fn(),
    setDmhCount: jest.fn(),
    bumpDmhGroup: jest.fn(),
    markNoDmhGroup: jest.fn(),
    setFSurface: jest.fn(),
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
      fields: () => byType("AppField"),
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

  test("B counted in full shows the cover per stratum instead of the strata chips", () => {
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

  test("B capped keeps the chips, with the count as it was", () => {
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
    // Capped: nothing is left for the input card, so there is no empty glass card; counted in full
    // the card keeps the caption and the surface field.
    expect(mount("F", fFields, { uncappedFactors: [], uncappedEntry: entry }).card()).toHaveLength(
      0,
    )
    expect(
      mount("F", fFields, { uncappedFactors: ["F"], uncappedEntry: entry }).card(),
    ).toHaveLength(1)
  })

  test("without the counting entry the field stays a typed input, in its card, with no hero card", () => {
    const plain = mount("F", fFields, {})
    expect(plain.fields()).toHaveLength(1)
    expect(plain.card()).toHaveLength(1)
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

  test("F: the sub-label follows the mode, and the page order is intro, hero, strip, card, list", () => {
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
              : child.props.methodVersion !== undefined
                ? "list"
                : "card",
      )
    expect(order).toEqual(["intro", "hero", "strip", "card", "list"])
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

  test.each(["A", "B", "C", "D", "E", "G", "H", "I", "J"] as FactorKey[])(
    "%s: the page order is intro, hero, strip, then the input card",
    (factor) => {
      const { tree } = mountFactor(factor, ["Fagus", "1", "1"])
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
                : "card",
        )
      expect(order).toEqual(["intro", "hero", "strip", "card"])
    },
  )
})

const textsIn = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textsIn(child))).join("")
