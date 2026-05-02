import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  constructor(
    public code: string,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, any>,
  ) {
    super({
      code,
      message,
      details,
    }, httpStatus);
  }
}
