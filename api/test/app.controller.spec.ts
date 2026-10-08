import { AppController } from "../src/app.controller"
import { buildTestConfigService } from "./config-helper"

// GET /v1/health: no authentication, read by the Docker HEALTHCHECK, infra/vps/update-stack.sh and
// the CI smoke test (status code only) and by people checking which commit is deployed (`commit`).
describe("AppController health", () => {
  const sha = "a7a26b49c0ffee0123456789abcdef0123456789"

  it("reports the build commit from GIT_SHA", () => {
    const body = new AppController(buildTestConfigService({ GIT_SHA: sha })).health()
    expect(body).toEqual({
      status: "ok",
      service: "cortege-api",
      timestamp: expect.any(String),
      commit: sha,
    })
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('says "unknown" when the image was not built by CI (local dev, no GIT_SHA)', () => {
    const body = new AppController(buildTestConfigService({ GIT_SHA: undefined })).health()
    expect(body.commit).toBe("unknown")
  })

  it("never echoes a GIT_SHA that is not a git sha", () => {
    const body = new AppController(buildTestConfigService({ GIT_SHA: "<script>" })).health()
    expect(body.commit).toBe("unknown")
  })

  it("exposes nothing else: four keys only", () => {
    const body = new AppController(buildTestConfigService({ GIT_SHA: sha })).health()
    expect(Object.keys(body).sort()).toEqual(["commit", "service", "status", "timestamp"])
  })
})
