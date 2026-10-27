/**
 * Phase 32 (D-08 as amended on 2026-10-27, ROADMAP criterion 3, part (a)): the interaction cost of
 * the NEW factor F flow, replayed against the recorded OLD flow. In the counted-in-full mode a group
 * costs one "+" press (it ticks the group and counts 1), then one stepper press per further tree; in
 * the capped mode a group costs one tick. The replay goes through the real useSurveyForm, the real
 * FactorDetailScreen and the real group list. Criterion 3 is "simpler than before", not timed: the
 * press counts (new against OLD_FLOW_PRESSES) and the unchanged stored payload are the automated
 * evidence; part (b) is the owner's written confirmation on the phone (plan 32-16). The recorded
 * constants (OLD_FLOW_PRESSES, OLD_FLOW_F_PAYLOAD) stay the bar and are never edited here.
 */
import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { useSurveyForm } from "../../hooks/useSurveyForm"
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
        setFSurface: form.setFSurface,
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
  return { formRef, byTestID, stepperIncrease }
}

const treesOf = (id: DmhEntryScenarioId): number =>
  DMH_ENTRY_SCENARIOS[id].groups.reduce((sum, group) => sum + group.trees, 0)

describe("new factor F flow (row list) against the recorded old flow", () => {
  test.each<[DmhEntryScenarioId, number, number]>([
    ["S1", OLD_FLOW_PRESSES.S1, treesOf("S1")],
    ["S2", OLD_FLOW_PRESSES.S2, treesOf("S2")],
  ])(
    "scenario %s: %i presses in the old flow, %i in the new one, same stored payload",
    (id, _oldPresses, expected) => {
      const { formRef, byTestID, stepperIncrease } = mount(true)
      const form = (): Form => formRef.current as Form
      expect(form().ibpMethodVersion).toBe(IBP_METHOD_V3_2)

      // Setup, not counted: the surface is typed once, so the density is computed.
      act(() => form().setFSurface(DMH_ENTRY_SURFACE_HA))

      let presses = 0
      for (const { code, trees } of DMH_ENTRY_SCENARIOS[id].groups) {
        // Nothing is ticked at mount: every section is open (O-32-4), no header press is needed.
        act(() => byTestID(`dmh-add-${code}`).props.onPress())
        presses += 1
        for (let tree = 1; tree < trees; tree += 1) {
          // One "+" press of the stepper: press in then out, so the 120 ms repeat never fires.
          act(() => stepperIncrease(code).props.onPressIn())
          act(() => stepperIncrease(code).props.onPressOut())
          presses += 1
        }
      }

      expect(presses).toBe(expected)
      expect(presses).toBeLessThan(OLD_FLOW_PRESSES[id])
      expect(form().draftInput.factors.F).toEqual(OLD_FLOW_F_PAYLOAD[id])
    },
  )

  test("capped flow S1: one tick per group, no more presses than the old chips, groups kept in option order", () => {
    const { formRef, byTestID } = mount(false)
    const form = (): Form => formRef.current as Form
    // Setup, not counted: the groups are stored only with their scored key (trees per hectare).
    act(() => form().factorSections.F[0].onChange("5"))
    let presses = 0
    for (const { code } of DMH_ENTRY_SCENARIOS.S1.groups) {
      act(() => byTestID(`dmh-tick-${code}`).props.onPress())
      presses += 1
    }
    expect(presses).toBe(DMH_ENTRY_SCENARIOS.S1.groups.length)
    expect(presses).toBeLessThanOrEqual(3)
    expect((form().draftInput.factors.F as { dmh_groups?: string[] }).dmh_groups).toEqual(
      DMH_ENTRY_SCENARIOS.S1.groups.map((group) => group.code),
    )
  })
})
