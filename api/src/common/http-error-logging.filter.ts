import { ArgumentsHost, Catch, HttpException, Logger } from "@nestjs/common"
import { BaseExceptionFilter } from "@nestjs/core"

// Nest only logs exceptions that are not HttpException, so a deliberate 500 (for example an Auth0
// refusal) or a 4xx left no trace in the API log. Logs the method, path, status and message of
// every 4xx/5xx, never the request body or headers, then answers exactly as before.
@Catch()
export class HttpErrorLoggingFilter extends BaseExceptionFilter {
  private readonly logger = new Logger("HttpError")

  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof HttpException && host.getType() === "http") {
      const request = host.switchToHttp().getRequest<{ method?: string; url?: string }>()
      const status = exception.getStatus()
      const path = (request.url ?? "").split("?")[0]
      const line = `${request.method ?? "?"} ${path} -> ${status}: ${exception.message}`
      if (status >= 500) this.logger.error(line)
      else if (status !== 401 && status !== 404) this.logger.warn(line)
    }
    super.catch(exception, host)
  }
}
