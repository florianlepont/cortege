import * as FileSystem from "expo-file-system/legacy"
import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import { Platform } from "react-native"
import { fr, logStatusDetail } from "../../i18n"
import { assembleSurveyExportData } from "./assemble-export-data"
import { buildSurveyExportHtml } from "./build-html"
import { PDF_PAGE } from "./export-settings"
import { buildExportFileName } from "./file-name"
import type { SurveyExportData, SurveyExportInput } from "./types"

// Phase 25.1, D-11: the file side of the export. The HTML is printed to A4 (zero margins, the
// layout owns its own), the file is moved to a readable name under `<cache>/exports/` and handed
// to the OS share sheet. Nothing is uploaded and no network call is made here. Exports older than
// an hour are removed at the START of the next export: never right after sharing, because an
// Android target app may still be reading the file.

const t = fr.surveyExport

/** Folder of the named exports, under the cache directory. */
export const EXPORTS_DIR_NAME = "exports/"
/** Age after which an export is removed at the next export: one hour. */
export const STALE_EXPORT_MS = 3600000

/** The native modules and loaders of the runner, injectable so a test needs none of them. */
export type RunExportDeps = {
  print: (options: {
    html: string
    width: number
    height: number
    margins: { left: number; top: number; right: number; bottom: number }
  }) => Promise<{ uri: string; numberOfPages?: number }>
  sharing: {
    isAvailableAsync: () => Promise<boolean>
    shareAsync: (
      uri: string,
      options: { mimeType: string; dialogTitle: string; UTI: string },
    ) => Promise<void>
  }
  fileSystem: Pick<
    typeof FileSystem,
    | "cacheDirectory"
    | "makeDirectoryAsync"
    | "deleteAsync"
    | "moveAsync"
    | "readDirectoryAsync"
    | "getInfoAsync"
  >
  assemble: (input: SurveyExportInput) => Promise<SurveyExportData>
  platform: "ios" | "android"
  now: () => Date
}

export function defaultRunExportDeps(): RunExportDeps {
  return {
    print: (options) => Print.printToFileAsync(options),
    sharing: Sharing,
    fileSystem: FileSystem,
    assemble: (input) => assembleSurveyExportData(input),
    platform: Platform.OS === "ios" ? "ios" : "android",
    now: () => new Date(),
  }
}

function exportsDirectory(deps: RunExportDeps): string {
  const cache = deps.fileSystem.cacheDirectory
  if (!cache) {
    throw new Error("export: no cache directory")
  }
  return `${cache}${EXPORTS_DIR_NAME}`
}

/**
 * Deletes the files of `<cache>/exports/` last modified more than `STALE_EXPORT_MS` before `now`.
 * Best effort: a folder that cannot be listed or a file that cannot be removed is skipped, because
 * a leftover file must never stop the next export.
 */
export async function cleanStaleExports(
  now: Date,
  deps: RunExportDeps = defaultRunExportDeps(),
): Promise<void> {
  let directory: string
  let names: string[]
  try {
    directory = exportsDirectory(deps)
    names = await deps.fileSystem.readDirectoryAsync(directory)
  } catch (error) {
    logStatusDetail("surveyExport.cleanup", error)
    return
  }
  for (const name of names) {
    const uri = `${directory}${name}`
    try {
      const info = await deps.fileSystem.getInfoAsync(uri)
      // expo-file-system reports the modification time in seconds since the epoch.
      if (info.exists && now.getTime() - info.modificationTime * 1000 > STALE_EXPORT_MS) {
        await deps.fileSystem.deleteAsync(uri, { idempotent: true })
      }
    } catch (error) {
      logStatusDetail("surveyExport.cleanup", error)
    }
  }
}

/** Prints the HTML to an A4 PDF in the print cache. Rejects when the print fails. */
export async function printSurveyPdf(
  html: string,
  deps: RunExportDeps = defaultRunExportDeps(),
): Promise<{ uri: string; numberOfPages: number | undefined }> {
  const { uri, numberOfPages } = await deps.print({
    html,
    width: PDF_PAGE.width,
    height: PDF_PAGE.height,
    margins: { left: 0, top: 0, right: 0, bottom: 0 },
  })
  return { uri, numberOfPages }
}

/**
 * Moves the printed file to `<cache>/exports/<name>`, after removing a file of the same name (a
 * second export of the same survey), and returns the new URI. `name` comes from
 * `buildExportFileName`, which only produces ASCII letters, digits and dashes.
 */
export async function moveToExportName(
  uri: string,
  name: string,
  deps: RunExportDeps = defaultRunExportDeps(),
): Promise<string> {
  const directory = exportsDirectory(deps)
  await deps.fileSystem.makeDirectoryAsync(directory, { intermediates: true })
  const target = `${directory}${name}`
  await deps.fileSystem.deleteAsync(target, { idempotent: true })
  await deps.fileSystem.moveAsync({ from: uri, to: target })
  return target
}

/** Sends a generated PDF through the OS share sheet. Returns false when no share target exists. */
export async function shareSurveyExportPdf(
  uri: string,
  siteName: string,
  deps: RunExportDeps = defaultRunExportDeps(),
): Promise<boolean> {
  if (!(await deps.sharing.isAvailableAsync())) {
    return false
  }
  await deps.sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: t.shareDialogTitle(siteName),
    UTI: "com.adobe.pdf",
  })
  return true
}

/**
 * The whole export: remove old exports, gather the data, build the HTML, print, rename, share.
 * A print or share error rejects, so the caller can tell the user; the file is kept after
 * sharing. `shared` is false when the phone has no share target (the file is still generated).
 */
export async function exportAndShareSurveyPdf(
  input: SurveyExportInput,
  deps: RunExportDeps = defaultRunExportDeps(),
): Promise<{ shared: boolean }> {
  await cleanStaleExports(deps.now(), deps)
  const data = await deps.assemble(input)
  const { html, pageCount } = buildSurveyExportHtml(data)
  const printed = await printSurveyPdf(html, deps)
  // Android reports a page count that does not match the file (measured in plan 25.1-07).
  if (deps.platform === "ios" && printed.numberOfPages !== pageCount) {
    logStatusDetail("surveyExport.pageCount", {
      built: pageCount,
      printed: printed.numberOfPages,
    })
  }
  const name = buildExportFileName({
    siteName: data.siteName,
    observationYear: data.observationYear,
    dateIso: data.dateIso,
    isDraft: data.isDraft,
  })
  const uri = await moveToExportName(printed.uri, name, deps)
  const shared = await shareSurveyExportPdf(uri, data.siteName, deps)
  return { shared }
}
