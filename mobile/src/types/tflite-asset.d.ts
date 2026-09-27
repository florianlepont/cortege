// Metro asset modules (metro.config.js adds "tflite" to resolver.assetExts) resolve to a numeric
// asset id at runtime, the same shape react-native/expo already declare for "*.png" etc.
declare module "*.tflite" {
  const assetId: number
  export default assetId
}
