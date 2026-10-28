import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../i18n"
import { FactorAGenusRecognitionEntry } from "./FactorAGenusRecognitionEntry"

const mockModalProps: {
  current: { visible: boolean; onConfirmGenus: (g: string) => void } | null
} = { current: null }

jest.mock("../ui/GenusRecognitionModal", () => ({
  GenusRecognitionModal: (props: { visible: boolean; onConfirmGenus: (g: string) => void }) => {
    mockModalProps.current = props
    return null
  },
}))
jest.mock("../ui/AppButton", () => ({
  AppButton: (props: Record<string, unknown>) => require("react").createElement("AppButton", props),
}))

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})
afterAll(() => jest.restoreAllMocks())

describe("FactorAGenusRecognitionEntry", () => {
  const field = (value: string, onChange: (v: string) => void) =>
    ({ value, onChange }) as unknown as React.ComponentProps<
      typeof FactorAGenusRecognitionEntry
    >["genusField"]

  test("the page holds the photo button and no capture hint sentence", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<FactorAGenusRecognitionEntry genusField={field("", jest.fn())} />)
    })
    const button = tree.root.findByType("AppButton" as unknown as React.ElementType)
    expect(button.props.label).toBe(fr.genusRecognition.entryButton)
    const json = JSON.stringify(tree.toJSON())
    expect(json).not.toContain(fr.genusRecognition.captureHint)
    expect(mockModalProps.current?.visible).toBe(false)
  })

  test("the button opens the camera, a confirmed genus merges into the list", () => {
    const onChange = jest.fn()
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<FactorAGenusRecognitionEntry genusField={field("Fagus", onChange)} />)
    })
    act(() => tree.root.findByType("AppButton" as unknown as React.ElementType).props.onPress())
    expect(mockModalProps.current?.visible).toBe(true)
    act(() => mockModalProps.current?.onConfirmGenus("Acer"))
    expect(onChange).toHaveBeenCalledWith("Fagus,Acer")
  })
})
