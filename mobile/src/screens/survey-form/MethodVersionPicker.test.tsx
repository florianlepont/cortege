import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2, type IbpMethodVersion } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { MethodVersionPicker } from "./MethodVersionPicker"

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

const renderPicker = (version: IbpMethodVersion | null, locked = false, onChange = jest.fn()) => {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <MethodVersionPicker version={version} locked={locked} onChange={onChange} />,
    )
  })
  const chips = tree.root.findAllByType("AppChoiceChip" as unknown as React.ElementType)
  const header = tree.root.findByType("AppSectionHeader" as unknown as React.ElementType)
  const texts = tree.root
    .findAllByType("Text" as unknown as React.ElementType)
    .map((node) => textOf(node))
  return { tree, chips, header, texts, onChange }
}

describe("MethodVersionPicker", () => {
  test("shows the v3.2 and v3.0 chips, v3.2 selected, with the title and the hint", () => {
    const { chips, header } = renderPicker(IBP_METHOD_V3_2)
    expect(chips.map((chip) => chip.props.label)).toEqual([
      fr.ibpMethod.versions[IBP_METHOD_V3_2],
      fr.ibpMethod.versions[IBP_METHOD_V3_0],
    ])
    expect(chips.map((chip) => chip.props.active)).toEqual([true, false])
    expect(header.props.title).toBe(fr.ibpMethod.versionTitle)
    expect(header.props.subtitle).toBe(fr.ibpMethod.versionHint)
  })

  test("pressing v3.0 asks for v3.0, pressing v3.2 asks for v3.2", () => {
    const { chips, onChange } = renderPicker(IBP_METHOD_V3_2)
    act(() => {
      chips[1].props.onPress()
    })
    expect(onChange).toHaveBeenLastCalledWith(IBP_METHOD_V3_0)
    act(() => {
      chips[0].props.onPress()
    })
    expect(onChange).toHaveBeenLastCalledWith(IBP_METHOD_V3_2)
  })

  test("an untagged legacy draft shows v3.0 selected and the legacy label", () => {
    const { chips, texts } = renderPicker(null)
    expect(chips.map((chip) => chip.props.active)).toEqual([false, true])
    expect(texts).toContain(fr.ibpMethod.legacyVersionLabel)
  })

  test("locked: the chips cannot be pressed and the hint says why", () => {
    const { chips, header, onChange } = renderPicker(IBP_METHOD_V3_0, true)
    expect(chips.map((chip) => chip.props.onPress)).toEqual([undefined, undefined])
    expect(chips.map((chip) => chip.props.active)).toEqual([false, true])
    expect(header.props.subtitle).toBe(fr.ibpMethod.versionLockedHint)
    expect(onChange).not.toHaveBeenCalled()
  })
})
