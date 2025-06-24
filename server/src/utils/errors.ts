import { ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super(
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Too many requests, please try again later',
      429,
      'RATE_LIMIT_EXCEEDED',
      { retryAfter }
    );
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Not authorized to access this resource') {
    super(message, 403, 'UNAUTHORIZED');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`Error from ${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
    });
  }

  // Handle custom AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Handle other uncaught errors
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
  });
}

/**
 * Async error handling wrapper for Express route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware to handle 404 routes
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}
