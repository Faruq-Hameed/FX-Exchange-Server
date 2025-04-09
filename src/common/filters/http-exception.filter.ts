import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response as ExpressResponse } from 'express'; // Import Express Response type

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ExpressResponse>(); // Use Express Response type
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response
      .status(status)
      .json({
        success: false,
        message: typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'An error occurred',
        error: (exceptionResponse as any).error || exception.name,
        statusCode: status,
      });
  }
}