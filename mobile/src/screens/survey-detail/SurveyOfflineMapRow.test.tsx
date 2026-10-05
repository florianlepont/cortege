import React from "react"
import renderer, { act } from "react-test-renderer"

const mockPrompt = jest.fn()
jest.mock("../../hooks/useOfflineMapPrompt", () => ({
  useOfflineMapPrompt: (...args: unknown[]) => mockPrompt(...args),
}))
jest.mock("../../ui/OfflineMapPrompt", () => ({ OfflineMapPrompt: "OfflineMapPrompt" }))

import { SurveyOfflineMapRow } from "./SurveyOfflineMapRow"

describe("SurveyOfflineMapRow", () => {
  test("asks the prompt hook for the survey position and renders the row", () => {
    mockPrompt.mockReturnValue({ state: "missing" })
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <SurveyOfflineMapRow
          apiUrl="u"
          accessToken="t"
          siteName="Bois"
          displayLocation={{ lat: 46.1, lng: 1.2 }}
        />,
      )
    })
    expect(mockPrompt).toHaveBeenCalledWith({
      apiUrl: "u",
      accessToken: "t",
      point: { lat: 46.1, lng: 1.2 },
    })
    const row = tree.root.findByType("OfflineMapPrompt" as never)
    expect(row.props.variant).toBe("row")
    expect(row.props.siteName).toBe("Bois")
  })

  test("without a position there is no point", () => {
    mockPrompt.mockReturnValue({ state: "hidden" })
    act(() => {
      renderer.create(
        <SurveyOfflineMapRow
          apiUrl="u"
          accessToken={null}
          siteName="x"
          displayLocation={undefined}
        />,
      )
    })
    expect(mockPrompt).toHaveBeenLastCalledWith(expect.objectContaining({ point: null }))
  })
})
