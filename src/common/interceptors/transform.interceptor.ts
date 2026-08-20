import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponseBuilder } from '../utils/api-response.builder';
import { ApiResponse } from '../interfaces/api-response.interface';
import { CommonSuccess } from '../constants/response.constants';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    return next.handle().pipe(
      map((data: unknown): ApiResponse<T> => {
        const statusCode = response.statusCode;

        if (this.isApiResponse(data)) {
          return data as ApiResponse<T>;
        }

        let message: string | undefined;
        let finalData: unknown = data ?? null;

        if (this.isObject(data) && typeof data.message === 'string') {
          message = data.message;

          const { message: _, ...rest } = data;
          finalData = Object.keys(rest).length ? rest : null;
        }

        if (!message) {
          message = this.getDefaultMessage(request.method, statusCode);
        }

        return ApiResponseBuilder.success(
          statusCode,
          message,
          finalData,
        ) as ApiResponse<T>;
      }),
    );
  }

  private getDefaultMessage(method: string, statusCode: number): string {
    switch (method) {
      case 'POST':
        return statusCode === 201
          ? CommonSuccess.RESOURCE_CREATED
          : CommonSuccess.OPERATION_SUCCESS;

      case 'PATCH':
      case 'PUT':
        return CommonSuccess.RESOURCE_UPDATED;

      case 'DELETE':
        return CommonSuccess.RESOURCE_DELETED;

      default:
        return CommonSuccess.OPERATION_SUCCESS;
    }
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isApiResponse(data: unknown): data is ApiResponse<unknown> {
    return Boolean(
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'statusCode' in data &&
      'message' in data &&
      'timestamp' in data,
    );
  }
}
