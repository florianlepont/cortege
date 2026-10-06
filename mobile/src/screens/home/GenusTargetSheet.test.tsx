/**
 * Tests for GenusTargetSheet (OA-114): the native sheet that says where a genus found by photo goes.
 */
import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
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
    Modal: mockComponent("Modal"),
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("../../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../../ui/AppGroupedList", () => ({ AppGroupedList: "AppGroupedList" }))

import { GenusTargetSheet } from "./GenusTargetSheet"

const t = fr.home.tools

function mount(targets = [{ id: "s1", name: "Bois Joli", progress: 3 }]) {
  const handlers = { onStartSurvey: jest.fn(), onChooseTarget: jest.fn(), onClose: jest.fn() }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <GenusTargetSheet visible genusName="Hêtre" targets={targets} {...handlers} />,
    )
  })
  const byType = (type: string) => tree.root.findAll((node) => (node.type as unknown) === type)
  return { tree, byType, ...handlers }
}

describe("GenusTargetSheet", () => {
  it("is a native page sheet that opens with the genus as its title", () => {
    const { byType, tree } = mount()
    expect(byType("Modal")[0].props.presentationStyle).toBe("pageSheet")
    const all = byType("Text").flatMap((node) => React.Children.toArray(node.props.children))
    expect(all).toContain("Hêtre")
    expect(all).toContain(t.close)
    expect(tree.toJSON()).not.toBeNull()
  })

  it("starts a survey with the genus from the one filled button, closing the sheet first", () => {
    const { byType, onStartSurvey, onClose } = mount()
    const start = byType("AppButton")[0]
    expect(start.props.label).toBe(t.startSurvey)
    act(() => start.props.onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onStartSurvey).toHaveBeenCalledTimes(1)
  })

  it("lists the surveys in progress, each one adding the genus to it", () => {
    const { byType, onChooseTarget, onClose } = mount()
    const section = byType("AppGroupedList")[0].props.sections[0]
    expect(section.title).toBe(t.addToSurveyTitle)
    expect(section.footer).toBe(t.addToSurveyFooter)
    expect(section.rows).toEqual([
      { key: "s1", label: "Bois Joli", value: "3/10", onPress: expect.any(Function) },
    ])
    act(() => section.rows[0].onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onChooseTarget).toHaveBeenCalledWith("s1")
  })

  it("says so when no survey is in progress, and closes from its Fermer button", () => {
    const { byType, onClose } = mount([])
    expect(byType("AppGroupedList")[0].props.sections[0].footer).toBe(t.noOpenSurvey)
    act(() => byType("Pressable")[0].props.onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
