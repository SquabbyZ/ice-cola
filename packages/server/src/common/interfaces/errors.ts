export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public httpStatus: number = 400,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
