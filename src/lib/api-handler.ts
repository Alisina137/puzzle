import { NextRequest, NextResponse } from "next/server";
import { apiResponse } from "./api-response";
import { Prisma } from "@prisma/client";

export type ApiHandler<
  P extends Record<string, string> = Record<string, string>,
  T extends NextResponse = NextResponse,
> = (
  req: NextRequest,
  context: {
    params: Promise<P>;
  },
) => Promise<T>;

export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return apiResponse.conflict("A record with this value already exists");

      case "P2025":
        return apiResponse.notFound("Record not found");

      case "P2003":
        return apiResponse.badRequest("Related record not found");

      case "P2011":
        return apiResponse.badRequest("Required field is missing");

      default:
        return apiResponse.internalError("Database error occurred");
    }
  }

  if (error instanceof Error && error.name === "ZodError") {
    return apiResponse.badRequest("Validation failed");
  }

  if (error instanceof Error) {
    return apiResponse.internalError(error.message);
  }

  return apiResponse.internalError("An unexpected error occurred");
}

export function withApiHandler<
  P extends Record<string, string> = Record<string, string>,
  T extends NextResponse = NextResponse,
>(
  handler: ApiHandler<P, T>,
): (req: NextRequest, context: { params: Promise<P> }) => Promise<T> {
  return async (
    req: NextRequest,
    context: { params: Promise<P> },
  ): Promise<T> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error) as T;
    }
  };
}

export function withAuth<
  P extends Record<string, string> = Record<string, string>,
  T extends NextResponse = NextResponse,
>(
  handler: ApiHandler<P, T>,
): (req: NextRequest, context: { params: Promise<P> }) => Promise<T> {
  return async (
    req: NextRequest,
    context: { params: Promise<P> },
  ): Promise<T> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error) as T;
    }
  };
}
