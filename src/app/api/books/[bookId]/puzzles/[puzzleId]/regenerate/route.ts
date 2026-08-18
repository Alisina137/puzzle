import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { WordSelectionService } from "@/modules/theme/word-selection.service";
import { GridGenerator } from "@/modules/puzzle/grid-generator";
import { WordPlacer } from "@/modules/puzzle/word-placer";
import { PuzzleValidator } from "@/modules/puzzle/puzzle-validator";
import { DuplicateDetector } from "@/modules/puzzle/duplicate-detector";
import { SolutionGenerator } from "@/modules/puzzle/solution-generator";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface GeneratedPuzzleData {
  grid: string[][];
  words: string[];
  placedWords: any[];
  size: number;
}

interface StoredPuzzleData {
  grid: string[][];
  words: string[];
  placedWords: any[];
  size?: number;
}

function getPuzzleData(data: unknown): StoredPuzzleData | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const value = data as Record<string, unknown>;

  const grid = Array.isArray(value.grid)
    ? value.grid
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) =>
          row.filter((cell): cell is string => typeof cell === "string"),
        )
    : [];

  const words = Array.isArray(value.words)
    ? value.words.filter((word): word is string => typeof word === "string")
    : [];

  const placedWords = Array.isArray(value.placedWords) ? value.placedWords : [];

  return {
    grid,
    words,
    placedWords,
    size: typeof value.size === "number" ? value.size : undefined,
  };
}

export async function POST(
  _req: NextRequest,
  context: {
    params: {
      bookId: string;
      puzzleId: string;
    };
  },
) {
  try {
    console.log("Regeneration started");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId, puzzleId } = context.params;

    console.log("Book ID:", bookId);
    console.log("Puzzle ID:", puzzleId);

    // --------------------------------------------------
    // 1. Get book and verify ownership
    // --------------------------------------------------

    const book = await prisma.book.findUnique({
      where: {
        id: bookId,
      },
      select: {
        userId: true,
        theme: true,
      },
    });

    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("Book found, theme:", book.theme);

    // --------------------------------------------------
    // 2. Find puzzle
    // --------------------------------------------------

    const bookPuzzle = await prisma.bookPuzzle.findFirst({
      where: {
        id: puzzleId,
        bookId,
      },
      include: {
        puzzle: {
          include: {
            versions: true,
          },
        },
      },
    });

    if (!bookPuzzle) {
      return Response.json(
        {
          error: "Puzzle not found in this book",
        },
        { status: 404 },
      );
    }

    console.log("Puzzle found");

    // --------------------------------------------------
    // 3. Get existing puzzles
    // --------------------------------------------------

    const existingPuzzles = await prisma.bookPuzzle.findMany({
      where: {
        bookId,
      },
      include: {
        puzzle: {
          include: {
            versions: true,
          },
        },
      },
    });

    // --------------------------------------------------
    // 4. Create fingerprints
    // --------------------------------------------------

    const existingFingerprints = existingPuzzles
      .map((bp) => {
        const activeVersion = bp.puzzle.versions.find(
          (version) => version.isActive,
        );

        const puzzleData = getPuzzleData(activeVersion?.data);

        if (!puzzleData) {
          return null;
        }

        return DuplicateDetector.createFingerprint(
          puzzleData.grid,
          puzzleData.words,
          puzzleData.placedWords,
        );
      })
      .filter(
        (
          fingerprint,
        ): fingerprint is ReturnType<
          typeof DuplicateDetector.createFingerprint
        > => fingerprint !== null,
      );

    // --------------------------------------------------
    // 5. Generate replacement puzzle
    // --------------------------------------------------

    let attempts = 0;
    const maxAttempts = 10;

    let newPuzzleData: GeneratedPuzzleData | null = null;

    let newSolution: any = null;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        console.log("Attempt", attempts);

        const wordResult = WordSelectionService.selectWords({
          theme: book.theme,
          count: 12,
          difficulty: "medium",
        });

        const words = wordResult.words;

        const gridResult = GridGenerator.generate({
          difficulty: "medium",
        });

        const grid = gridResult.grid;

        const placement = WordPlacer.placeWords(grid, words, {
          maxAttempts: 10,
        });

        // --------------------------------------------------
        // Validate
        // --------------------------------------------------

        const validation = PuzzleValidator.validatePuzzle(
          placement.grid,
          words,
          placement.placedWords,
        );

        if (!validation.valid) {
          console.log("Validation failed");
          continue;
        }

        // --------------------------------------------------
        // Duplicate detection
        // --------------------------------------------------

        const fingerprint = DuplicateDetector.createFingerprint(
          placement.grid,
          words,
          placement.placedWords,
        );

        const duplicateCheck = DuplicateDetector.isDuplicate(
          fingerprint,
          existingFingerprints,
        );

        if (duplicateCheck && duplicateCheck.isDuplicate) {
          console.log("Duplicate detected");
          continue;
        }

        // --------------------------------------------------
        // Generate solution
        // --------------------------------------------------

        const solution = SolutionGenerator.generateSolution(
          placement.grid,
          placement.placedWords,
        );

        const verification = SolutionGenerator.verifySolution(
          solution,
          placement.grid,
          words,
        );

        if (!verification.valid) {
          console.log("Solution invalid");
          continue;
        }

        // --------------------------------------------------
        // Successful generation
        // --------------------------------------------------

        newPuzzleData = {
          grid: placement.grid,
          words,
          placedWords: placement.placedWords,
          size: placement.grid.length,
        };

        newSolution = solution;

        console.log("New puzzle generated on attempt", attempts);

        break;
      } catch (error) {
        console.error("Attempt", attempts, "failed:", error);

        continue;
      }
    }

    // --------------------------------------------------
    // 6. Verify generation
    // --------------------------------------------------

    if (!newPuzzleData) {
      return Response.json(
        {
          error:
            "Failed to generate a valid replacement puzzle after " +
            maxAttempts +
            " attempts",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 7. Prepare JSON-safe data for Prisma
    // --------------------------------------------------

    const puzzleDataForPrisma = {
      grid: newPuzzleData.grid,
      words: newPuzzleData.words,
      placedWords: newPuzzleData.placedWords,
      size: newPuzzleData.size,
    };

    // --------------------------------------------------
    // 8. Update puzzle
    // --------------------------------------------------

    const updatedPuzzle = await prisma.puzzle.update({
      where: {
        id: bookPuzzle.puzzleId,
      },
      data: {
        data: puzzleDataForPrisma,
        difficulty: "medium",
        qualityScore: 85,
      },
    });

    console.log("Puzzle updated");

    // --------------------------------------------------
    // 9. Get current version
    // --------------------------------------------------

    const currentVersion = await prisma.puzzleVersion.findFirst({
      where: {
        puzzleId: bookPuzzle.puzzleId,
      },
      orderBy: {
        versionNumber: "desc",
      },
    });

    const newVersionNumber = (currentVersion?.versionNumber || 0) + 1;

    // --------------------------------------------------
    // 10. Create new version
    // --------------------------------------------------

    const newPuzzleVersion = await prisma.puzzleVersion.create({
      data: {
        puzzleId: updatedPuzzle.id,
        versionNumber: newVersionNumber,
        data: puzzleDataForPrisma,
        isActive: true,
      },
    });

    console.log("Version created:", newVersionNumber);

    // --------------------------------------------------
    // 11. Deactivate old versions
    // --------------------------------------------------

    await prisma.puzzleVersion.updateMany({
      where: {
        puzzleId: updatedPuzzle.id,
        isActive: true,
        id: {
          not: newPuzzleVersion.id,
        },
      },
      data: {
        isActive: false,
      },
    });

    // --------------------------------------------------
    // 12. Update book puzzle
    // --------------------------------------------------

    const updatedBookPuzzle = await prisma.bookPuzzle.update({
      where: {
        id: bookPuzzle.id,
      },
      data: {
        puzzleVersionId: newPuzzleVersion.id,
      },
      include: {
        puzzle: true,
        puzzleVersion: true,
        solution: true,
      },
    });

    // --------------------------------------------------
    // 13. Update solution
    // --------------------------------------------------

    if (newSolution) {
      await prisma.solution.update({
        where: {
          bookPuzzleId: bookPuzzle.id,
        },
        data: {
          data: {
            grid: newSolution.grid,
            words: newSolution.words,
          },
          validatedAt: new Date(),
          isValid: true,
        },
      });
    }

    console.log("Regeneration complete");

    // --------------------------------------------------
    // 14. Return response
    // --------------------------------------------------

    return Response.json({
      success: true,
      data: {
        bookPuzzle: updatedBookPuzzle,
        message: "Puzzle regenerated successfully",
        version: newVersionNumber,
        attempts,
      },
    });
  } catch (error: unknown) {
    console.error("Regeneration error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to regenerate puzzle",
      },
      { status: 500 },
    );
  }
}
