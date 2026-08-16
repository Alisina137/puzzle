import { Prisma } from '@prisma/client';

export class DatabaseError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export function handlePrismaError(error: any): DatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new DatabaseError(
          'DUPLICATE',
          'A record with this value already exists.',
          error.meta
        );
      case 'P2025':
        return new DatabaseError(
          'NOT_FOUND',
          'The requested record was not found.',
          error.meta
        );
      default:
        return new DatabaseError(
          'DATABASE_ERROR',
          Database error: ,
          error.meta
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new DatabaseError(
      'VALIDATION_ERROR',
      'Invalid data provided.',
      error.message
    );
  }

  return new DatabaseError(
    'UNKNOWN_ERROR',
    error.message || 'An unknown error occurred',
    error
  );
}

export function isDatabaseError(error: any): error is DatabaseError {
  return error instanceof DatabaseError;
}