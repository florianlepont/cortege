import { BadRequestException, InternalServerErrorException, Logger } from "@nestjs/common"
import { HttpAdapterHost } from "@nestjs/core"
import { HttpErrorLoggingFilter } from "../src/common/http-error-logging.filter"

function host(url: string) {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  return {
    getType: () => "http",
    getArgByIndex: () => undefined,
    getArgs: () => [],
    switchToHttp: () => ({
      getRequest: () => ({ method: "PATCH", url }),
      getResponse: () => response,
    }),
  } as never
}

describe("HttpErrorLoggingFilter", () => {
  const adapter = { reply: jest.fn(), isHeadersSent: () => false }
  let filter: HttpErrorLoggingFilter
  let error: jest.SpyInstance
  let warn: jest.SpyInstance

  beforeEach(() => {
    filter = new HttpErrorLoggingFilter()
    ;(filter as unknown as { httpAdapterHost: HttpAdapterHost }).httpAdapterHost = {
      httpAdapter: adapter,
    } as unknown as HttpAdapterHost
    error = jest.spyOn(Logger.prototype, "error").mockImplementation()
    warn = jest.spyOn(Logger.prototype, "warn").mockImplementation()
  })

  afterEach(() => jest.restoreAllMocks())

  it("logs a 500 with its message and drops the query string", () => {
    filter.catch(new InternalServerErrorException("Insufficient scope"), host("/v1/me/email?x=1"))
    expect(error).toHaveBeenCalledWith("PATCH /v1/me/email -> 500: Insufficient scope")
  })

  it("logs a 400 as a warning", () => {
    filter.catch(new BadRequestException("file is required"), host("/v1/me/profile-picture"))
    expect(warn).toHaveBeenCalledWith("PATCH /v1/me/profile-picture -> 400: file is required")
  })
})
