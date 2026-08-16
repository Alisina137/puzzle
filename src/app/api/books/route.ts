import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  apiResponse,
  withApiHandler,
  validateSchema,
  createBookSchema,
} from "@/lib";
import { authOptions } from "@/lib/auth";

// GET /api/books
async function getBooks() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in to view your books");
  }

  const books = await prisma.book.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      bookPuzzles: {
        select: {
          id: true,
          position: true,
          displayNumber: true,
          puzzle: {
            select: {
              id: true,
              type: true,
              difficulty: true,
              qualityScore: true,
            },
          },
        },
      },
    },
  });

  return apiResponse.success({
    books,
    count: books.length,
  });
}

// POST /api/books
async function createBook(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in to create a book");
  }

  const body = await req.json();

  const validation = validateSchema(createBookSchema, body);

  if (!validation.success) {
    return apiResponse.badRequest("Validation failed", validation.errors);
  }

  const { title, puzzleCount, theme } = validation.data;

  const existingBooks = await prisma.book.count({
    where: {
      userId: session.user.id,
    },
  });

  if (existingBooks >= 100) {
    return apiResponse.badRequest(
      "You have reached the maximum number of books allowed",
    );
  }

  const book = await prisma.book.create({
    data: {
      title,
      puzzleCount,
      theme,
      userId: session.user.id,
    },
  });

  return apiResponse.created(book, "Book created successfully");
}

export const GET = withApiHandler(getBooks);
export const POST = withApiHandler(createBook);
