import { Logger, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { createHmac, generateKeyPairSync, KeyObject, randomUUID } from "crypto"
import { createServer, Server } from "http"
import * as jwt from "jsonwebtoken"
import { AddressInfo } from "net"
import { AuthGuard } from "../src/auth/auth.guard"
import { buildTestConfig } from "./config-helper"

// test/ is a Jest root, so test/__mocks__/jwks-rsa.js replaces the package in
// every spec. This one needs the real client (hoisted above the imports).
jest.unmock("jwks-rsa")

// jwks-rsa 4 converts each JWK with jose 6, which ships ESM only and cannot be
// loaded by this CommonJS Jest setup. Only that conversion is replaced, with
// the Node crypto equivalent; fetching, parsing, kid lookup, the cache and the
// rate limiter are the real jwks-rsa code.
jest.mock("jose", () => {
  const nodeCrypto = jest.requireActual<typeof import("crypto")>("crypto")
  return {
    importJWK: async (jwk: import("crypto").JsonWebKeyInput["key"]) =>
      nodeCrypto.createPublicKey({ key: jwk, format: "jwk" }),
    exportSPKI: async (key: import("crypto").KeyObject) =>
      key.export({ format: "pem", type: "spki" }),
  }
})

/**
 * RS256 path of AuthGuard against a JWKS served on the loopback interface
 * (criterion 4, D-12). The real jwks-rsa client fetches, parses and looks up
 * the key: nothing here spies on getSigningKey, and no request leaves 127.0.0.1.
 */

const DOMAIN = "tenant.example"
const ISSUER = `https://${DOMAIN}/`
const AUDIENCE = "aud-1"
const SUB = "auth0|rs256-user"

const DB_USER = {
  id: "user-rs256",
  auth0_sub: SUB,
  email: "rs256@example.com",
  role: "contributor",
  first_name: "Rs",
  last_name: "Test",
  display_name: "rs256",
  profile_picture_url: null,
}

const signing = generateKeyPairSync("rsa", { modulusLength: 2048 })
const unrelated = generateKeyPairSync("rsa", { modulusLength: 2048 })
const KID = `kid-${randomUUID()}`
const UNKNOWN_KID = `kid-${randomUUID()}`
const JWK = { ...signing.publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" }

let server: Server
let hits = 0
/**
 * The base constructor calls jwksUriFor during super(), before any subclass
 * field is initialised, so the loopback URI lives at module level.
 */
let loopbackJwksUri = ""

class LoopbackAuthGuard extends AuthGuard {
  protected jwksUriFor(_domain: string): string {
    return loopbackJwksUri
  }
}

/** Production mode (RS256 path) without running the production rules on the test env. */
function productionConfigService(): ConfigService {
  const overrides = { AUTH0_DOMAIN: DOMAIN, AUTH0_PUBLIC_DOMAIN: "", AUTH0_AUDIENCE: AUDIENCE }
  return new ConfigService({
    app: { ...buildTestConfig(overrides), nodeEnv: "production", isProduction: true },
  })
}

function buildGuard() {
  const db = { query: jest.fn().mockResolvedValue({ rows: [DB_USER] }) }
  const guard = new LoopbackAuthGuard(db as never, productionConfigService())
  return { guard, db }
}

function makeContext(token: string) {
  const request: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: { authorization: `Bearer ${token}` },
  }
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    request,
  } as never as { request: typeof request }
}

function sign(over: jwt.SignOptions = {}, key: KeyObject = signing.privateKey, keyid = KID) {
  return jwt.sign({ sub: SUB }, key, {
    algorithm: "RS256",
    keyid,
    audience: AUDIENCE,
    issuer: ISSUER,
    expiresIn: "5m",
    ...over,
  })
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url")
}

/**
 * Algorithm confusion: an HS256 token whose HMAC secret is the RSA public key
 * PEM, i.e. what a verifier that trusted the header's alg would check against.
 * Built by hand because jsonwebtoken refuses to sign it.
 */
function hs256WithPublicKey(): string {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: KID }))
  const payload = base64url(
    JSON.stringify({ sub: SUB, aud: AUDIENCE, iss: ISSUER, iat: now, exp: now + 300 }),
  )
  const pem = signing.publicKey.export({ format: "pem", type: "spki" })
  const signature = createHmac("sha256", pem).update(`${header}.${payload}`).digest("base64url")
  return `${header}.${payload}.${signature}`
}

async function expectRejected(token: string): Promise<string> {
  const { guard, db } = buildGuard()
  const ctx = makeContext(token)
  await expect(guard.canActivate(ctx as never)).rejects.toBeInstanceOf(UnauthorizedException)
  expect(ctx.request.user).toBeUndefined()
  expect(db.query).not.toHaveBeenCalled()
  const warn = Logger.prototype.warn as jest.Mock
  expect(warn).toHaveBeenCalledTimes(1)
  const logged = String(warn.mock.calls[0][0])
  expect(logged).not.toContain(token)
  return logged
}

describe("AuthGuard RS256 against a loopback JWKS", () => {
  beforeAll(async () => {
    server = createServer((req, res) => {
      hits += 1
      if (req.url !== "/.well-known/jwks.json") {
        res.statusCode = 404
        res.end()
        return
      }
      res.setHeader("content-type", "application/json")
      res.end(JSON.stringify({ keys: [JWK] }))
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const { port } = server.address() as AddressInfo
    loopbackJwksUri = `http://127.0.0.1:${port}/.well-known/jwks.json`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    )
  })

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("accepts a valid token, fetches the JWKS and sets request.user from the DB", async () => {
    const { guard, db } = buildGuard()
    const before = hits
    const ctx = makeContext(sign())

    await expect(guard.canActivate(ctx as never)).resolves.toBe(true)

    expect(ctx.request.user).toEqual(DB_USER)
    expect(hits).toBeGreaterThan(before)
    expect(db.query).toHaveBeenCalledTimes(1)
    expect(db.query.mock.calls[0][1]).toEqual([SUB])
    expect(Logger.prototype.warn).not.toHaveBeenCalled()
  })

  it("serves a second token with the same kid from the client cache", async () => {
    const { guard } = buildGuard()
    await expect(guard.canActivate(makeContext(sign()) as never)).resolves.toBe(true)
    const afterFirst = hits

    await expect(guard.canActivate(makeContext(sign()) as never)).resolves.toBe(true)

    expect(hits).toBe(afterFirst)
  })

  it("rejects an expired token with 401", async () => {
    const now = Math.floor(Date.now() / 1000)
    const expired = jwt.sign({ sub: SUB, iat: now - 600, exp: now - 60 }, signing.privateKey, {
      algorithm: "RS256",
      keyid: KID,
      audience: AUDIENCE,
      issuer: ISSUER,
    })

    const logged = await expectRejected(expired)

    expect(logged).toContain("TokenExpiredError")
  })

  it("rejects a token for another audience with 401", async () => {
    const logged = await expectRejected(sign({ audience: "someone-else" }))

    expect(logged).toContain("JsonWebTokenError")
    expect(logged).toContain("jwt audience invalid")
  })

  it("rejects a token whose kid is not in the JWKS with 401, after fetching it", async () => {
    const before = hits

    const logged = await expectRejected(sign({}, unrelated.privateKey, UNKNOWN_KID))

    expect(logged).toContain("SigningKeyNotFoundError")
    expect(hits).toBeGreaterThan(before)
  })

  it("rejects a token from another issuer with 401", async () => {
    const logged = await expectRejected(sign({ issuer: "https://evil.example/" }))

    expect(logged).toContain("jwt issuer invalid")
  })

  it("rejects an HS256 token signed with the RSA public key (algorithm confusion) with 401", async () => {
    const logged = await expectRejected(hs256WithPublicKey())

    expect(logged).toContain("JsonWebTokenError")
    expect(logged).toContain("invalid algorithm")
  })

  it("rejects a token signed by another key under the served kid with 401", async () => {
    const logged = await expectRejected(sign({}, unrelated.privateKey, KID))

    expect(logged).toContain("invalid signature")
  })

  it("builds the https Auth0 JWKS URI for the configured domain by default", () => {
    const guard = new AuthGuard({ query: jest.fn() } as never, productionConfigService())
    const internals = guard as unknown as {
      jwksUriFor(domain: string): string
      jwksClients: { options: { jwksUri: string } }[]
    }

    expect(internals.jwksUriFor(DOMAIN)).toBe(`https://${DOMAIN}/.well-known/jwks.json`)
    expect(internals.jwksClients.map((client) => client.options.jwksUri)).toEqual([
      `https://${DOMAIN}/.well-known/jwks.json`,
    ])
  })
})
