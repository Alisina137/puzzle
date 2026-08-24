import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  apiResponse,
  withApiHandler,
  validateSchema,
  bookIdSchema,
} from "@/lib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function verifyBookOwnership(bookId: string, userId: string) {
  const book = await prisma.book.findUnique({
    where: {
      id: bookId,
    },
    select: {
      userId: true,
    },
  });

  if (!book) {
    return {
      error: apiResponse.notFound("Book not found"),
    };
  }

  if (book.userId !== userId) {
    return {
      error: apiResponse.forbidden(
        "You do not have permission to access this book",
      ),
    };
  }

  return {
    book,
  };
}

async function getPuzzles(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in");
  }

  const { bookId } = await context.params;

  const idValidation = validateSchema(bookIdSchema, { bookId });

  if (!idValidation.success) {
    return apiResponse.badRequest("Invalid book ID", idValidation.errors);
  }

  const ownership = await verifyBookOwnership(bookId, session.user.id);

  if (ownership.error) {
    return ownership.error;
  }

  const bookPuzzles = await prisma.bookPuzzle.findMany({
    where: {
      bookId,
    },
    include: {
      puzzle: true,
      puzzleVersion: true,
      solution: true,
    },
    orderBy: {
      position: "asc",
    },
  });

  return apiResponse.success({
    puzzles: bookPuzzles,
    count: bookPuzzles.length,
  });
}

async function createPuzzle(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return apiResponse.unauthorized("Please sign in");
  }

  const { bookId } = await context.params;

  const idValidation = validateSchema(bookIdSchema, { bookId });

  if (!idValidation.success) {
    return apiResponse.badRequest("Invalid book ID", idValidation.errors);
  }

  const ownership = await verifyBookOwnership(bookId, session.user.id);

  if (ownership.error) {
    return ownership.error;
  }

  const book = await prisma.book.findUnique({
    where: {
      id: bookId,
    },
  });

  if (!book) {
    return apiResponse.notFound("Book not found");
  }

  try {
    // Import the generation service
    const { GenerationService } = await import("@/modules/generation/generation.service");
    const { WordSelectionService } = await import("@/modules/theme/word-selection.service");
    const { GridGenerator } = await import("@/modules/puzzle/grid-generator");
    const { WordPlacer } = await import("@/modules/puzzle/word-placer");
    const { PuzzleValidator } = await import("@/modules/puzzle/puzzle-validator");
    const { SolutionGenerator } = await import("@/modules/puzzle/solution-generator");
    const { DifficultyScorer } = await import("@/modules/puzzle");

    // Get generation settings from book
    const settings = GenerationService.getGenerationSettings(book);

    // Get words for the puzzle
    const wordResult = WordSelectionService.selectWords({
      theme: book.theme,
      count: settings.wordsPerPuzzle,
      difficulty: "medium",
    });

    const words = wordResult.words;

    // Generate grid
    const gridResult = GridGenerator.generate({
      difficulty: "medium",
      size: settings.gridSize,
    });
    const grid = gridResult.grid;

    // Place words
    const placement = WordPlacer.placeWords(grid, words, {
      maxAttempts: 10,
    });

    // Calculate difficulty score
    const placedWords = placement.placedWords || [];
    const difficultyFactors = {
      gridSize: grid.length,
      wordCount: placedWords.length,
      minWordLength: Math.min(...words.map((w: string) => w.length)),
      maxWordLength: Math.max(...words.map((w: string) => w.length)),
      directions: GenerationService.getDirectionsCount(placedWords),
      allowReverse: settings.allowReverse,
      overlap: settings.overlap,
      vocabularyLevel: settings.vocabularyLevel,
    };

    const difficultyScore = DifficultyScorer.calculateScore(difficultyFactors);

    // Validate puzzle
    const validation = PuzzleValidator.validatePuzzle(
      placement.grid,
      words,
      placement.placedWords,
    );

    if (!validation.valid) {
      return apiResponse.badRequest(
        `Puzzle validation failed: ${validation.errors.join(", ")}`
      );
    }

    // Generate solution
    const solution = SolutionGenerator.generateSolution(
      placement.grid,
      placement.placedWords,
    );

   // Create the puzzle
const puzzle = await prisma.puzzle.create({
  data: {
    type: "wordsearch",
    data: {
      grid: placement.grid,
      words: words,
      placedWords: placement.placedWords.map((pw: any) => ({
        word: pw.word,
        row: pw.row,
        col: pw.col,
        direction: pw.direction,
      })),
      size: placement.grid.length,
    } as any,
    difficulty: difficultyScore.label.toLowerCase(),
    difficultyScore: difficultyScore.score,
    difficultyLabel: difficultyScore.label,
    qualityMetrics: difficultyScore.breakdown,
    qualityScore: validation.score || 100,
  },
});

    const puzzleVersion = await prisma.puzzleVersion.create({
      data: {
        puzzleId: puzzle.id,
        versionNumber: 1,
        data: puzzle.data === null ? Prisma.JsonNull : puzzle.data,
        isActive: true,
      },
    });

    const existingCount = await prisma.bookPuzzle.count({
      where: {
        bookId,
      },
    });

    const bookPuzzle = await prisma.bookPuzzle.create({
      data: {
        bookId,
        puzzleId: puzzle.id,
        puzzleVersionId: puzzleVersion.id,
        position: existingCount,
        displayNumber: existingCount + 1,
      },
    });

    // Create solution
await prisma.solution.create({
  data: {
    bookPuzzleId: bookPuzzle.id,
    data: {
      grid: solution.grid,
      words: solution.words.map((w: any) => ({
        word: w.word,
        startRow: w.startRow,
        startCol: w.startCol,
        endRow: w.endRow,
        endCol: w.endCol,
        direction: w.direction,
      })),
      highlightedGrid: solution.highlightedGrid || [],
    } as any,
    validatedAt: new Date(),
    isValid: true,
  },
});

    // Update book puzzle count
    await prisma.book.update({
      where: { id: bookId },
      data: {
        puzzleCount: {
          increment: 1,
        },
      },
    });

    return apiResponse.created(
      {
        bookPuzzle,
        puzzle,
        puzzleVersion,
      },
      "Puzzle generated successfully",
    );
  } catch (error: any) {
    console.error("[API] Error generating puzzle:", error);
    return apiResponse.internalError(
      error.message || "Failed to generate puzzle"
    );
  }
}

export const GET = withApiHandler(getPuzzles);
export const POST = withApiHandler(createPuzzle);
