import { Controller, Get, Header, Param } from "@nestjs/common"
import { MapStylesService } from "./map-styles.service"

/**
 * `GET /v1/map-styles/map.json` and `satellite.json`: the basemap styles of the offline packs. No
 * authentication: the native downloader fetches them without the app's token, and they hold
 * nothing but public IGN URLs. The global per-client throttle still applies.
 */
@Controller("map-styles")
export class MapStylesController {
  constructor(private readonly styles: MapStylesService) {}

  @Get(":file")
  @Header("Cache-Control", "public, max-age=3600")
  async getStyle(@Param("file") file: string) {
    return this.styles.getStyle(file.replace(/\.json$/, ""))
  }
}
