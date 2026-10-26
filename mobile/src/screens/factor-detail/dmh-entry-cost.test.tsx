/**
 * Phase 32 (D-08, ROADMAP criterion 3): the interaction cost of the OLD factor F flow, measured
 * before the F entry changes. A chip press ticks a group, then the + press of the separate counter
 * block adds one tree, exactly as an observer does; every counted press is one user press. The
 * replay goes through the real useSurveyForm and the real FactorDetailScreen in full counting mode.
 *
 * Plan 32-14 replaces this replay with the new row list and keeps the recorded constants
 * (OLD_FLOW_PRESSES, OLD_FLOW_F_PAYLOAD) as the bar to beat.
 */
import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { selectionLabel } from "../../app/factor-selections"
import { useSurveyForm } from "../../hooks/useSurveyForm"
import { FactorDetailScreen } from "../FactorDetailScreen"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
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
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useColorScheme: () => "light",
  }
})

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

function Harness({ formRef }: { formRef: { current: Form | null } }) {
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
      uncappedFactors={["F"]}
      uncappedEntry={{
        state: form.uncapped,
        setStratumCover: form.setStratumCover,
        setDmhCount: form.setDmhCount,
        setFSurface: form.setFSurface,
      }}
    />
  )
}

function mount() {
  const formRef: { current: Form | null } = { current: null }
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<Harness formRef={formRef} />)
  })
  return { root: tree!.root, formRef }
}

describe("old factor F flow (chips, then counters)", () => {
  test.each<DmhEntryScenarioId>(["S1", "S2"])(
    "scenario %s: presses and stored payload of the old flow",
    (id) => {
      const { root, formRef } = mount()
      const form = (): Form => formRef.current as Form
      expect(form().ibpMethodVersion).toBe(IBP_METHOD_V3_2)

      // Setup, not counted: the surface is typed once, so the density is computed.
      act(() => form().setFSurface(DMH_ENTRY_SURFACE_HA))

      let presses = 0
      for (const { code, trees } of DMH_ENTRY_SCENARIOS[id].groups) {
        const label = selectionLabel("F", code, form().ibpMethodVersion)
        const chip = root.findAll((n) => n.type === AppChoiceChip && n.props.label === label)[0]
        act(() => chip.props.onPress())
        presses += 1
        const plus = root.findAll((n) => n.props.testID === `dmh-count-${code}-increase`)[0]
        for (let tree = 0; tree < trees; tree += 1) {
          // One + press: press in then out, so the 120 ms repeat never fires.
          act(() => plus.props.onPressIn())
          act(() => plus.props.onPressOut())
          presses += 1
        }
      }

      const groups = DMH_ENTRY_SCENARIOS[id].groups
      expect(presses).toBe(groups.length + groups.reduce((sum, group) => sum + group.trees, 0))
      expect(presses).toBe(OLD_FLOW_PRESSES[id])
      expect(form().draftInput.factors.F).toEqual(OLD_FLOW_F_PAYLOAD[id])
    },
  )
})
