import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"
import { HttpAdapterHost } from "@nestjs/core"
import { HttpErrorLoggingFilter } from "../src/common/http-error-logging.filter"

function host(url: string | undefined, type = "http", method: string | null = "PATCH") {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  return {
    getType: () => type,
    getArgByIndex: () => undefined,
    getArgs: () => [],
    switchToHttp: () => ({
      getRequest: () => ({ method: method ?? undefined, url }),
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

  it("does not log 401 and 404, which are routine", () => {
    filter.catch(new UnauthorizedException(), host("/v1/me"))
    filter.catch(new NotFoundException(), host("/v1/nope"))
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it("logs placeholders when the request has no method or url", () => {
    filter.catch(new BadRequestException("bad"), host(undefined, "http", null))
    expect(warn).toHaveBeenCalledWith("? ? -> 400: bad")
  })

  it("adds no line of its own outside http contexts or for non-HttpException errors", () => {
    filter.catch(new BadRequestException("bad"), host("/x", "rpc"))
    filter.catch(new Error("boom"), host("/x"))
    expect(warn).not.toHaveBeenCalled()
    // Nest's own base filter still logs the unexpected Error itself; nothing from ours.
    expect(error).toHaveBeenCalledTimes(1)
    expect(error.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
