import { finishSurveyCreation } from "./finish-creation"

describe("finishSurveyCreation (D-45)", () => {
  it("resets the stack to the list and the survey page, then selects the new survey", () => {
    const calls: string[] = []
    const reset = jest.fn(() => calls.push("reset"))
    const openSurvey = jest.fn(() => calls.push("open"))

    finishSurveyCreation({ reset }, openSurvey, "s-new")

    expect(reset).toHaveBeenCalledWith({
      index: 1,
      routes: [{ name: "surveysHome" }, { name: "surveyDetail" }],
    })
    expect(openSurvey).toHaveBeenCalledWith("s-new")
    expect(calls).toEqual(["reset", "open"])
  })

  it("selects once, whatever the stack held before", () => {
    const openSurvey = jest.fn()
    finishSurveyCreation({ reset: jest.fn() }, openSurvey, "s-1")
    expect(openSurvey).toHaveBeenCalledTimes(1)
  })
})
