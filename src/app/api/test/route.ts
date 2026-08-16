import {
  apiResponse,
  withApiHandler,
  validateSchema,
  createBookSchema,
} from "@/lib";

async function handler(req: Request) {
  const body = await req.json();

  const result = validateSchema(createBookSchema, body);

  if (!result.success) {
    return apiResponse.badRequest("Validation failed", result.errors);
  }

  return apiResponse.success({
    message: "API utilities are working!",
    data: result.data,
  });
}

export const POST = withApiHandler(handler);
