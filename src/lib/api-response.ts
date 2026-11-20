import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
}

/**
 * Returns a standardized JSON success response.
 */
export function apiSuccess<T>(
  data: T,
  meta?: ApiSuccessResponse<T>['meta'],
  status = 200,
  headers?: HeadersInit
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status, headers }
  );
}

/**
 * Returns a standardized JSON error response.
 */
export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
  headers?: HeadersInit
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status, headers }
  );
}

/**
 * Centralized API error handler.
 * Safely transforms errors into standardized responses without leaking internal stack traces or raw SQL.
 */
export function handleApiError(error: unknown, routeName: string): NextResponse<ApiErrorResponse> {
  logger.error(`Error in ${routeName}`, error);

  if (error instanceof ZodError) {
    const issues = error.issues || (error as any).errors || [];
    const formattedErrors = issues.map((e: any) => ({
      path: e.path ? e.path.join('.') : '',
      message: e.message,
    }));

    return apiError(
      'VALIDATION_ERROR',
      'The requested payload failed validation.',
      422,
      formattedErrors
    );
  }

  if (error instanceof Error) {
    if (error.message.includes('Unauthorized') || error.message.includes('Authentication')) {
      return apiError('UNAUTHORIZED', 'Authentication is required to access this resource.', 401);
    }

    if (error.message.includes('Forbidden') || error.message.includes('Permission')) {
      return apiError('FORBIDDEN', 'You do not have permission to access this resource.', 403);
    }

    if (error.message.includes('Not Found') || error.message.includes('notFound')) {
      return apiError('NOT_FOUND', error.message, 404);
    }

    if (error.message.includes('Rate limit')) {
      return apiError('RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.', 429);
    }
  }

  // Default internal server error with zero sensitive information leakage
  return apiError(
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred. Please try again later.',
    500
  );
}
