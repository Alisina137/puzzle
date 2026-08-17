import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  apiResponse,
  withApiHandler,
  validateSchema,
  createBookSchema,
} from "@/lib";
import { authOptions } from "@/lib/auth";
import { generationQueue } from "@/lib/queue";

async function getBooks(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in");
  }

  const books = await prisma.book.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return apiResponse.success(books);
}

async function createBook(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in");
  }

  const body = await req.json();

  const validation = validateSchema(createBookSchema, body);

  if (!validation.success) {
    return apiResponse.badRequest("Validation failed", validation.errors);
  }

  const { title, puzzleCount, theme } = validation.data;

  const book = await prisma.book.create({
    data: {
      title,
      puzzleCount,
      theme,
      userId: session.user.id,
      status: "pending",
    },
  });

  const job = await generationQueue.add("generate-book", {
    bookId: book.id,
    userId: session.user.id,
  });

  console.log(`[API] Book ${book.id} created, job ${job.id} queued`);

  return apiResponse.created(
    {
      book,
      jobId: job.id,
    },
    "Book created successfully. Generation queued.",
  );
}

export const GET = withApiHandler(getBooks);
export const POST = withApiHandler(createBook);
