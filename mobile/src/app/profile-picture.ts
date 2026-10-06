import { ImageManipulator, SaveFormat } from "expo-image-manipulator"

// OA-87: the gallery used to open through the picker's built-in crop editor (`allowsEditing`),
// which makes iOS fall back to the legacy, slow image picker and transcode every pick. The
// picker now only picks; the square crop and the size reduction happen here, in one pass.
export const PROFILE_PICTURE_EDGE_PX = 512
export const PROFILE_PICTURE_JPEG_QUALITY = 0.8

export type SquareCrop = { originX: number; originY: number; width: number; height: number }

/** Pure: the centred square of an image, or null when its size is unknown. */
export function computeSquareCrop(width: number, height: number): SquareCrop | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  const side = Math.floor(Math.min(width, height))
  return {
    originX: Math.floor((width - side) / 2),
    originY: Math.floor((height - side) / 2),
    width: side,
    height: side,
  }
}

export type ProfilePictureSource = {
  uri: string
  width?: number | null
  height?: number | null
}

export type PreparedProfilePicture = { uri: string; mimeType: "image/jpeg" }

/**
 * The picked photo as the profile picture: centred square, at most PROFILE_PICTURE_EDGE_PX a
 * side, JPEG (this is also what converts HEIC). The picker's own size is trusted; it is read off
 * a first render only when the picker gave none.
 */
export async function prepareProfilePicture(
  asset: ProfilePictureSource,
): Promise<PreparedProfilePicture> {
  let width = asset.width ?? 0
  let height = asset.height ?? 0
  if (!(width > 0 && height > 0)) {
    const probe = await ImageManipulator.manipulate(asset.uri).renderAsync()
    width = probe.width
    height = probe.height
  }

  const crop = computeSquareCrop(width, height)
  let context = ImageManipulator.manipulate(asset.uri)
  if (crop) {
    context = context.crop(crop)
    if (crop.width > PROFILE_PICTURE_EDGE_PX) {
      context = context.resize({ width: PROFILE_PICTURE_EDGE_PX })
    }
  }
  const image = await context.renderAsync()
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: PROFILE_PICTURE_JPEG_QUALITY,
  })
  return { uri: saved.uri, mimeType: "image/jpeg" }
}
