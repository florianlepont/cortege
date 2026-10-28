import React from "react"
import renderer, { act } from "react-test-renderer"
import type { FactorField, FactorKey } from "../../app/types"
import { View } from "react-native"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { fieldVariantsFor } from "./renderFactorField"
import { renderValueSections } from "./renderValueFields"

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/feedback", () => ({ feedback: { selection: jest.fn() } }))
jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    TextInput: mockComponent("TextInput"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useColorScheme: () => "light",
  }
})

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
  jest.useFakeTimers()
})
afterAll(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

const labels = fr.factorDetail.fieldLabels
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

function mount(
  factor: FactorKey,
  fields: FactorField[],
  extra: {
    groupCounters?: boolean
    surfaceCaptionHa?: number | null
    countedInFull?: boolean
  } = {},
) {
  const variants = fieldVariantsFor(factor, IBP_METHOD_V3_2)
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <View>
        {renderValueSections({
          factor,
          variants,
          fields,
          surfaceCaptionHa: extra.surfaceCaptionHa ?? null,
          countedInFull: extra.countedInFull ?? false,
          groupCounters: extra.groupCounters ?? false,
        })}
      </View>,
    )
  })
  const byId = (id: string) =>
    tree.root.findAll((n) => (n.type as unknown) === "View" && n.props.testID === id)
  const any = (id: string) => tree.root.findAll((n) => n.props?.testID === id)
  const press = (id: string): void => {
    const button = any(id)[0]
    act(() => button.props.onPressIn())
    act(() => button.props.onPressOut())
    act(() => button.props.onPress())
  }
  const texts = (): string[] =>
    tree.root
      .findAll((n) => (n.type as unknown) === "Text")
      .map((n) => n.children.map((c) => (typeof c === "string" ? c : "")).join(""))
  return { tree, byId, any, press, texts }
}

describe("renderValueSections", () => {
  test("C, D, E: one counters section then one surface section", () => {
    const { byId } = mount("C", [
      field(labels.bmg_count),
      field(labels.bmm_count),
      field(labels.surface_ha),
    ])
    expect(byId("counters-C")).toHaveLength(1)
    expect(byId("surface-C-section")).toHaveLength(1)
  })

  test("a counter steps by 1 from 0 to 999 and writes the whole number", () => {
    const bmg = field("bmg_count", { value: "3" })
    const { press } = mount("C", [bmg, field("bmm_count"), field("surface_ha")])
    press("counter-C-0-increase")
    expect(bmg.onChange).toHaveBeenLastCalledWith("4")
    expect(bmg.onTouch).toHaveBeenCalled()
    const top = field("bmm_count", { value: "999" })
    const atTop = mount("C", [field("bmg_count"), top, field("surface_ha")])
    atTop.press("counter-C-1-increase")
    expect(top.onChange).not.toHaveBeenCalled()
    expect(atTop.any("counter-C-1-value")).not.toHaveLength(0)
  })

  test("the surface steps by a tenth with a decimal comma, never below 0", () => {
    const surface = field("surface_ha", { value: "1,2" })
    const { press, texts } = mount("C", [field("bmg_count"), field("bmm_count"), surface])
    press("surface-C-increase")
    expect(surface.onChange).toHaveBeenLastCalledWith("1,3")
    expect(texts()).toContain("1,2")
    const zero = field("surface_ha", { value: "0" })
    const atZero = mount("C", [field("bmg_count"), field("bmm_count"), zero])
    atZero.press("surface-C-decrease")
    expect(zero.onChange).not.toHaveBeenCalled()
  })

  test("a surface that is the route's zone gives way to one read-only caption line", () => {
    const fields = [field("bmg_count"), field("bmm_count"), field("surface_ha", { value: "2" })]
    const { byId, any, texts } = mount("C", fields, { surfaceCaptionHa: 2 })
    expect(byId("surface-C-section")).toHaveLength(0)
    expect(any("surface-C-increase")).toHaveLength(0)
    expect(any("surface-C-from-route")).not.toHaveLength(0)
    expect(texts()).toContain(fr.factorDetail.countingMode.surfaceFromRoute({ hectares: "2,0" }))
    expect(any("surface-C-from-route-modify")).toHaveLength(0)
    expect(any("surface-C-from-route")[0].props.onPress).toBeUndefined()
  })

  test("without a caption the surface section stays, even with a zone", () => {
    const fields = [field("bmg_count"), field("bmm_count"), field("surface_ha", { value: "3" })]
    const { byId, any } = mount("C", fields, { surfaceCaptionHa: null })
    expect(byId("surface-C-section")).toHaveLength(1)
    expect(any("surface-C-from-route")).toHaveLength(0)
  })

  test("the lower counter is hidden in the capped mode while the package does not need it", () => {
    const fields = [
      field("bmg_count", { value: "4" }),
      field("bmm_count", { value: "7", required: false, notNeeded: true }),
      field("surface_ha", { value: "2" }),
    ]
    const capped = mount("C", fields)
    expect(capped.any("counter-C-0-row")).not.toHaveLength(0)
    expect(capped.any("counter-C-1-row")).toHaveLength(0)
    const hosts = (id: string) => capped.any(id).filter((n) => typeof n.type === "string")
    expect(hosts("counters-C-error")).toHaveLength(0)
    // The value typed there is not touched: the field object is not called.
    expect(fields[1].onChange).not.toHaveBeenCalled()
  })

  test("counted in full, the lower counter stays on the page, without its required marker", () => {
    const lower = field("bmm_count", { value: "7", required: false, notNeeded: true })
    const { any, texts } = mount(
      "C",
      [field("bmg_count", { value: "4" }), lower, field("surface_ha", { value: "2" })],
      { countedInFull: true },
    )
    expect(any("counter-C-1-row")).not.toHaveLength(0)
    expect(texts()).toContain("Nombre de bois morts de dimension moyenne (BMm)")
  })

  test("a lower counter the package needs shows in the capped mode with its marker", () => {
    const { any, texts } = mount("E", [
      field("tgb_count", { value: "1" }),
      field("gb_count"),
      field("surface_ha", { value: "4" }),
    ])
    expect(any("counter-E-1-row")).not.toHaveLength(0)
    expect(texts()).toContain("Nombre de gros bois (GB) *")
  })

  test("the touched errors are captions under their section, only once touched", () => {
    const fields = [
      field("bmg_count", { error: "Requis", touched: true }),
      field("bmm_count", { error: "Requis", touched: false }),
      field("surface_ha", { error: "Trop petit", touched: true }),
    ]
    const { any, texts } = mount("C", fields)
    const hosts = (id: string) => any(id).filter((n) => typeof n.type === "string")
    expect(hosts("counters-C-error")).toHaveLength(1)
    expect(hosts("surface-C-section-error")).toHaveLength(1)
    expect(texts()).toContain("Requis")
    expect(texts()).toContain("Trop petit")
  })

  test("A: the cover is a percent row without its (%), 0 to 100, typed value held to 100", () => {
    const cover = field(labels.native_cover_percent, { value: "70" })
    const { any, press, texts, tree } = mount("A", [field("genera"), cover])
    expect(texts()).toContain(fr.factorDetail.valueRows.headers.cover)
    expect(texts()).toContain("Couvert des essences autochtones *")
    expect(texts()).toContain("70 %")
    press("cover-A-increase")
    expect(cover.onChange).toHaveBeenLastCalledWith("71")
    act(() => any("cover-A-value")[0].props.onPress())
    const input = tree.root.findAll((n) => n.props.testID === "cover-A-input")[0]
    act(() => input.props.onChangeText("250"))
    act(() => input.props.onBlur())
    expect(cover.onChange).toHaveBeenLastCalledWith("100")
  })

  test("G: the track and the value row share one section; both write whole percents", () => {
    const g = field("open_flowering_percent", { value: "3" })
    const { byId, any, press, texts } = mount("G", [g])
    expect(byId("percent-G-section")).toHaveLength(1)
    expect(texts()).toContain(fr.factorDetail.valueRows.headers.percent)
    expect(texts()).toContain("3 %")
    const track = any("percent-G-slider-track")[0]
    act(() => track.props.onLayout({ nativeEvent: { layout: { width: 200 } } }))
    act(() => track.props.onResponderGrant({ nativeEvent: { locationX: 2 } }))
    expect(g.onChange).toHaveBeenLastCalledWith("1")
    expect(track.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 3 })
    press("percent-G-increase")
    expect(g.onChange).toHaveBeenLastCalledWith("4")
    act(() => track.props.onResponderRelease())
    expect(g.onTouch).toHaveBeenCalled()
  })

  test("an empty G reads 0 and keeps the track at its start", () => {
    const { any } = mount("G", [field("open_flowering_percent")])
    expect(any("percent-G-slider-track")[0].props.accessibilityValue.now).toBe(0)
  })

  test("F without group counters keeps its trees per hectare as a typed row; with them, none", () => {
    const f = field("trees_per_ha", { value: "3" })
    const typed = mount("F", [f])
    expect(typed.byId("density-F-section")).toHaveLength(1)
    typed.press("density-F-increase")
    expect(f.onChange).toHaveBeenLastCalledWith("4")
    expect(mount("F", [f], { groupCounters: true }).byId("density-F-section")).toHaveLength(0)
  })

  test("the choice factors draw no value row", () => {
    expect(
      mount("H", [field("class_score")]).tree.root.findAll((n) => n.props.testID),
    ).toHaveLength(0)
  })
})
