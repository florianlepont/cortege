/**
 * Turns off Xcode's "User Script Sandboxing" for the app target.
 *
 * Xcode 27 sandboxes build-phase scripts by default. React Native's
 * "Bundle React Native code and images" phase writes `ip.txt` into the .app (Debug builds)
 * and fails with "Operation not permitted" under the sandbox. The Pods already set
 * ENABLE_USER_SCRIPT_SANDBOXING = NO; this plugin does the same for the app project, so a
 * regenerated `ios/` builds without opening Xcode.
 */
const { withXcodeProject } = require("expo/config-plugins")

module.exports = function withScriptSandboxingOff(config) {
  return withXcodeProject(config, (config) => {
    config.modResults.addBuildProperty("ENABLE_USER_SCRIPT_SANDBOXING", "NO")
    return config
  })
}
