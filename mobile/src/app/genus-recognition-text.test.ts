import { confidenceLine } from "./genus-recognition-text"
import { fr } from "../i18n"

describe("confidenceLine", () => {
  it("composes the plain-word label and its hint for every confidence level", () => {
    for (const label of ["strong", "medium", "weak", "very-weak"] as const) {
      expect(confidenceLine(label)).toBe(
        `${fr.genusRecognition.confidence[label]}. ${fr.genusRecognition.confidenceHint[label]}`,
      )
    }
  })
})
