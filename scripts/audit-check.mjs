// Dependency audit gate: fails on any high or critical advisory that is not in
// scripts/audit-allowlist.json, and on any allowlist entry that no longer matches an advisory
// (so an accepted advisory is dropped as soon as upstream ships a fix).
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const GATED = new Set(["high", "critical"])
const allowlist = JSON.parse(
  readFileSync(new URL("./audit-allowlist.json", import.meta.url), "utf8"),
).advisories

let raw
try {
  raw = execFileSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
} catch (error) {
  // `npm audit` exits non-zero when it finds anything; the report is still on stdout.
  raw = error.stdout
}
const report = JSON.parse(raw)
if (report.error) {
  console.error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`)
  process.exit(2)
}

const found = new Map()
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via) {
    if (typeof via !== "object") continue
    const id = via.url?.split("/").pop() ?? String(via.source)
    found.set(id, { id, severity: via.severity, name: via.name, title: via.title })
  }
}

const allowed = new Set(allowlist.map((entry) => entry.id))
const blocking = [...found.values()].filter((a) => GATED.has(a.severity) && !allowed.has(a.id))
const stale = allowlist.filter((entry) => !found.has(entry.id))

for (const a of blocking) console.error(`BLOCKING  ${a.severity}  ${a.name}  ${a.id}  ${a.title}`)
for (const entry of stale) {
  console.error(`STALE allowlist entry ${entry.id} (${entry.package}): no longer reported, remove it`)
}
const accepted = [...found.values()].filter((a) => GATED.has(a.severity) && allowed.has(a.id))
for (const a of accepted) console.log(`accepted  ${a.severity}  ${a.name}  ${a.id}`)

if (blocking.length > 0 || stale.length > 0) process.exit(1)
console.log("audit: no unaccepted high or critical advisory")
