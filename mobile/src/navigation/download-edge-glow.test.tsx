import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import { ScreenCoverContext } from "../ui/screen-cover-context"
import { DownloadEdgeGlow, DownloadEdgeGlowHost } from "./download-edge-glow"

// The real package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})
// The glow's own drawing and motion are tested in EdgePulse.test.tsx.
jest.mock("../screens/public-map/EdgePulse", () => ({ EdgePulse: "EdgePulse" }))

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

const noopUnsubscribe = () => undefined
const fakeNavigation = (focused: boolean) =>
  ({ isFocused: () => focused, addListener: () => noopUnsubscribe }) as never

type ScreenProps = { requests?: number; focused?: boolean; covered?: boolean }

function Tree({ requests = 1, focused = true, covered = false }: ScreenProps) {
  return (
    <ScreenCoverContext.Provider value={covered}>
      <DownloadEdgeGlowHost>
        <NavigationContext.Provider value={fakeNavigation(focused)}>
          {React.createElement("NavigationTree")}
          {Array.from({ length: requests }, (_, index) => (
            <DownloadEdgeGlow key={index} />
          ))}
        </NavigationContext.Provider>
      </DownloadEdgeGlowHost>
    </ScreenCoverContext.Provider>
  )
}

function render(props: ScreenProps) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<Tree {...props} />)
  })
  return tree!
}

const glows = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((node) => (node.type as unknown) === "EdgePulse").length

describe("DownloadEdgeGlow (12.2-19 fix round: round the whole screen)", () => {
  test("the host draws the glow after the tree only while the Explorer asks for it", () => {
    const tree = render({ requests: 0 })
    expect(glows(tree)).toBe(0)
    act(() => tree.update(<Tree requests={1} />))
    expect(glows(tree)).toBe(1)
    // Drawn as the host's last child, after the navigation tree, so above its tab bar.
    const drawn = tree.toJSON() as renderer.ReactTestRendererJSON[]
    expect(drawn.map((node) => node.type)).toEqual(["NavigationTree", "EdgePulse"])
    act(() => tree.update(<Tree requests={0} />))
    expect(glows(tree)).toBe(0)
  })

  test("one glow for any number of requests, until the last one goes", () => {
    const tree = render({ requests: 2 })
    expect(glows(tree)).toBe(1)
    act(() => tree.update(<Tree requests={1} />))
    expect(glows(tree)).toBe(1)
    act(() => tree.update(<Tree requests={0} />))
    expect(glows(tree)).toBe(0)
  })

  test("no glow while the Explorer is not focused (another tab, a pushed page)", () => {
    expect(glows(render({ focused: false }))).toBe(0)
  })

  test("no glow while an app overlay covers the tree", () => {
    const tree = render({ covered: true })
    expect(glows(tree)).toBe(0)
    act(() => tree.update(<Tree covered={false} />))
    expect(glows(tree)).toBe(1)
  })

  test("without a host the request draws nothing and does not throw", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<DownloadEdgeGlow />)
    })
    expect(tree!.toJSON()).toBeNull()
  })
})
