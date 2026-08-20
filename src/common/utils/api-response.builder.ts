import { ApiResponse } from '../interfaces/api-response.interface';

export class ApiResponseBuilder {
  static success<T>(
    statusCode: number,
    message: string,
    data?: T,
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data: data ?? null,
      errors: null,
      timestamp: new Date().toISOString(),
    };
  }

  static error(
    statusCode: number,
    message: string,
    errors?: Record<string, string[]>,
  ): ApiResponse<null> {
    return {
      success: false,
      statusCode,
      message,
      data: null,
      errors: errors ?? null,
      timestamp: new Date().toISOString(),
    };
  }
}
