import { NextRequest } from "next/server";
import { KDPPreflight } from "@/modules/pdf/preflight.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = await context.params;

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { userId: true },
    });

    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await KDPPreflight.runPreflight(bookId);

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Preflight error:", error);

    return Response.json(
      {
        error: error.message || "Failed to run preflight checks",
      },
      { status: 500 },
    );
  }
}
