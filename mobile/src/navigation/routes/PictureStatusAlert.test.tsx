import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"
import { PictureStatusAlert } from "./PictureStatusAlert"

const mockAlert = jest.fn()
jest.mock("react-native", () => ({ Alert: { alert: (...args: unknown[]) => mockAlert(...args) } }))

let mockStatus: string = ""
jest.mock("../../state/status-context", () => ({ useStatus: () => ({ status: mockStatus }) }))

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

beforeEach(() => {
  mockAlert.mockClear()
  mockStatus = fr.status.profile.loginRequired()
})

async function mountAndSet(next: string) {
  let tree!: renderer.ReactTestRenderer
  await act(async () => {
    tree = renderer.create(<PictureStatusAlert />)
  })
  mockStatus = next
  await act(async () => {
    tree.update(<PictureStatusAlert />)
  })
}

describe("PictureStatusAlert (OA-76)", () => {
  test("a failed upload raises an alert with the status text", async () => {
    await mountAndSet(fr.status.profile.pictureUploadFailed())
    expect(mockAlert).toHaveBeenCalledWith(
      fr.account.alerts.photo.title,
      fr.status.profile.pictureUploadFailed(),
    )
  })

  test("a permission refusal raises an alert", async () => {
    await mountAndSet(fr.status.profile.mediaLibraryPermissionRequired())
    expect(mockAlert).toHaveBeenCalledTimes(1)
  })

  test("cancelling the picker and unrelated statuses stay silent", async () => {
    await mountAndSet(fr.status.profile.noImageSelected())
    await mountAndSet(fr.status.profile.updated())
    expect(mockAlert).not.toHaveBeenCalled()
  })

  test("a picture status already there on mount does not alert", async () => {
    mockStatus = fr.status.profile.pictureUploadFailed()
    await act(async () => {
      renderer.create(<PictureStatusAlert />)
    })
    expect(mockAlert).not.toHaveBeenCalled()
  })
})
