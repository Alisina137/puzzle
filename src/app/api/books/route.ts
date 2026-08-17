import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiResponse, withApiHandler, validateSchema, createBookSchema } from '@/lib';
import { auth } from '@/lib/auth';
import { GenerationService } from '@/modules/generation/generation.service.js';

// GET /api/books - Get all books for the current user
async function getBooks() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return apiResponse.unauthorized('Please sign in to view your books');
  }

  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
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

// POST /api/books - Create a new book
async function createBook(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return apiResponse.unauthorized('Please sign in to create a book');
  }

  const body = await req.json();
  
  const validation = validateSchema(createBookSchema, body);
  if (!validation.success) {
    return apiResponse.badRequest('Validation failed', validation.errors);
  }

  const { title, puzzleCount, theme } = validation.data;

  const existingBooks = await prisma.book.count({
    where: { userId: session.user.id },
  });

  if (existingBooks >= 100) {
    return apiResponse.badRequest('You have reached the maximum number of books allowed');
  }

  // Create the book with 'generating' status to auto-start generation
  const book = await prisma.book.create({
    data: {
      title,
      puzzleCount,
      theme,
      userId: session.user.id,
      status: 'generating',
    },
  });

  // Start generation in background (fire and forget)
  // We'll use a simple async approach for MVP
  GenerationService.generateBook(book.id)
    .then((result) => {
      console.log('Generation completed for book:', book.id, result.generatedPuzzles + '/' + result.totalPuzzles);
    })
    .catch((error) => {
      console.error('Generation failed for book:', book.id, error);
    });

  return apiResponse.created(book, 'Book created successfully. Generation started.');
}

export const GET = withApiHandler(getBooks);
export const POST = withApiHandler(createBook);