import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.error('=== GlobalExceptionFilter caught exception ===');
    console.error('Exception type:', typeof exception);
    console.error('Exception:', exception);
    console.error('Stack:', exception instanceof Error ? exception.stack : 'N/A');

    let errorResponse: ErrorResponse;
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        errorResponse = {
          success: false,
          error: {
            code: (exceptionResponse as any).code || this.getErrorCode(status),
            message: (exceptionResponse as any).message || exception.message,
            details: (exceptionResponse as any).details,
          },
        };
      } else {
        errorResponse = {
          success: false,
          error: {
            code: this.getErrorCode(status),
            message: exceptionResponse as string,
          },
        };
      }
    } else {
      console.error('Unhandled exception:', exception);
      errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
        },
      };
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return codeMap[status] || 'UNKNOWN_ERROR';
  }
}
