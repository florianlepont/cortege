import { escapeHtml, formatCoordinate, formatDateFr, formatDecimal, svgNumber } from "./html"

describe("escapeHtml", () => {
  it("neutralises markup and quotes, and keeps one &amp; per ampersand", () => {
    const out = escapeHtml("<script>alert(\"x\")</script> & 'y' &")
    expect(out).not.toMatch(/[<>"']/)
    expect(out.match(/&amp;/g)).toHaveLength(2)
    expect(out).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39; &amp;")
  })

  it("leaves plain French text untouched", () => {
    expect(escapeHtml("Forêt de l'Ouest")).toBe("Forêt de l&#39;Ouest")
    expect(escapeHtml("Bois")).toBe("Bois")
  })
})

describe("formatDecimal", () => {
  it("uses a comma and drops trailing zeros", () => {
    expect(formatDecimal(2.5)).toBe("2,5")
    expect(formatDecimal(3)).toBe("3")
    expect(formatDecimal(1.25, 2)).toBe("1,25")
    expect(formatDecimal(1.2, 2)).toBe("1,2")
    expect(formatDecimal(-1.5)).toBe("-1,5")
  })

  it("rounds to the given digits", () => {
    expect(formatDecimal(0.04)).toBe("0")
    expect(formatDecimal(-0.04)).toBe("0")
    expect(formatDecimal(2.96)).toBe("3")
    expect(formatDecimal(1.005, 0)).toBe("1")
  })

  it("gives 0 for a value that is not finite", () => {
    expect(formatDecimal(Number.NaN)).toBe("0")
    expect(formatDecimal(Number.POSITIVE_INFINITY)).toBe("0")
  })
})

describe("formatCoordinate", () => {
  it("prints five decimals with a comma", () => {
    expect(formatCoordinate(48.404912)).toBe("48,40491")
    expect(formatCoordinate(-4.5)).toBe("-4,50000")
  })

  it("gives 0 for a value that is not finite", () => {
    expect(formatCoordinate(Number.NaN)).toBe("0")
  })
})

describe("formatDateFr", () => {
  it("writes a long French date", () => {
    const out = formatDateFr("2026-10-10T08:00:00Z", "Non renseigné")
    expect(out).toContain("2026")
    expect(out).toContain("octobre")
  })

  it("returns the fallback for an invalid date", () => {
    expect(formatDateFr("not a date", "Non renseigné")).toBe("Non renseigné")
  })
})

describe("svgNumber", () => {
  it("prints one decimal with a dot", () => {
    expect(svgNumber(12.345)).toBe("12.3")
    expect(svgNumber(-0.04)).toBe("0")
    expect(svgNumber(4)).toBe("4")
  })

  it("gives 0 for a value that is not finite", () => {
    expect(svgNumber(Number.NaN)).toBe("0")
    expect(svgNumber(Number.NEGATIVE_INFINITY)).toBe("0")
  })
})
