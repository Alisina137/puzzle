import { NextResponse } from 'next/server';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
};

export type ApiError = {
  code: string;
  message: string;
  details?: any;
};

export const apiResponse = {
  /**
   * Success response (200 OK)
   */
  success<T>(data: T, message?: string): NextResponse {
    return NextResponse.json(
      {
        success: true,
        message: message || 'Operation successful',
        data,
      },
      { status: 200 }
    );
  },

  /**
   * Created response (201)
   */
  created<T>(data: T, message?: string): NextResponse {
    return NextResponse.json(
      {
        success: true,
        message: message || 'Resource created successfully',
        data,
      },
      { status: 201 }
    );
  },

  /**
   * Bad request response (400)
   */
  badRequest(message: string, errors?: Record<string, string[]>): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message || 'Bad request',
        errors,
      },
      { status: 400 }
    );
  },

  /**
   * Unauthorized response (401)
   */
  unauthorized(message?: string): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message || 'Unauthorized',
      },
      { status: 401 }
    );
  },

  /**
   * Forbidden response (403)
   */
  forbidden(message?: string): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message || 'Forbidden',
      },
      { status: 403 }
    );
  },

  /**
   * Not found response (404)
   */
  notFound(message?: string): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message || 'Resource not found',
      },
      { status: 404 }
    );
  },

  /**
   * Conflict response (409)
   */
  conflict(message?: string): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message || 'Conflict',
      },
      { status: 409 }
    );
  },

  /**
   * Unprocessable entity response (422)
   */
  unprocessable(message: string, errors?: Record<string, string[]>): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message || 'Unprocessable entity',
        errors,
      },
      { status: 422 }
    );
  },

  /**
   * Internal server error response (500)
   */
  internalError(message?: string): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message || 'Internal server error',
      },
      { status: 500 }
    );
  },
};

// Type-safe API handler wrapper
export function withErrorHandling<T>(
  handler: (req: Request, context: any) => Promise<T>
): (req: Request, context: any) => Promise<NextResponse> {
  return async (req: Request, context: any) => {
    try {
      const result = await handler(req, context);
      return apiResponse.success(result);
    } catch (error: any) {
      console.error('API Error:', error);
      
      // Handle specific error types
      if (error.code === 'P2002') {
        return apiResponse.conflict('A record with this value already exists');
      }
      if (error.code === 'P2025') {
        return apiResponse.notFound('Record not found');
      }
      
      return apiResponse.internalError(error.message || 'An unexpected error occurred');
    }
  };
}