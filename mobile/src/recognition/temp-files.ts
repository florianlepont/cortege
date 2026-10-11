import * as FileSystem from "expo-file-system/legacy"

/**
 * Deletion of the temporary photos of a genus recognition (SC-7).
 *
 * A recognition writes two cache files: the camera capture (`cache/Camera/`) and the resized JPEG
 * the classifier reads back (`cache/ImageManipulator/`). Photos can carry EXIF location, so each
 * is deleted as soon as it is no longer needed. Only the exact URIs the recognition created are
 * ever deleted: no directory is listed, no prefix is swept. The bundled model copy that
 * `Asset.downloadAsync()` makes (PR #272) lives in the same cache directory and must survive.
 */

/** The two cache sub-directories the recognition writes to (expo-camera, expo-image-manipulator). */
const TEMP_PHOTO_DIRECTORIES = ["Camera/", "ImageManipulator/"]

/**
 * True only for a file directly named under `cache/Camera/` or `cache/ImageManipulator/`: a
 * non-empty file name, no ".." (also percent-encoded), never a directory, the cache directory
 * itself, a sibling folder or the model copy that lives next to them.
 */
export function isDeletableTempPhoto(uri: string | null | undefined): uri is string {
  const cacheDirectory = FileSystem.cacheDirectory
  if (!cacheDirectory || !uri || !uri.startsWith(cacheDirectory) || uri.endsWith("/")) return false
  const rest = uri.slice(cacheDirectory.length)
  if (/\.\.|%2e/i.test(rest)) return false
  return TEMP_PHOTO_DIRECTORIES.some(
    (directory) => rest.length > directory.length && rest.startsWith(directory),
  )
}

/** Deletes one temporary recognition photo. Idempotent, refuses foreign URIs, never throws. */
export async function deleteTempPhoto(uri: string | null | undefined): Promise<void> {
  if (!isDeletableTempPhoto(uri)) return
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)
}
