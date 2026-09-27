// Standalone base64 decode, no Node `Buffer` and no `atob` global (neither is guaranteed present
// in the Hermes JS engine React Native runs on) - needed to turn a resized photo's base64 file
// content (expo-file-system) into raw bytes for a JPEG decoder.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const CHAR_INDEX: Record<string, number> = {}
for (let i = 0; i < ALPHABET.length; i++) CHAR_INDEX[ALPHABET[i]] = i

export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "")
  const byteLength = Math.floor((clean.length * 6) / 8)
  const bytes = new Uint8Array(byteLength)

  let bitBuffer = 0
  let bitCount = 0
  let byteIndex = 0
  for (const char of clean) {
    const value = CHAR_INDEX[char]
    if (value === undefined) continue
    bitBuffer = (bitBuffer << 6) | value
    bitCount += 6
    if (bitCount >= 8) {
      bitCount -= 8
      bytes[byteIndex] = (bitBuffer >> bitCount) & 0xff
      byteIndex += 1
    }
  }
  return bytes
}
