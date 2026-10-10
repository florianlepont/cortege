import { Asset } from "expo-asset"
import * as FileSystem from "expo-file-system/legacy"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import { logStatusDetail } from "../../i18n"

// D-07: the print WebView (WKWebView, Android WebView) cannot load local files, so the charter
// fonts and the logo are read on the phone as base64 and inlined in the HTML. Metro serves the
// .ttf and .png files as numeric module ids (the pattern of navigation/tab-config.tsx); expo-asset
// downloads them to a local file that FileSystem reads. Nothing here takes a user-given path.

// The logo is 2481 px wide and 405 KB: a print logo of about 25 mm needs 240 px at most.
export const LOGO_EXPORT_WIDTH_PX = 240

export type ExportFontFile = { family: string; moduleId: number }

// PostScript names of the six cuts the charter layout uses (brand-tokens.ts `brandTypography`).
export const EXPORT_FONT_FILES: readonly ExportFontFile[] = [
  { family: "Sora-ExtraBold", moduleId: require("../../../assets/fonts/Sora-ExtraBold.ttf") },
  { family: "Sora-SemiBold", moduleId: require("../../../assets/fonts/Sora-SemiBold.ttf") },
  { family: "Sora-Medium", moduleId: require("../../../assets/fonts/Sora-Medium.ttf") },
  { family: "Sora-Light", moduleId: require("../../../assets/fonts/Sora-Light.ttf") },
  { family: "Jost-Regular", moduleId: require("../../../assets/fonts/Jost-Regular.ttf") },
  { family: "Jost-SemiBold", moduleId: require("../../../assets/fonts/Jost-SemiBold.ttf") },
]

const LOGO_FILE: { moduleId: number } = { moduleId: require("../../../assets/logo-app.png") }

export type ExportAssets = {
  fonts: Array<{ family: string; base64: string }>
  logoDataUri: string | null
}

type AssetLoader = {
  fromModule: (moduleId: number) => {
    uri: string
    localUri: string | null
    downloadAsync: () => Promise<unknown>
  }
}

type ExportAssetsDeps = {
  asset: AssetLoader
  readBase64: (uri: string) => Promise<string>
  manipulator: Pick<typeof ImageManipulator, "manipulate">
}

const defaultDeps: ExportAssetsDeps = {
  asset: Asset,
  readBase64: (uri) =>
    FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }),
  manipulator: ImageManipulator,
}

async function assetBase64(moduleId: number, deps: ExportAssetsDeps): Promise<string> {
  const asset = deps.asset.fromModule(moduleId)
  await asset.downloadAsync()
  return deps.readBase64(asset.localUri ?? asset.uri)
}

async function logoToDataUri(deps: ExportAssetsDeps): Promise<string> {
  const asset = deps.asset.fromModule(LOGO_FILE.moduleId)
  await asset.downloadAsync()
  const ref = await deps.manipulator
    .manipulate(asset.localUri ?? asset.uri)
    .resize({ width: LOGO_EXPORT_WIDTH_PX })
    .renderAsync()
  const saved = await ref.saveAsync({ format: SaveFormat.PNG, base64: true })
  if (!saved.base64) {
    throw new Error("logo: no base64 in the saved image")
  }
  return `data:image/png;base64,${saved.base64}`
}

async function readAssets(deps: ExportAssetsDeps): Promise<ExportAssets> {
  const fonts: ExportAssets["fonts"] = []
  // One at a time: the six files are small, and a sequential read keeps the order deterministic.
  for (const { family, moduleId } of EXPORT_FONT_FILES) {
    try {
      fonts.push({ family, base64: await assetBase64(moduleId, deps) })
    } catch (error) {
      logStatusDetail("surveyExport.assets", error)
    }
  }
  let logoDataUri: string | null = null
  try {
    logoDataUri = await logoToDataUri(deps)
  } catch (error) {
    logStatusDetail("surveyExport.assets", error)
  }
  return { fonts, logoDataUri }
}

let cache: Promise<ExportAssets> | null = null

/**
 * Fonts and logo as base64, read once per app run (the result is memoised). A missing asset
 * leaves that font or the logo out; the promise never rejects, so a broken asset cannot stop
 * the export.
 */
export function loadExportAssets(deps: ExportAssetsDeps = defaultDeps): Promise<ExportAssets> {
  if (!cache) {
    cache = readAssets(deps)
  }
  return cache
}

/** Clears the memo. Tests only: the app reads the assets once per run. */
export function resetExportAssetsCache(): void {
  cache = null
}
