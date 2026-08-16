import { NextResponse } from "next/server";
import { apiResponse } from "./api-response";
import { Prisma } from "@prisma/client";

export type ApiHandler<T = NextResponse> = (
  req: Request,
  context: { params: Record<string, string> },
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

export function withApiHandler(
  handler: ApiHandler,
): (
  req: Request,
  context: { params: Record<string, string> },
) => Promise<NextResponse> {
  return async (req: Request, context: { params: Record<string, string> }) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Helper for authenticated routes.
// Authentication is handled by getServerSession(authOptions)
// inside the actual route handlers.
export function withAuth(
  handler: ApiHandler,
): (
  req: Request,
  context: { params: Record<string, string> },
) => Promise<NextResponse> {
  return async (req: Request, context: { params: Record<string, string> }) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
