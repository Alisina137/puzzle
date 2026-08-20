import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BookService, CreateBookInput } from "@/modules/book";
import { z } from "zod";

// Validation schema for book creation
const createBookSchema = z.object({
  title: z.string().min(1).max(255),
  theme: z.string().min(1).max(100),
  puzzleCount: z.number().int().min(1).max(100),
  targetAudience: z.string().min(1),
  difficultyLevel: z.string().min(1),
  generationSettings: z.any().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const books = await BookService.getUserBooks(session.user.id);
    
    return NextResponse.json({
      success: true,
      data: books,
      count: books.length,
    });
  } catch (error) {
    console.error("[API] Error fetching books:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch books",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = createBookSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data as CreateBookInput;
    const book = await BookService.createBook(session.user.id, data);
    
    return NextResponse.json({
      success: true,
      data: book,
    }, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating book:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create book",
      },
      { status: 500 }
    );
  }
}
