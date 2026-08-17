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

export async function POST(
  req: NextRequest,
  context: { params: { bookId: string; puzzleId: string } },
) {
  try {
    console.log("?? Regeneration started");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId, puzzleId } = context.params;
    console.log("?? Book ID:", bookId);
    console.log("?? Puzzle ID:", puzzleId);

    // Get book details
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { userId: true, theme: true },
    });

    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("?? Book found, theme:", book.theme);

    // Find the book puzzle
    const bookPuzzle = await prisma.bookPuzzle.findFirst({
      where: {
        id: puzzleId,
        bookId: bookId,
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
        { error: "Puzzle not found in this book" },
        { status: 404 },
      );
    }

    console.log("?? Puzzle found");

    // Get existing puzzles for duplicate check
    const existingPuzzles = await prisma.bookPuzzle.findMany({
      where: { bookId: bookId },
      include: {
        puzzle: {
          include: {
            versions: true,
          },
        },
      },
    });

    const existingFingerprints = existingPuzzles.map((bp) => {
      const activeVersion = bp.puzzle.versions.find((v) => v.isActive);
      return DuplicateDetector.createFingerprint(
        activeVersion?.data?.grid || [],
        activeVersion?.data?.words || [],
        activeVersion?.data?.placedWords || [],
      );
    });

    let attempts = 0;
    const maxAttempts = 10;
    let newPuzzleData: any = null;
    let newSolution: any = null;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        console.log("?? Attempt", attempts);

        const wordResult = WordSelectionService.selectWords({
          theme: book.theme,
          count: 12,
          difficulty: "medium",
        });

        const words = wordResult.words;
        const gridResult = GridGenerator.generate({ difficulty: "medium" });
        const grid = gridResult.grid;
        const placement = WordPlacer.placeWords(grid, words, {
          maxAttempts: 10,
        });

        const validation = PuzzleValidator.validatePuzzle(
          placement.grid,
          words,
          placement.placedWords,
        );

        if (!validation.valid) {
          console.log("?? Validation failed");
          continue;
        }

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
          console.log("?? Duplicate detected");
          continue;
        }

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
          console.log("?? Solution invalid");
          continue;
        }

        newPuzzleData = {
          grid: placement.grid,
          words: words,
          placedWords: placement.placedWords,
          size: placement.grid.length,
        };

        newSolution = solution;
        console.log("? New puzzle generated on attempt", attempts);
        break;
      } catch (error) {
        console.error("? Attempt", attempts, "failed:", error);
        continue;
      }
    }

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

    // Update the puzzle
    const updatedPuzzle = await prisma.puzzle.update({
      where: { id: bookPuzzle.puzzleId },
      data: {
        data: newPuzzleData,
        difficulty: "medium",
        qualityScore: 85,
      },
    });

    console.log("? Puzzle updated");

    // Create new version
    const currentVersion = await prisma.puzzleVersion.findFirst({
      where: { puzzleId: bookPuzzle.puzzleId },
      orderBy: { versionNumber: "desc" },
    });

    const newVersionNumber = (currentVersion?.versionNumber || 0) + 1;

    const newPuzzleVersion = await prisma.puzzleVersion.create({
      data: {
        puzzleId: updatedPuzzle.id,
        versionNumber: newVersionNumber,
        data: newPuzzleData,
        isActive: true,
      },
    });

    console.log("? Version created:", newVersionNumber);

    // Deactivate old versions
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

    // Update book puzzle
    const updatedBookPuzzle = await prisma.bookPuzzle.update({
      where: { id: bookPuzzle.id },
      data: {
        puzzleVersionId: newPuzzleVersion.id,
      },
      include: {
        puzzle: true,
        puzzleVersion: true,
        solution: true,
      },
    });

    // Update solution
    await prisma.solution.update({
      where: { bookPuzzleId: bookPuzzle.id },
      data: {
        data: {
          grid: newSolution.grid,
          words: newSolution.words,
        },
        validatedAt: new Date(),
        isValid: true,
      },
    });

    console.log("? Regeneration complete");

    return Response.json({
      success: true,
      data: {
        bookPuzzle: updatedBookPuzzle,
        message: "Puzzle regenerated successfully",
        version: newVersionNumber,
        attempts: attempts,
      },
    });
  } catch (error: any) {
    console.error("? Regeneration error:", error);
    return Response.json(
      { error: error.message || "Failed to regenerate puzzle" },
      { status: 500 },
    );
  }
}
