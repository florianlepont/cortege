import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"

const mockNavigate = jest.fn()
jest.mock("@react-navigation/native", () => ({ useNavigation: () => ({ navigate: mockNavigate }) }))
jest.mock("../public-map/MapChips", () => ({
  MapActionPill: "MapActionPill",
}))

import { SeeOnMapAction } from "./SeeOnMapAction"

describe("SeeOnMapAction (OA-59)", () => {
  test("opens the Explorer on the survey, centred on its position", () => {
    jest.spyOn(Date, "now").mockReturnValue(1234)
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <SeeOnMapAction surveyId="s-1" siteName="Bois" coordinates={{ lat: 46.5, lng: 2.1 }} />,
      )
    })
    const pill = tree.root.findByType("MapActionPill" as never)
    expect(pill.props.label).toBe(fr.surveyDetail.map.seeOnMap)
    expect(pill.props.accessibilityLabel).toBe(fr.surveyDetail.a11y.seeOnMap("Bois"))
    act(() => pill.props.onPress())
    expect(mockNavigate).toHaveBeenCalledWith("publicMap", {
      screen: "publicMapHome",
      params: { focus: { surveyId: "s-1", lat: 46.5, lng: 2.1, nonce: 1234 } },
    })
  })
})
