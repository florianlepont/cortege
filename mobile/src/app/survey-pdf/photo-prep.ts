import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import { logStatusDetail } from "../../i18n"
import { computeResizeTarget } from "../../storage/attachments"

// D-05: photos go into the print HTML as JPEG data URIs. Each one is resized to a long edge and
// compressed, one at a time (RESEARCH Pitfall 4: decoding several 12 MP photos together spikes
// memory). The cap, the long edge and the quality come from the caller: plan 25.1-07 sets them
// from the device measurements, so this module holds no default.

export type PhotoExportSettings = { cap: number; longEdgePx: number; jpegQuality: number }
export type PhotoSource = { id: string; uri: string }
export type PreparedPhoto = { id: string; dataUri: string; width: number; height: number }

type PhotoPrepDeps = { manipulator: Pick<typeof ImageManipulator, "manipulate"> }

async function prepareOne(
  source: PhotoSource,
  settings: PhotoExportSettings,
  deps: PhotoPrepDeps,
): Promise<PreparedPhoto> {
  // First render reads the size; the photo is rendered again only when it has to shrink.
  let image = await deps.manipulator.manipulate(source.uri).renderAsync()
  const target = computeResizeTarget(image.width, image.height, settings.longEdgePx)
  if (target) {
    image = await deps.manipulator.manipulate(source.uri).resize(target).renderAsync()
  }
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: settings.jpegQuality,
    base64: true,
  })
  if (!saved.base64) {
    throw new Error(`photo ${source.id}: no base64 in the saved image`)
  }
  return {
    id: source.id,
    dataUri: `data:image/jpeg;base64,${saved.base64}`,
    width: saved.width,
    height: saved.height,
  }
}

/**
 * Prepares the first `settings.cap` photos in input order, sequentially. A photo that fails is
 * skipped and counted in `failed`; `capped` is the number of sources the cap left out.
 */
export async function preparePhotosForExport(
  sources: readonly PhotoSource[],
  settings: PhotoExportSettings,
  deps: PhotoPrepDeps = { manipulator: ImageManipulator },
): Promise<{ photos: PreparedPhoto[]; failed: number; capped: number }> {
  const taken = sources.slice(0, settings.cap)
  const photos: PreparedPhoto[] = []
  let failed = 0
  for (const source of taken) {
    try {
      photos.push(await prepareOne(source, settings, deps))
    } catch (error) {
      failed += 1
      logStatusDetail("surveyExport.photo", error)
    }
  }
  return { photos, failed, capped: sources.length - taken.length }
}
