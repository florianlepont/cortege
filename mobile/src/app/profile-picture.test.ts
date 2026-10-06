import { __setMockImageSize, ImageManipulator } from "../../test/expo-image-manipulator.mock"
import {
  computeSquareCrop,
  PROFILE_PICTURE_EDGE_PX,
  PROFILE_PICTURE_JPEG_QUALITY,
  prepareProfilePicture,
} from "./profile-picture"

const manipulate = ImageManipulator.manipulate as jest.Mock

function lastContext() {
  const results = manipulate.mock.results
  return results[results.length - 1].value as {
    crop: jest.Mock
    resize: jest.Mock
    renderAsync: jest.Mock
  }
}

describe("computeSquareCrop", () => {
  test("centres the square on the longer axis of a landscape image", () => {
    expect(computeSquareCrop(4000, 3000)).toEqual({
      originX: 500,
      originY: 0,
      width: 3000,
      height: 3000,
    })
  })

  test("centres the square on a portrait image", () => {
    expect(computeSquareCrop(3000, 4001)).toEqual({
      originX: 0,
      originY: 500,
      width: 3000,
      height: 3000,
    })
  })

  test("keeps a square image whole", () => {
    expect(computeSquareCrop(800, 800)).toEqual({ originX: 0, originY: 0, width: 800, height: 800 })
  })

  test("is null when the size is unknown or invalid", () => {
    expect(computeSquareCrop(0, 100)).toBeNull()
    expect(computeSquareCrop(100, -1)).toBeNull()
    expect(computeSquareCrop(Number.NaN, 100)).toBeNull()
  })
})

describe("prepareProfilePicture", () => {
  beforeEach(() => {
    manipulate.mockClear()
    __setMockImageSize(4032, 3024)
  })

  test("crops to the centred square, shrinks it and saves a JPEG, from the picker's size", async () => {
    const prepared = await prepareProfilePicture({
      uri: "file:///pick.heic",
      width: 4000,
      height: 3000,
    })

    expect(manipulate).toHaveBeenCalledTimes(1)
    const context = lastContext()
    expect(context.crop).toHaveBeenCalledWith({
      originX: 500,
      originY: 0,
      width: 3000,
      height: 3000,
    })
    expect(context.resize).toHaveBeenCalledWith({ width: PROFILE_PICTURE_EDGE_PX })
    expect(prepared.mimeType).toBe("image/jpeg")
    expect(prepared.uri).toMatch(/\.jpg$/)
    const image = await context.renderAsync.mock.results[0].value
    expect(image.saveAsync).toHaveBeenCalledWith({
      format: "jpeg",
      compress: PROFILE_PICTURE_JPEG_QUALITY,
    })
  })

  test("does not enlarge a small image", async () => {
    await prepareProfilePicture({ uri: "file:///small.jpg", width: 300, height: 200 })

    const context = lastContext()
    expect(context.crop).toHaveBeenCalledWith({ originX: 50, originY: 0, width: 200, height: 200 })
    expect(context.resize).not.toHaveBeenCalled()
  })

  test("reads the size off a first render when the picker gave none", async () => {
    __setMockImageSize(2000, 1000)

    await prepareProfilePicture({ uri: "file:///nosize.jpg" })

    expect(manipulate).toHaveBeenCalledTimes(2)
    const context = lastContext()
    expect(context.crop).toHaveBeenCalledWith({
      originX: 500,
      originY: 0,
      width: 1000,
      height: 1000,
    })
    expect(context.resize).toHaveBeenCalledWith({ width: PROFILE_PICTURE_EDGE_PX })
  })

  test("saves the image as it is when its size cannot be known", async () => {
    __setMockImageSize(0, 0)

    const prepared = await prepareProfilePicture({ uri: "file:///broken.jpg", width: 0, height: 0 })

    const context = lastContext()
    expect(context.crop).not.toHaveBeenCalled()
    expect(context.resize).not.toHaveBeenCalled()
    expect(prepared.mimeType).toBe("image/jpeg")
  })
})
