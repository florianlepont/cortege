// react-native-worklets (Reanimated 4's runtime) needs its Babel plugin last, per its own setup
// docs — it rewrites `worklet` functions after every other transform has run.
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-worklets/plugin"],
  }
}
