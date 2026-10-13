import "reflect-metadata"
import * as fs from "fs"
import * as path from "path"
import * as ts from "typescript"
import { RequestMethod } from "@nestjs/common"
import { CONTROLLER_WATERMARK, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants"
import { PUBLIC_SURVEY_PREDICATE } from "../src/surveys/public-map.queries"
import { MEMBER_READ_ROUTES, SURVEY_ROUTE_CLASSES } from "./helpers/survey-read-routes"

// Phase 29, D-09, D-11 and D-12: the database-free guarantee that no route and no SQL text can
// read another member's surveys without the shared predicate.
//
// (a) Every controller route of api/src is classified in test/helpers/survey-read-routes.ts (a new
//     route, or a new controller file, fails until it is classified; a stale entry fails too).
// (b) Every SQL text of api/src that reads `surveys` is judged at its site (file plus enclosing
//     named function, method or module constant). It is guarded only when one of its own template
//     spans is PUBLIC_SURVEY_PREDICATE or a submittedVisibleToCallerSql(...) call, or a module
//     const of the same file initialised with exactly one of them ("inline"), or a
//     `conditions` array declared const in the same site whose array-literal initializer holds
//     one of them ("through a conditions array"; a later push does not count). A hand-written
//     visibility clause is never a guard (D-09). The unguarded texts must match the per-site
//     owner-scoped allowlist exactly, so a new unguarded query, a predicate removed from a
//     builder, or a stale or miscounted entry fails. Mutation self-tests prove the scanner sees
//     those removals.
// (c) D-11: the three next-version SQL texts count private surveys (no visibility clause).

const API_SRC = path.resolve(__dirname, "../src")

function walkFiles(dir: string, keep: (file: string) => boolean): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...walkFiles(full, keep))
    } else if (keep(full)) {
      found.push(full)
    }
  }
  return found.sort()
}

function relativeToSrc(file: string): string {
  return path.relative(API_SRC, file).split(path.sep).join("/")
}

// ---------------------------------------------------------------------------------------------
// (a) Route enumeration
// ---------------------------------------------------------------------------------------------

function joinRoute(...parts: string[]): string {
  const segments = parts.flatMap((part) => part.split("/")).filter((segment) => segment !== "")
  return `/${segments.join("/")}`
}

function asPaths(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String)
  }
  return [value === undefined ? "/" : String(value)]
}

function enumerateRoutes(): { routes: string[]; controllerFiles: string[]; loadedFiles: string[] } {
  const controllerFiles = walkFiles(API_SRC, (file) => file.endsWith(".controller.ts"))
  const routes: string[] = []
  const loadedFiles: string[] = []
  for (const file of controllerFiles) {
    const moduleExports = jest.requireActual<Record<string, unknown>>(file)
    let hasController = false
    for (const exported of Object.values(moduleExports)) {
      if (typeof exported !== "function" || !Reflect.getMetadata(CONTROLLER_WATERMARK, exported)) {
        continue
      }
      hasController = true
      const classPaths = asPaths(Reflect.getMetadata(PATH_METADATA, exported))
      const prototype = exported.prototype as Record<string, unknown>
      for (const name of Object.getOwnPropertyNames(prototype)) {
        if (name === "constructor") {
          continue
        }
        const handler = prototype[name]
        if (typeof handler !== "function") {
          continue
        }
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined
        const methodPath = Reflect.getMetadata(PATH_METADATA, handler)
        if (method === undefined || methodPath === undefined) {
          continue
        }
        for (const classPath of classPaths) {
          for (const handlerPath of asPaths(methodPath)) {
            routes.push(`${RequestMethod[method]} ${joinRoute("v1", classPath, handlerPath)}`)
          }
        }
      }
    }
    if (hasController) {
      loadedFiles.push(relativeToSrc(file))
    }
  }
  return { routes: routes.sort(), controllerFiles: controllerFiles.map(relativeToSrc), loadedFiles }
}

describe("survey read routes (D-12)", () => {
  const { routes, controllerFiles, loadedFiles } = enumerateRoutes()

  it("loads every controller file of api/src", () => {
    expect(controllerFiles.length).toBeGreaterThanOrEqual(11)
    expect(loadedFiles).toEqual(controllerFiles)
  })

  it("classifies every controller route, and every classified route exists", () => {
    expect(new Set(routes).size).toBe(routes.length)
    expect(routes).toEqual(Object.keys(SURVEY_ROUTE_CLASSES).sort())
  })

  it("lists the member read routes: shared, caller-aware and report creation", () => {
    const expected = Object.entries(SURVEY_ROUTE_CLASSES)
      .filter(([, routeClass]) => ["shared", "caller-aware", "report-create"].includes(routeClass))
      .map(([route]) => route)
      .sort()
    expect(MEMBER_READ_ROUTES).toEqual(expected)
    expect(MEMBER_READ_ROUTES).toContain("GET /v1/parcels/:parcelId/surveys/history")
    expect(MEMBER_READ_ROUTES).toContain("POST /v1/reports")
    expect(MEMBER_READ_ROUTES).toContain("GET /v1/public/community-surveys/:id")
  })
})

// ---------------------------------------------------------------------------------------------
// (b) SQL scan
// ---------------------------------------------------------------------------------------------

const SURVEYS_READ = /\b(FROM|JOIN)\s+surveys\b/i
const PREDICATE_NAME = "PUBLIC_SURVEY_PREDICATE"
const CALLER_AWARE_NAME = "submittedVisibleToCallerSql"

type ScanResult = {
  /** Unguarded texts per site. */
  unguarded: Record<string, number>
  /** Sites with a text guarded through a const `conditions` array initializer, sorted. */
  viaConditionsArray: string[]
  /** Sites with a text guarded by its own span, sorted. */
  inline: string[]
}

type Site = { key: string; scope: ts.Node }

function isGuardExpression(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression) && expression.text === PREDICATE_NAME) {
    return true
  }
  return (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === CALLER_AWARE_NAME
  )
}

/**
 * A span expression that is the guard itself, or an identifier naming a module-level const of the
 * same file initialised with the guard (for example parcels.service.ts's
 * `PARCEL_HISTORY_VISIBLE_SQL = submittedVisibleToCallerSql("$3")`, a SCREAMING_SNAKE_CASE alias
 * the sql-no-unsafe-interpolation lint rule asks for).
 */
function isInlineGuard(expression: ts.Expression, sourceFile: ts.SourceFile): boolean {
  if (isGuardExpression(expression)) {
    return true
  }
  if (!ts.isIdentifier(expression)) {
    return false
  }
  for (const statement of sourceFile.statements) {
    if (
      !ts.isVariableStatement(statement) ||
      (statement.declarationList.flags & ts.NodeFlags.Const) === 0
    ) {
      continue
    }
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === expression.text &&
        declaration.initializer !== undefined &&
        isGuardExpression(declaration.initializer)
      ) {
        return true
      }
    }
  }
  return false
}

/** The nearest named scope: Class.method, a function, or a module-level constant. */
function findSite(node: ts.Node, relativePath: string): Site | null {
  let current: ts.Node | undefined = node.parent
  while (current) {
    if (
      (ts.isMethodDeclaration(current) ||
        ts.isGetAccessorDeclaration(current) ||
        ts.isPropertyDeclaration(current)) &&
      ts.isIdentifier(current.name)
    ) {
      const owner = current.parent
      const className =
        ts.isClassDeclaration(owner) && owner.name ? owner.name.text : "<anonymous class>"
      return { key: `${relativePath}#${className}.${current.name.text}`, scope: current }
    }
    if (ts.isConstructorDeclaration(current)) {
      const owner = current.parent
      const className = owner.name ? owner.name.text : "<anonymous class>"
      return { key: `${relativePath}#${className}.constructor`, scope: current }
    }
    if (ts.isFunctionDeclaration(current) && current.name) {
      return { key: `${relativePath}#${current.name.text}`, scope: current }
    }
    if (
      ts.isVariableDeclaration(current) &&
      ts.isIdentifier(current.name) &&
      ts.isVariableDeclarationList(current.parent) &&
      ts.isVariableStatement(current.parent.parent) &&
      ts.isSourceFile(current.parent.parent.parent)
    ) {
      return { key: `${relativePath}#${current.name.text}`, scope: current }
    }
    // Anonymous arrow functions and function expressions are skipped up to the next named scope.
    current = current.parent
  }
  return null
}

/** A const declared in `scope` named `name` whose array-literal initializer holds the guard. */
function constArrayHoldsGuard(scope: ts.Node, name: string): boolean {
  let found = false
  const visit = (node: ts.Node): void => {
    if (found) {
      return
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0 &&
      node.initializer !== undefined &&
      ts.isArrayLiteralExpression(node.initializer) &&
      node.initializer.elements.some(isGuardExpression)
    ) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(scope)
  return found
}

/** The identifier a span refers to as a conditions array: `name.join(...)` or a bare `name`. */
function conditionsArrayName(expression: ts.Expression): string | null {
  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "join" &&
    ts.isIdentifier(expression.expression.expression)
  ) {
    return expression.expression.expression.text
  }
  if (ts.isIdentifier(expression)) {
    return expression.text
  }
  return null
}

/** The literal text a node itself carries (template spans' expressions excluded). */
function ownSqlText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ${} ")
  }
  return null
}

function scanSurveySql(relativePath: string, sourceText: string): ScanResult {
  const sourceFile = ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.Latest, true)
  const unguarded: Record<string, number> = {}
  const viaConditionsArray = new Set<string>()
  const inline = new Set<string>()

  const visit = (node: ts.Node): void => {
    const text = ownSqlText(node)
    if (text !== null && SURVEYS_READ.test(text)) {
      const site = findSite(node, relativePath) ?? {
        key: `${relativePath}#<module>`,
        scope: sourceFile,
      }
      let guard: "inline" | "conditions" | null = null
      if (ts.isTemplateExpression(node)) {
        for (const span of node.templateSpans) {
          if (isInlineGuard(span.expression, sourceFile)) {
            guard = "inline"
            break
          }
        }
        if (guard === null) {
          for (const span of node.templateSpans) {
            const name = conditionsArrayName(span.expression)
            if (
              name !== null &&
              name !== PREDICATE_NAME &&
              constArrayHoldsGuard(site.scope, name)
            ) {
              guard = "conditions"
              break
            }
          }
        }
      }
      if (guard === "inline") {
        inline.add(site.key)
      } else if (guard === "conditions") {
        viaConditionsArray.add(site.key)
      } else {
        unguarded[site.key] = (unguarded[site.key] ?? 0) + 1
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  return {
    unguarded,
    viaConditionsArray: [...viaConditionsArray].sort(),
    inline: [...inline].sort(),
  }
}

function scanTree(): ScanResult {
  const files = walkFiles(
    API_SRC,
    (file) =>
      file.endsWith(".ts") &&
      !file.endsWith(".spec.ts") &&
      !file.endsWith(".test.ts") &&
      !file.endsWith(".d.ts"),
  )
  const unguarded: Record<string, number> = {}
  const viaConditionsArray: string[] = []
  const inline: string[] = []
  for (const file of files) {
    const result = scanSurveySql(relativeToSrc(file), fs.readFileSync(file, "utf8"))
    for (const [site, count] of Object.entries(result.unguarded)) {
      unguarded[site] = (unguarded[site] ?? 0) + count
    }
    viaConditionsArray.push(...result.viaConditionsArray)
    inline.push(...result.inline)
  }
  return { unguarded, viaConditionsArray: viaConditionsArray.sort(), inline: inline.sort() }
}

/**
 * The SQL texts that read `surveys` without the shared predicate, per site, each with its exact
 * reason. Measured on the tree after plans 29-01, 29-04 and 29-06. Every one is scoped to the
 * caller's own surveys, is a write, or is D-11 numbering: none can show another member's survey.
 */
const OWNER_SCOPED_SURVEY_SQL: Record<string, { count: number; reason: string }> = {
  "debug/debug.service.ts#DebugService.resetIbpData": {
    count: 1,
    reason: "debug reset, DELETE FROM surveys, dev-only gate",
  },
  "debug/debug.service.ts#DebugService.resetUserData": {
    count: 1,
    reason: "debug reset, DELETE FROM surveys, dev-only gate",
  },
  "surveys/parcels.service.ts#ParcelsService.getDefaultVersionNumber": {
    count: 1,
    reason: "next version, D-11: counts every submitted survey, private included, returns a number",
  },
  "surveys/parcels.service.ts#ParcelsService.validateParcelSubmit": {
    count: 1,
    reason: "next version at submit, D-11: counts every submitted survey, returns numbers only",
  },
  "surveys/surveys.repository.ts#FAST_PATH_VERSION_NUMBER_SQL": {
    count: 1,
    reason: "next version on the upsert fast path, D-11: same rule as getDefaultVersionNumber",
  },
  "surveys/surveys.repository.ts#SurveysRepository.findOwned": {
    count: 1,
    reason: "ownership lookup, id = $1 AND user_id = $2",
  },
  "surveys/surveys.repository.ts#SurveysRepository.readForUpsert": {
    count: 1,
    reason: "upsert read of the caller's row, s.id = $1 AND s.user_id = $2",
  },
  "surveys/surveys.repository.ts#buildListForUserQuery": {
    count: 1,
    reason: "owner list, conditions start with user_id = $1",
  },
  "surveys/surveys-sync.service.ts#SurveysSyncService.getSyncChanges": {
    count: 1,
    reason: "owner sync pull, events of surveys with s.user_id = $1",
  },
  "surveys/surveys-sync.service.ts#SurveysSyncService.resolveSyncChangesStart": {
    count: 1,
    reason: "owner sync pull, legacy cursor translation, s.user_id = $1",
  },
  "surveys/surveys-sync.service.ts#SurveysSyncService.loadSyncChangeSurveys": {
    count: 1,
    reason: "owner sync pull, surveys with s.user_id = $1",
  },
  "surveys/surveys-sync.service.ts#SurveysSyncService.loadSyncChangeAttachmentsByIds": {
    count: 1,
    reason: "owner sync pull, attachments of surveys with s.user_id = $1",
  },
  "users/users.service.ts#UsersService.deleteAccount": {
    count: 3,
    reason: "account deletion: retained and draft subqueries and the draft DELETE, user_id = $1",
  },
}

/** The builders whose `conditions` initializer starts with PUBLIC_SURVEY_PREDICATE. */
const GUARDED_BY_CONDITIONS_ARRAY: string[] = [
  "surveys/public-map.queries.ts#buildCommunitySurveysQuery",
  "surveys/public-map.queries.ts#buildPublicMapItemsQuery",
  "surveys/search.queries.ts#buildSearchCommunitySurveysQuery",
]

/**
 * The sites guarded by their own span (the predicate, a submittedVisibleToCallerSql call, or a
 * module const initialised with one of them). Pinned so a guarded read that disappears is noticed.
 */
const GUARDED_INLINE: string[] = [
  "reports/reports.service.ts#ReportsService.findSurveyForReport",
  "surveys/community-surveys.service.ts#CommunitySurveysService.assertPublicSurvey",
  "surveys/community-surveys.service.ts#CommunitySurveysService.getDetail",
  "surveys/parcel-search.queries.ts#buildParcelSurveyCountQuery",
  "surveys/parcel-search.queries.ts#buildParcelsBySectionNumberQuery",
  "surveys/parcels.service.ts#ParcelsService.getParcelSurveyHistory",
  "surveys/public-map.queries.ts#LATEST_PUBLIC_SURVEY_OF_PARCEL",
  "surveys/search.queries.ts#buildSearchMembersQuery",
]

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(API_SRC, relativePath), "utf8")
}

/** Removes the first occurrence of `needle` after `anchor`; asserts the source really changed. */
function mutate(source: string, anchor: string, needle: string): string {
  const anchorIndex = source.indexOf(anchor)
  expect(anchorIndex).toBeGreaterThanOrEqual(0)
  const needleIndex = source.indexOf(needle, anchorIndex)
  expect(needleIndex).toBeGreaterThan(anchorIndex)
  const mutated = source.slice(0, needleIndex) + source.slice(needleIndex + needle.length)
  expect(mutated).not.toBe(source)
  return mutated
}

describe("SQL reading surveys (D-09, D-12)", () => {
  const tree = scanTree()

  it("finds no unguarded survey read outside the per-site owner-scoped allowlist", () => {
    const expected = Object.fromEntries(
      Object.entries(OWNER_SCOPED_SURVEY_SQL).map(([site, entry]) => [site, entry.count]),
    )
    expect(tree.unguarded).toEqual(expected)
  })

  it("gives every allowlist entry a reason and a positive count", () => {
    for (const entry of Object.values(OWNER_SCOPED_SURVEY_SQL)) {
      expect(entry.count).toBeGreaterThan(0)
      expect(entry.reason.trim().length).toBeGreaterThan(0)
    }
  })

  it("resolves the builders guarded through their conditions array", () => {
    expect(tree.viaConditionsArray).toEqual(GUARDED_BY_CONDITIONS_ARRAY)
  })

  it("pins the sites guarded by their own span", () => {
    expect(tree.inline).toEqual(GUARDED_INLINE)
  })

  describe("mutation self-tests (in memory, no file is written)", () => {
    it("reports map items unguarded when its conditions array loses the predicate", () => {
      const file = "surveys/public-map.queries.ts"
      const site = `${file}#buildPublicMapItemsQuery`
      const mutated = mutate(
        readSource(file),
        "function buildPublicMapItemsQuery(",
        `${PREDICATE_NAME}, `,
      )
      const result = scanSurveySql(file, mutated)
      expect(result.unguarded[site]).toBe(1)
      expect(result.viaConditionsArray).not.toContain(site)
      // The sibling builder of the same file is untouched.
      expect(result.viaConditionsArray).toContain(`${file}#buildCommunitySurveysQuery`)
    })

    it("reports community search unguarded when its conditions array loses the predicate", () => {
      const file = "surveys/search.queries.ts"
      const site = `${file}#buildSearchCommunitySurveysQuery`
      const mutated = mutate(
        readSource(file),
        "function buildSearchCommunitySurveysQuery(",
        `${PREDICATE_NAME}, `,
      )
      const result = scanSurveySql(file, mutated)
      expect(result.unguarded[site]).toBe(1)
      expect(result.viaConditionsArray).not.toContain(site)
    })

    it("reports the parcel search unguarded when its inline span is removed", () => {
      const file = "surveys/parcel-search.queries.ts"
      const site = `${file}#buildParcelsBySectionNumberQuery`
      const mutated = mutate(
        readSource(file),
        "function buildParcelsBySectionNumberQuery(",
        `AND $\{${PREDICATE_NAME}}`,
      )
      const result = scanSurveySql(file, mutated)
      expect(result.unguarded[site]).toBe(1)
      expect(result.inline).not.toContain(site)
    })

    it("reports the parcel history unguarded when its caller-aware span is removed", () => {
      const file = "surveys/parcels.service.ts"
      const site = `${file}#ParcelsService.getParcelSurveyHistory`
      const mutated = mutate(
        readSource(file),
        "async getParcelSurveyHistory(",
        "AND ${PARCEL_HISTORY_VISIBLE_SQL}",
      )
      const result = scanSurveySql(file, mutated)
      expect(result.unguarded[site]).toBe(1)
      expect(result.inline).not.toContain(site)
    })

    it("only accepts a module constant alias initialised with the guard itself", () => {
      const source = [
        "const HAND_WRITTEN_SQL = \"s.visibility = 'public'\"",
        'const CALLER_SQL = submittedVisibleToCallerSql("$2")',
        "export function viaHandAlias(): string {",
        "  return `SELECT s.id FROM surveys s WHERE ${HAND_WRITTEN_SQL}`",
        "}",
        "export function viaCallerAlias(): string {",
        "  return `SELECT s.id FROM surveys s WHERE ${CALLER_SQL}`",
        "}",
      ].join("\n")
      expect(scanSurveySql("synthetic.ts", source)).toEqual({
        unguarded: { "synthetic.ts#viaHandAlias": 1 },
        viaConditionsArray: [],
        inline: ["synthetic.ts#viaCallerAlias"],
      })
    })

    it("never takes a hand-written visibility clause for the guard", () => {
      const source = [
        "export function listShared(): string {",
        "  return `SELECT s.id FROM surveys s",
        "    WHERE s.status = 'submitted' AND s.deleted_at IS NULL AND s.visibility = 'public'`",
        "}",
      ].join("\n")
      expect(scanSurveySql("synthetic.ts", source)).toEqual({
        unguarded: { "synthetic.ts#listShared": 1 },
        viaConditionsArray: [],
        inline: [],
      })
    })

    it("never takes a predicate pushed later (here inside an if) for the guard", () => {
      const source = [
        "export function buildShared(shared: boolean): string {",
        "  const conditions: string[] = [`s.submitted_at IS NOT NULL`]",
        "  if (shared) {",
        "    conditions.push(PUBLIC_SURVEY_PREDICATE)",
        "  }",
        '  return `SELECT s.id FROM surveys s WHERE ${conditions.join(" AND ")}`',
        "}",
      ].join("\n")
      expect(scanSurveySql("synthetic.ts", source)).toEqual({
        unguarded: { "synthetic.ts#buildShared": 1 },
        viaConditionsArray: [],
        inline: [],
      })
    })

    it("accepts the predicate as the first element of a const conditions initializer", () => {
      const source = [
        "export function buildShared(): string {",
        "  const conditions: string[] = [PUBLIC_SURVEY_PREDICATE, `s.submitted_at IS NOT NULL`]",
        '  return `SELECT s.id FROM surveys s WHERE ${conditions.join(" AND ")}`',
        "}",
      ].join("\n")
      expect(scanSurveySql("synthetic.ts", source)).toEqual({
        unguarded: {},
        viaConditionsArray: ["synthetic.ts#buildShared"],
        inline: [],
      })
    })
  })
})

// ---------------------------------------------------------------------------------------------
// (c) D-11 numbering pins and (d) the predicate text
// ---------------------------------------------------------------------------------------------

function literalTexts(relativePath: string): string[] {
  const sourceFile = ts.createSourceFile(
    relativePath,
    readSource(relativePath),
    ts.ScriptTarget.Latest,
    true,
  )
  const texts: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node)
    ) {
      texts.push(node.getText(sourceFile))
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return texts
}

describe("version numbering counts private surveys (D-11)", () => {
  it("keeps every next-version SQL text free of any visibility clause", () => {
    const nextVersionTexts = ["surveys/parcels.service.ts", "surveys/surveys.repository.ts"]
      .flatMap(literalTexts)
      .filter((text) => text.includes("MAX(") && text.includes("version_number"))
    expect(nextVersionTexts.length).toBeGreaterThanOrEqual(3)
    for (const text of nextVersionTexts) {
      expect(text).not.toMatch(/visibility/i)
      expect(text).not.toContain(PREDICATE_NAME)
    }
  })
})

describe("the shared predicate (D-09)", () => {
  it("only lets shared surveys through", () => {
    expect(PUBLIC_SURVEY_PREDICATE).toContain("s.visibility = 'public'")
  })
})
