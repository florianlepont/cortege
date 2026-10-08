import { Controller, Get } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { appConfigOf } from "./config/app-config"

export type HealthResponse = {
  status: "ok"
  service: "cortege-api"
  timestamp: string
  /**
   * The git commit the running image was built from (GIT_SHA build arg, full sha in CI), or
   * "unknown" outside a CI-built image (local dev). Nothing else about the build is exposed.
   */
  commit: string
}

@Controller()
export class AppController {
  private readonly commit: string

  constructor(config: ConfigService) {
    this.commit = appConfigOf(config).build.commit ?? "unknown"
  }

  @Get("health")
  health(): HealthResponse {
    return {
      status: "ok",
      service: "cortege-api",
      timestamp: new Date().toISOString(),
      commit: this.commit,
    }
  }
}
