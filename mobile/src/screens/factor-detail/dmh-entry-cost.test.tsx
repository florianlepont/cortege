/**
 * Phase 32 (D-08 as amended on 2026-10-27, ROADMAP criterion 3, part (a)): the interaction cost of
 * the NEW factor F flow, replayed against the recorded OLD flow. In the counted-in-full mode a group
 * costs one "+" press (it ticks the group and counts 1), then one stepper press per further tree; in
 * the capped mode (follow-up of 2026-10-28: a counter of 0 to 2 trees per hectare per group, like
 * the official sheet) a group costs the same "+" and the same steps. The replay goes through the real useSurveyForm, the real
 * FactorDetailScreen and the real group list. Criterion 3 is "simpler than before", not timed: the
 * press counts (new against OLD_FLOW_PRESSES) and the unchanged stored payload are the automated
 * evidence; part (b) is the owner's written confirmation on the phone (plan 32-16). The recorded
 * constants (OLD_FLOW_PRESSES, OLD_FLOW_F_PAYLOAD) stay the bar and are never edited here.
 *
 * Amended on 2026-10-28 (owner request, plan 32-17): every form section starts closed, so the replay
 * also counts one header press the first time it needs a section. S1 (three groups in three forms)
 * is therefore a TIE on presses with the old flow, 8 against 8 (3 section presses + 5), by the
 * owner's explicit choice; the gain stays on the loaded scenario S2, 26 against 29 (6 section
 * presses + 20), which is still asserted strictly. The owner's own judgement on the phone is the
 * criterion of the phase (confirmed 2026-10-27), not a press count.
 */
import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { useSurveyForm } from "../../hooks/useSurveyForm"
import { formOf } from "../../app/dmh-guide/structure"
import { FactorDetailScreen } from "../FactorDetailScreen"
import {
  DMH_ENTRY_SCENARIOS,
  DMH_ENTRY_SURFACE_HA,
  OLD_FLOW_F_PAYLOAD,
  OLD_FLOW_PRESSES,
  type DmhEntryScenarioId,
} from "./dmh-entry-scenarios"

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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    AccessibilityInfo: { announceForAccessibility: jest.fn() },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, flatten: (s: unknown) => s },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/feedback", () => ({ feedback: { selection: jest.fn() } }))

// The glass card draws blur and gradients that are not under measure: a plain wrapper.
jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})

// Factor A's camera flow is not rendered for F, but its module pulls native packages in.
jest.mock("../FactorAGenusRecognitionEntry", () => ({
  FactorAGenusRecognitionEntry: () => null,
}))

// The doubt and note strip is not part of the counting measure: a probe.
jest.mock("./DoubtNoteStrip", () => ({ DoubtNoteStrip: () => null }))

type Form = ReturnType<typeof useSurveyForm>

function Harness({ formRef, full }: { formRef: { current: Form | null }; full: boolean }) {
  const form = useSurveyForm()
  formRef.current = form
  return (
    <FactorDetailScreen
      factor="F"
      fields={form.factorSections.F}
      retainedScore={null}
      methodVersion={form.ibpMethodVersion}
      onOpenHelp={() => undefined}
      doubt={false}
      note=""
      onChangeDoubt={() => undefined}
      onChangeNote={() => undefined}
      onCommitNote={() => undefined}
      uncappedFactors={full ? ["F"] : []}
      uncappedEntry={{
        state: form.uncapped,
        setStratumCover: form.setStratumCover,
        setDmhCount: form.setDmhCount,
        bumpDmhGroup: form.bumpDmhGroup,
        markNoDmhGroup: form.markNoDmhGroup,
        setFSurface: form.setFSurface,
        addOpenArea: form.addOpenArea,
        setOpenArea: form.setOpenArea,
        removeOpenArea: form.removeOpenArea,
        markNoOpenArea: form.markNoOpenArea,
      }}
    />
  )
}

function mount(full: boolean) {
  const formRef: { current: Form | null } = { current: null }
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<Harness formRef={formRef} full={full} />)
  })
  // Found again at each press: a row re-renders into its next state (tick, "+", stepper).
  const byTestID = (testID: string) =>
    tree!.root.findAll((n) => n.props.testID === testID && typeof n.props.onPress === "function")[0]
  const stepperIncrease = (code: string) =>
    tree!.root.findAll((n) => n.props.testID === `dmh-stepper-${code}-increase`)[0]
  return { formRef, byTestID, stepperIncrease, tree: () => tree! }
}

const treesOf = (id: DmhEntryScenarioId): number =>
  DMH_ENTRY_SCENARIOS[id].groups.reduce((sum, group) => sum + group.trees, 0)

describe("new factor F flow (row list) against the recorded old flow", () => {
  test.each<[DmhEntryScenarioId, number, number]>([
    ["S1", OLD_FLOW_PRESSES.S1, treesOf("S1") + 3],
    ["S2", OLD_FLOW_PRESSES.S2, treesOf("S2") + 6],
  ])(
    "scenario %s: %i presses in the old flow, %i in the new one (sections included), same stored payload",
    (id, _oldPresses, expected) => {
      const { formRef, byTestID, stepperIncrease } = mount(true)
      const form = (): Form => formRef.current as Form
      expect(form().ibpMethodVersion).toBe(IBP_METHOD_V3_2)

      // Setup, not counted: the surface is typed once, so the density is computed.
      act(() => form().setFSurface(DMH_ENTRY_SURFACE_HA))

      let presses = 0
      const opened = new Set<string>()
      for (const { code, trees } of DMH_ENTRY_SCENARIOS[id].groups) {
        // Nothing is ticked at mount: every section starts closed (O-32-4 as amended), so the first
        // group of a form costs one header press.
        const form = formOf(code)
        if (!opened.has(form)) {
          opened.add(form)
          act(() => byTestID(`dmh-section-${form}`).props.onPress())
          presses += 1
        }
        act(() => byTestID(`dmh-add-${code}`).props.onPress())
        presses += 1
        for (let tree = 1; tree < trees; tree += 1) {
          // One "+" press of the stepper: press in then out, so the repeat never starts.
          act(() => stepperIncrease(code).props.onPressIn())
          act(() => stepperIncrease(code).props.onPressOut())
          act(() => stepperIncrease(code).props.onPress())
          presses += 1
        }
      }

      expect(presses).toBe(expected)
      if (id === "S1") {
        // A tie on presses (8 against 8), by the owner's explicit choice of 2026-10-28.
        expect(presses).toBeLessThanOrEqual(OLD_FLOW_PRESSES[id])
      } else {
        expect(presses).toBeLessThan(OLD_FLOW_PRESSES[id])
      }
      expect(form().draftInput.factors.F).toEqual(OLD_FLOW_F_PAYLOAD[id])
    },
  )

  test("capped flow S1: a counter per group (0 to 2 per hectare), as many presses as the full flow, same payload without a surface", () => {
    const { formRef, byTestID, stepperIncrease } = mount(false)
    const form = (): Form => formRef.current as Form
    // No setup: the total is derived from the counters, nothing is typed first, no surface.
    let presses = 0
    const opened = new Set<string>()
    for (const { code, trees } of DMH_ENTRY_SCENARIOS.S1.groups) {
      // Sections start closed: the first group of a form needs its header pressed.
      const section = formOf(code)
      if (!opened.has(section)) {
        opened.add(section)
        act(() => byTestID(`dmh-section-${section}`).props.onPress())
        presses += 1
      }
      act(() => byTestID(`dmh-add-${code}`).props.onPress())
      presses += 1
      for (let tree = 1; tree < trees; tree += 1) {
        act(() => stepperIncrease(code).props.onPressIn())
        act(() => stepperIncrease(code).props.onPressOut())
        act(() => stepperIncrease(code).props.onPress())
        presses += 1
      }
    }
    // The same 8 presses as the counted-in-full S1 (3 sections + 5 trees), a tie with the old flow.
    expect(presses).toBe(treesOf("S1") + 3)
    expect(presses).toBeLessThanOrEqual(OLD_FLOW_PRESSES.S1)
    expect(opened.size).toBe(3)
    // The groups are kept in option order; the total is the sum of the counters, never a surface.
    const { surface_ha: _surface, ...cappedPayload } = OLD_FLOW_F_PAYLOAD.S1
    expect(form().draftInput.factors.F).toEqual(cappedPayload)
  })

  test("capped flow: the stepper stops at 2 per group, and the total field is derived and read-only", () => {
    const { formRef, byTestID, stepperIncrease, tree } = mount(false)
    const form = (): Form => formRef.current as Form
    act(() => byTestID("dmh-section-cavities").props.onPress())
    act(() => byTestID("dmh-add-dmh_01").props.onPress())
    for (let tap = 0; tap < 3; tap += 1) {
      act(() => stepperIncrease("dmh_01").props.onPressIn())
      act(() => stepperIncrease("dmh_01").props.onPressOut())
      act(() => stepperIncrease("dmh_01").props.onPress())
    }
    expect(form().uncapped.dmhCounts).toEqual({ dmh_01: 2 })
    expect((form().draftInput.factors.F as { trees_per_ha: number }).trees_per_ha).toBe(2)
    // The trees-per-hectare field now shows the sum as a value: no text input is left to focus.
    const root = tree().root
    expect(root.findAll((n) => (n.type as unknown) === "TextInput")).toHaveLength(0)
    const block = root.find(
      (n) => (n.type as unknown) === "View" && n.props.testID === "trees-per-ha-value",
    )
    expect(block.props.accessibilityLabel).toBe("Arbres par hectare, 2")
  })
})

// Follow-up 32-25: the row that records "no group observed". Not part of the S1/S2 press counts
// (they never press it); this walks the real form through it in both modes.
describe("the 'no tree carries a dendromicrohabitat' row, on the real form", () => {
  const checkedOf = (tree: renderer.ReactTestRenderer): boolean =>
    tree.root.findAll((n) => n.props.testID === "dmh-none-row" && typeof n.type === "string")[0]
      .props.accessibilityState.checked

  test.each([false, true])(
    "full=%s: one press stores 0, the field shows 0, a second press empties it",
    (full) => {
      const { formRef, byTestID, tree } = mount(full)
      const form = (): Form => formRef.current as Form
      expect(form().draftInput.factors.F).toBeUndefined()
      expect(checkedOf(tree())).toBe(false)

      act(() => byTestID("dmh-none-row").props.onPress())
      expect(form().draftInput.factors.F).toEqual({ trees_per_ha: 0 })
      expect(form().factorRetainedScores.F).not.toBeNull()
      expect(checkedOf(tree())).toBe(true)
      const value = tree().root.find(
        (n) => (n.type as unknown) === "View" && n.props.testID === "trees-per-ha-value",
      )
      expect(value.props.accessibilityLabel).toBe("Arbres par hectare, 0")

      act(() => byTestID("dmh-none-row").props.onPress())
      expect(form().draftInput.factors.F).toBeUndefined()
      expect(checkedOf(tree())).toBe(false)
    },
  )

  test("a group's + takes over (the row unticks, the sum replaces the 0); counters back to 0 and unticked give it back", () => {
    const { formRef, byTestID, tree } = mount(false)
    const form = (): Form => formRef.current as Form
    act(() => byTestID("dmh-none-row").props.onPress())
    act(() => byTestID("dmh-section-cavities").props.onPress())
    act(() => byTestID("dmh-add-dmh_01").props.onPress())
    expect(checkedOf(tree())).toBe(false)
    expect(form().draftInput.factors.F).toEqual({
      trees_per_ha: 1,
      dmh_groups: ["dmh_01"],
      dmh_counts: { dmh_01: 1 },
    })
    // Counted: the row is locked and a press changes nothing.
    act(() => byTestID("dmh-none-row").props.onPress())
    expect(form().uncapped.dmhCounts).toEqual({ dmh_01: 1 })
    expect(checkedOf(tree())).toBe(false)
    // The hard way still works and ends in the same state.
    act(() => form().bumpDmhGroup("dmh_01", -1, 2))
    act(() => byTestID("dmh-tick-dmh_01").props.onPress())
    expect(form().draftInput.factors.F).toEqual({ trees_per_ha: 0, dmh_counts: { dmh_01: 0 } })
    expect(checkedOf(tree())).toBe(true)
  })

  test("with groups ticked at 0, pressing it clears them in one update", () => {
    const { formRef, byTestID, tree } = mount(false)
    const form = (): Form => formRef.current as Form
    act(() => byTestID("dmh-section-cavities").props.onPress())
    act(() => byTestID("dmh-add-dmh_01").props.onPress())
    act(() => form().bumpDmhGroup("dmh_01", -1, 2))
    expect(form().draftInput.factors.F).toEqual({
      trees_per_ha: 0,
      dmh_groups: ["dmh_01"],
      dmh_counts: { dmh_01: 0 },
    })
    act(() => byTestID("dmh-none-row").props.onPress())
    expect(form().draftInput.factors.F).toEqual({ trees_per_ha: 0 })
    expect(checkedOf(tree())).toBe(true)
  })
})
