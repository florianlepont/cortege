"use strict"

// Phase 11, REQ-QA-sql-injection: reject interpolating values into SQL strings.
//
// The API executes raw SQL through `pg` (no ORM, no query builder), so a template literal that
// both (a) reads like a SQL statement and (b) splices in something that is not provably a fixed
// piece of SQL text is exactly the shape of a future SQL-injection bug: a value should be bound as
// a parameter ($1, $2, ...) in the query's values array, never spliced into the query text.
//
// This is deliberately conservative in what it accepts as "safe", not in what it flags: an
// expression is only treated as safe if it can be traced, purely through the AST, to nothing but
// literals, arithmetic on `.length`, or other locally-declared constants built the same way. Any
// query-builder function that legitimately assembles SQL text dynamically (this codebase has
// several, e.g. surveys.repository.ts, public-map.queries.ts, reports.service.ts) already does so
// only from such pieces — condition fragments pushed onto a `const` array and later `.join`-ed,
// a `$N` placeholder built from `values.length`, a column list picked out of a `const` lookup
// object, a SCREAMING_SNAKE_CASE constant. None of those carry request data into the SQL text
// itself; the data goes through the bound parameter array instead. See
// docs/technical/adr-004-hosting-and-infrastructure-v1.md's sibling PR and
// api/src/users/users.service.ts `deleteAccount` for the pattern this rule is meant to keep true.
//
// A SCREAMING_SNAKE_CASE identifier is always accepted, matching this codebase's own convention
// for exported SQL fragment constants (SURVEY_EVENT_INSERT_SQL, FAST_PATH_*_SQL,
// PUBLIC_SURVEY_PREDICATE, ...): it cannot be resolved across a module boundary purely from one
// file's AST, so the naming convention is the trust boundary. Treat it as a real contract: a
// SCREAMING_SNAKE_CASE binding that isn't a fixed SQL fragment is a bug in the exemption, not a
// safe pattern.

const visitorKeys = require("eslint-visitor-keys")

const SQL_KEYWORD_PATTERN =
  /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|WHERE|FROM|JOIN|VALUES|SET|WITH)\b/gi
const CONSTANT_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/

function quasisText(node) {
  return node.quasis.map((q) => q.value.raw).join(" ")
}

// A single keyword match is not enough: this codebase's own test ids read like
// "e2e-tx-update-<timestamp>" and "e2e-delete-<timestamp>", each an incidental hit on UPDATE or
// DELETE with nothing SQL about them. A real SQL statement built in this codebase's style always
// combines at least two of these keywords (SELECT ... FROM, INSERT INTO ... VALUES, UPDATE ... SET,
// DELETE FROM ... WHERE, CREATE ... ON); requiring two matches keeps that recall while dropping the
// single-keyword false hits. A query fragment with only one keyword is still checked when it is
// referenced (directly or through a `.push`/`.join` chain) from a literal that clears this bar.
function looksLikeSql(node) {
  const matches = quasisText(node).match(SQL_KEYWORD_PATTERN)
  return Boolean(matches) && matches.length >= 2
}

// Minimal generic tree walk using ESLint's own visitor-key table, so this rule needs no bundled
// traversal library: it only has to find `<name>.push(...)` call sites within one function body.
function walk(root, visit) {
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || typeof node.type !== "string") {
      continue
    }
    visit(node)
    const keys = visitorKeys.KEYS[node.type] || []
    for (const key of keys) {
      const child = node[key]
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item.type === "string") {
            stack.push(item)
          }
        }
      } else if (child && typeof child.type === "string") {
        stack.push(child)
      }
    }
  }
}

function findPushCallArguments(root, name) {
  const argumentLists = []
  walk(root, (node) => {
    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      !node.callee.computed &&
      node.callee.object.type === "Identifier" &&
      node.callee.object.name === name &&
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === "push"
    ) {
      argumentLists.push(node.arguments)
    }
  })
  return argumentLists
}

function findVariable(scope, name) {
  let current = scope
  while (current) {
    const variable = current.variables.find((candidate) => candidate.name === name)
    if (variable) {
      return variable
    }
    current = current.upper
  }
  return null
}

// A `.push()` call found by findPushCallArguments can sit inside a nested block (an `if`, a loop)
// that opens its own child scope, e.g. a `const` computed just above the pushed argument. Walking
// only `scope.upper` never finds that: it walks toward the module scope, not down into a sibling
// block. Starting from the array's own scope and descending into whichever child scope's node
// range encloses the argument gives the scope actually in effect where the argument is written.
function findInnermostScope(scope, node) {
  for (const child of scope.childScopes) {
    if (child.block.range[0] <= node.range[0] && node.range[1] <= child.block.range[1]) {
      return findInnermostScope(child, node)
    }
  }
  return scope
}

function isSafeArrayJoin(node, scope, seen) {
  if (
    node.type !== "CallExpression" ||
    node.callee.type !== "MemberExpression" ||
    node.callee.computed ||
    node.callee.property.type !== "Identifier" ||
    node.callee.property.name !== "join" ||
    node.callee.object.type !== "Identifier"
  ) {
    return false
  }

  const variable = findVariable(scope, node.callee.object.name)
  if (!variable || variable.defs.length !== 1) {
    return false
  }
  const def = variable.defs[0]
  if (def.type !== "Variable" || !def.node.init || def.node.init.type !== "ArrayExpression") {
    return false
  }

  const initiallySafe = def.node.init.elements.every(
    (element) => element === null || isSafeExpression(element, scope, seen),
  )
  if (!initiallySafe) {
    return false
  }

  const pushedArgumentLists = findPushCallArguments(variable.scope.block, variable.name)
  return pushedArgumentLists.every((args) =>
    args.every((arg) => isSafeExpression(arg, findInnermostScope(variable.scope, arg), seen)),
  )
}

function isSafeIdentifier(node, scope, seen) {
  if (CONSTANT_NAME_PATTERN.test(node.name)) {
    return true
  }

  const variable = findVariable(scope, node.name)
  if (!variable) {
    return false
  }
  if (seen.has(variable)) {
    return true
  }
  seen.add(variable)

  if (variable.defs.length !== 1) {
    return false
  }
  const def = variable.defs[0]
  if (def.type !== "Variable" || !def.node.init) {
    return false
  }
  if (!isSafeExpression(def.node.init, variable.scope, seen)) {
    return false
  }

  return variable.references.every((reference) => {
    if (reference.init || !reference.isWrite()) {
      return true
    }
    return Boolean(reference.writeExpr) && isSafeExpression(reference.writeExpr, variable.scope, seen)
  })
}

function isSafeExpression(node, scope, seen) {
  switch (node.type) {
    case "Literal":
      return (
        typeof node.value === "string" ||
        typeof node.value === "number" ||
        typeof node.value === "boolean"
      )
    case "TemplateLiteral":
      return node.expressions.every((expr) => isSafeExpression(expr, scope, seen))
    case "BinaryExpression":
      return (
        (node.operator === "+" || node.operator === "-") &&
        isSafeExpression(node.left, scope, seen) &&
        isSafeExpression(node.right, scope, seen)
      )
    case "ConditionalExpression":
      return (
        isSafeExpression(node.consequent, scope, seen) &&
        isSafeExpression(node.alternate, scope, seen)
      )
    case "MemberExpression":
      if (!node.computed && node.property.type === "Identifier" && node.property.name === "length") {
        return true
      }
      if (node.computed && node.object.type === "Identifier") {
        const variable = findVariable(scope, node.object.name)
        if (variable && variable.defs.length === 1) {
          const def = variable.defs[0]
          if (def.type === "Variable" && def.node.init && def.node.init.type === "ObjectExpression") {
            // A lookup into a fixed const object can only ever produce one of its own values,
            // whatever key is used to index it (T-11-01): safe if every value is.
            return def.node.init.properties.every(
              (prop) => prop.type === "Property" && isSafeExpression(prop.value, scope, seen),
            )
          }
        }
      }
      return false
    case "Identifier":
      return isSafeIdentifier(node, scope, seen)
    case "CallExpression":
      return isSafeArrayJoin(node, scope, seen)
    default:
      return false
  }
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow interpolating a value into a SQL string; bind it as a query parameter instead.",
    },
    schema: [],
    messages: {
      unsafeInterpolation:
        "Interpolating this into SQL text bypasses parameterized queries. Bind it as a query " +
        "parameter ($1, $2, ...) in the values array instead of splicing it into the SQL string. " +
        "If this really is a fixed piece of SQL (not a value), hoist it to a SCREAMING_SNAKE_CASE " +
        "constant so the rule can tell the two apart.",
    },
  },
  create(context) {
    return {
      TemplateLiteral(node) {
        if (node.expressions.length === 0 || !looksLikeSql(node)) {
          return
        }
        const scope = context.getScope()
        for (const expression of node.expressions) {
          if (!isSafeExpression(expression, scope, new Set())) {
            context.report({ node: expression, messageId: "unsafeInterpolation" })
          }
        }
      },
    }
  },
}
