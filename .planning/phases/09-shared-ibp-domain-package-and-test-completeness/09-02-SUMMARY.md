---
phase: 09-shared-ibp-domain-package-and-test-completeness
plan: 02
subsystem: api-auth-tests
tags: [auth, rs256, jwks, jwks-rsa, testing]
requires: []
provides:
  - "RS256 AuthGuard spec against a loopback JWKS (api/test/auth.guard.rs256.spec.ts)"
  - "protected AuthGuard.jwksUriFor(domain) seam"
affects:
  - "01.8 gate plan (may raise the ./src/auth/ coverage floor)"
  - "01.8-01 (owns api/jest.unit.config.js; see the jose note below)"
tech-stack:
  added: []
  patterns:
    - "Loopback http server on 127.0.0.1:0 serving a JWKS built from generateKeyPairSync + KeyObject.export({format: 'jwk'})"
    - "Test subclass overriding a protected method called from the base constructor, fed by a module-level variable"
    - "jest.unmock of a root __mocks__ node-module mock, per spec"
key-files:
  created:
    - api/test/auth.guard.rs256.spec.ts
  modified:
    - api/src/auth/auth.guard.ts
decisions:
  - "The spec unmocks jwks-rsa and replaces only jose.importJWK/exportSPKI with the Node crypto equivalent, because jose 6 is ESM-only and the CJS Jest setup cannot load it; the Jest config is left to 01.8-01"
metrics:
  duration: "~25 min"
  completed: 2026-09-26
  tasks: 1
  files: 2
---

# Phase 01.8 Plan 02: RS256 AuthGuard against a loopback JWKS Summary

`AuthGuard`'s RS256 path is now tested with the real `jwks-rsa` 4.0.1 client. The client fetches a JWKS from an HTTP server on 127.0.0.1, served from a test RSA key pair. The only production change is a `protected jwksUriFor(domain)` seam, and a test asserts that it still returns the same `https://<domain>/.well-known/jwks.json`.

## What was built

- `api/src/auth/auth.guard.ts`: the `JwksClient` URI now comes from `protected jwksUriFor(domain: string): string`, which returns the same https URI as before. It takes no configuration input, and the options (cache, 10 min max age, rate limit) are unchanged.
- `api/test/auth.guard.rs256.spec.ts`: 9 tests, all passing.
  1. Valid token: `canActivate` resolves to true, `request.user` is the DB row (looked up by `auth0_sub`), and the loopback server saw a JWKS request.
  2. A second token with the same kid is served from the client cache (no new request).
  3. Expired token: 401, and the log contains `TokenExpiredError`.
  4. Wrong audience: 401, `JsonWebTokenError: jwt audience invalid`.
  5. Unknown kid (a second key pair): 401 via `SigningKeyNotFoundError`, after a JWKS fetch.
  6. Wrong issuer: 401, `jwt issuer invalid`.
  7. HS256 token whose HMAC secret is the RSA public key PEM (algorithm confusion): 401, `invalid algorithm`.
  8. Token signed by another key under the served kid: 401, `invalid signature` (extra case).
  9. The default guard builds `https://tenant.example/.well-known/jwks.json` (checked both through `jwksUriFor` and on the built client's options).

  Every rejection test also checks that the log line does not contain the token, that `request.user` is not set, and that the DB was never queried.

## Verification

- `npm --workspace api run test:unit -- auth.guard`: 40/40 (31 existing + 9 new)
- `npm --workspace api run test:unit:coverage`: 30 suites, 647 tests (638 before), thresholds hold
- `npm run lint`, `npm run typecheck`, `npm run format:check`: green
- `grep -c jwksUriFor api/src/auth/auth.guard.ts` = 2
- The spec contains no `nock`. Its only host literals are the tenant issuer and the fake `https://evil.example/` issuer, which are claims inside tokens, never contacted.

### `./src/auth/` coverage (floor 87/78/82/89)

| | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Before | 87.94% (175/199) | 78.26% (54/69) | 82.76% (24/29) | 89.44% (161/180) |
| After | 88.00% (176/200) | 78.26% (54/69) | 83.33% (25/30) | 89.50% (162/181) |

The rise is small: `auth.guard.ts` was already at 96/82/100/99 thanks to the spied `getSigningKey` tests. The new spec's value is that it exercises the real fetch, parsing, kid lookup and cache in `jwks-rsa`, which are not in `collectCoverageFrom`. No floor change is needed; the gate plan may raise the row by rounding down the new values.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jwks-rsa is mocked in the unit config too**
- **Found during:** Task 1 (GREEN)
- **Issue:** the plan (and RESEARCH §6.1) said only the E2E config stubs `jwks-rsa`. But `api/jest.unit.config.js` has `roots: ['<rootDir>/src', '<rootDir>/test']`, so `test/__mocks__/jwks-rsa.js` automatically replaces the node module in every unit spec as well. The guard then failed with `TypeError: cb is not a function`.
- **Fix:** `jest.unmock("jwks-rsa")` in the new spec only.
- **Files modified:** api/test/auth.guard.rs256.spec.ts
- **Commit:** 07a59f0

**2. [Rule 3 - Blocking] jose 6 is ESM-only**
- **Found during:** Task 1 (GREEN)
- **Issue:** the real `jwks-rsa` 4.0.1 `require`s `jose` 6.2.2, whose only export is ESM (`dist/webapi/index.js`). The CommonJS Jest setup does not transform node_modules, so it fails to parse it. This is probably why the stub exists at all.
- **Fix:** the spec replaces `jose` with a two-function shim:
  - `importJWK` becomes `crypto.createPublicKey({ key: jwk, format: "jwk" })`;
  - `exportSPKI` becomes `key.export({ format: "pem", type: "spki" })`.

  Everything else in `jwks-rsa` runs for real: the HTTP fetch, the JWKS parsing and `use`/`kty` filtering, the kid lookup, `SigningKeyNotFoundError`, the lru-memoizer cache and the rate limiter. Editing `api/jest.unit.config.js` (for example `transformIgnorePatterns` for jose) was not an option, because 01.8-01 owns that file in this wave.
- **Files modified:** api/test/auth.guard.rs256.spec.ts
- **Commit:** 07a59f0

**3. [Rule 2 - Hardening] Extra cases:** a cache-hit test and a wrong-signature-under-served-kid test, beyond the 7 in the plan.

## TDD Gate Compliance

- RED: `d1f515e` test(01.8-02), where all 9 tests failed (the seam did not exist and jwks-rsa was mocked).
- GREEN: `07a59f0` feat(01.8-02), 9/9 passing.
- No refactor commit was needed.

## Threat Flags

None. The seam is `protected`, has no configuration input, and returns the same URI as before (T-01.8-08, covered by test 9). T-01.8-05 and T-01.8-06 are now proven by tests 3–7.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: api/test/auth.guard.rs256.spec.ts
- FOUND: api/src/auth/auth.guard.ts (jwksUriFor ×2)
- FOUND: d1f515e, 07a59f0
