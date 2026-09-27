import { base64ToUint8Array } from "./base64"

describe("base64ToUint8Array", () => {
  it("decodes a known ASCII string", () => {
    // "hello" in base64 is "aGVsbG8="
    const bytes = base64ToUint8Array("aGVsbG8=")
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111])
  })

  it("decodes bytes that are not valid ASCII text", () => {
    // 0xff 0x00 0x10 -> "/wAQ"
    const bytes = base64ToUint8Array("/wAQ")
    expect(Array.from(bytes)).toEqual([0xff, 0x00, 0x10])
  })

  it("decodes an empty string to an empty array", () => {
    expect(base64ToUint8Array("").length).toBe(0)
  })

  it("ignores whitespace and newlines", () => {
    const withNewlines = "aGVs\nbG8="
    expect(Array.from(base64ToUint8Array(withNewlines))).toEqual([104, 101, 108, 108, 111])
  })
})
