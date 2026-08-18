import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiResponse,
  withApiHandler,
  validateSchema,
  createBookSchema,
} from "@/lib";
import { generationQueue } from "@/lib/queue";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/books - Get all books for the current user (optimized)
async function getBooks() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in to view your books");
  }

  // Optimized: Only select needed fields, use efficient include
  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      title: true,
      theme: true,
      puzzleCount: true,
      status: true,
      qualityScore: true,
      createdAt: true,
      updatedAt: true,
      // Only count puzzles, don't fetch all data
      _count: {
        select: { bookPuzzles: true },
      },
    },
    orderBy: { createdAt: "desc" },
    // Limit results for better performance
    take: 100,
  });

  // Transform to match expected format
  const formattedBooks = books.map((book) => ({
    ...book,
    generatedPuzzles: book._count.bookPuzzles,
  }));

  return apiResponse.success({
    books: formattedBooks,
    count: books.length,
  });
}

// POST /api/books - Create a new book (optimized)
async function createBook(req: NextRequest) {
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

  // Check user's book limit efficiently
  const bookCount = await prisma.book.count({
    where: { userId: session.user.id },
  });

  if (bookCount >= 100) {
    return apiResponse.badRequest(
      "You have reached the maximum number of books allowed",
    );
  }

  // Create the book
  const book = await prisma.book.create({
    data: {
      title,
      puzzleCount,
      theme,
      userId: session.user.id,
      status: "pending",
    },
    // Return only needed fields
    select: {
      id: true,
      title: true,
      puzzleCount: true,
      theme: true,
      status: true,
      createdAt: true,
    },
  });

  // Add job to queue (fire and forget)
  generationQueue
    .add("generate-book", {
      bookId: book.id,
      userId: session.user.id,
    })
    .catch((error) => {
      console.error("Failed to queue generation job:", error);
    });

  return apiResponse.created(
    {
      book,
      jobId: "queued",
    },
    "Book created successfully. Generation queued.",
  );
}

export const GET = withApiHandler(getBooks);
export const POST = withApiHandler(createBook);
