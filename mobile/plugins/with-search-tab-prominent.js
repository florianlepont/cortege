/**
 * Makes the native search tab a separate round button again on iOS 27 (OA-100).
 *
 * With the iOS 27 SDK, `Tab(role: .search)` no longer detaches the tab from the bar: it stays
 * inside the pill with the other tabs. The detached button is now `TabRole.prominent`, new in
 * iOS 27. `react-native-bottom-tabs` still maps its `search` role to `.search`, so this plugin
 * patches that one mapping in the library's Swift source (`ios/TabViewProps.swift`) during
 * `expo prebuild`: `.prominent` from iOS 27, `.search` before. `compiler(>=6.4)` (Xcode 27) keeps
 * the code compiling with an Xcode 26 SDK, which has no `TabRole.prominent`. The `search` role stays the one
 * the app declares in `NativeRootTabs.tsx`.
 *
 * It throws if the library's code no longer has the expected shape, so a library upgrade that
 * changes it (or fixes it upstream) fails the prebuild instead of silently dropping the patch.
 * Remove this plugin once `react-native-bottom-tabs` maps the search role to `.prominent` itself.
 */
const { withDangerousMod } = require("expo/config-plugins")
const fs = require("fs")
const path = require("path")

const ORIGINAL = `    case .search:
      return .search
`

const PATCHED = `    case .search:
      #if compiler(>=6.4)
      if #available(iOS 27, *) {
        return .prominent
      }
      #endif
      return .search
`

function patchTabViewProps(source) {
  if (source.includes(PATCHED)) {
    return source
  }
  if (!source.includes(ORIGINAL)) {
    throw new Error(
      "with-search-tab-prominent: the search role mapping in react-native-bottom-tabs " +
        "(ios/TabViewProps.swift) changed. Check whether the library now handles iOS 27's " +
        "TabRole.prominent itself, then update or remove plugins/with-search-tab-prominent.js.",
    )
  }
  return source.replace(ORIGINAL, PATCHED)
}

module.exports = function withSearchTabProminent(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const packageJson = require.resolve("react-native-bottom-tabs/package.json", {
        paths: [config.modRequest.projectRoot],
      })
      const file = path.join(path.dirname(packageJson), "ios", "TabViewProps.swift")
      const source = fs.readFileSync(file, "utf8")
      const patched = patchTabViewProps(source)
      if (patched !== source) {
        fs.writeFileSync(file, patched)
      }
      return config
    },
  ])
}

module.exports.patchTabViewProps = patchTabViewProps
