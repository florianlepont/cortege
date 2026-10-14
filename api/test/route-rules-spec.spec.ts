import { readFileSync } from "node:fs"
import * as path from "node:path"
import { ROUTE_RULE_CASES } from "@cortege/ibp-domain"

// The route-choice spec is the text the owner validated on 2026-10-14 and ROUTE_RULE_CASES is its
// executable form (phase 30, plan 30-05, threat T-30-11). This test reads the spec's rule rows and
// its "Cas limites" table and fails when a rule or boundary id has no case or a case has no id in
// the spec, so the two cannot drift apart unnoticed. A rule change edits both in one commit.

const SPEC_PATH = path.resolve(__dirname, "../../docs/specs/route-choice-rules-v1.md")
const spec = readFileSync(SPEC_PATH, "utf8")

/** The text between a heading and the next heading of the same or higher level. */
function section(startHeading: string, endHeading: string): string {
  const start = spec.indexOf(startHeading)
  const end = spec.indexOf(endHeading, start + startHeading.length)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return spec.slice(start, end)
}

function firstCells(text: string, pattern: RegExp): string[] {
  return text
    .split("\n")
    .map((line) => pattern.exec(line)?.[1])
    .filter((id): id is string => id !== undefined)
}

const ruleSection = section("## 5. Règles de choix du parcours", "### Cas limites")
const boundarySection = section("### Cas limites", "### Surface décrite conseillée")

// Rule rows start with `| R-nn ` (a letter suffix is allowed); boundary rows have `R-nn#label`.
const specRuleIds = firstCells(ruleSection, /^\| (R-[0-9]{2}[a-z]?) \|/)
const specBoundaryIds = firstCells(boundarySection, /^\| (R-[0-9]{2}[a-z]?#[a-z0-9-]+) \|/)

const caseIds = ROUTE_RULE_CASES.map((c) => c.id)
const caseRuleIds = caseIds.filter((id) => !id.includes("#"))
const caseBoundaryIds = caseIds.filter((id) => id.includes("#"))

describe("route-choice spec and ROUTE_RULE_CASES", () => {
  it("finds the 20 rule ids and the 23 boundary ids of the spec", () => {
    expect(specRuleIds).toHaveLength(20)
    expect(specBoundaryIds).toHaveLength(23)
    expect(new Set(specRuleIds).size).toBe(20)
    expect(new Set(specBoundaryIds).size).toBe(23)
  })

  it("has no rule retired by the owner (R-04, R-05, R-06)", () => {
    for (const retired of ["R-04", "R-05", "R-06"]) {
      expect(specRuleIds).not.toContain(retired)
      expect(caseRuleIds).not.toContain(retired)
    }
  })

  it("holds exactly one case per rule id of the spec", () => {
    expect(new Set(caseRuleIds).size).toBe(caseRuleIds.length)
    expect([...caseRuleIds].sort()).toEqual([...specRuleIds].sort())
  })

  it("holds exactly one case per boundary id of the spec", () => {
    expect(new Set(caseBoundaryIds).size).toBe(caseBoundaryIds.length)
    expect([...caseBoundaryIds].sort()).toEqual([...specBoundaryIds].sort())
  })

  it("has no case that is not in the spec", () => {
    const known = new Set([...specRuleIds, ...specBoundaryIds])
    expect(caseIds.filter((id) => !known.has(id))).toEqual([])
  })

  it("cites a page in every case, and ties a boundary case to its rule", () => {
    for (const c of ROUTE_RULE_CASES) {
      expect(c.source).toContain("p. ")
      expect(c.examples.length).toBeGreaterThan(0)
      expect(specRuleIds).toContain(c.rule)
      expect(c.id.split("#")[0]).toBe(c.rule)
    }
  })
})
