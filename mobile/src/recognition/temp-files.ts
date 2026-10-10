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

/** True only for a file URI under the app cache directory that carries no ".." segment. */
export function isDeletableTempPhoto(uri: string | null | undefined): uri is string {
  const cacheDirectory = FileSystem.cacheDirectory
  if (!cacheDirectory || !uri) return false
  return uri.startsWith(cacheDirectory) && !uri.includes("..")
}

/** Deletes one temporary recognition photo. Idempotent, refuses foreign URIs, never throws. */
export async function deleteTempPhoto(uri: string | null | undefined): Promise<void> {
  if (!isDeletableTempPhoto(uri)) return
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)
}
