import { NextRequest } from "next/server";
import { PDFGenerator } from "@/modules/pdf/pdf-generator";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: { bookId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookId } = context.params;
    const body = await req.json();

    // Verify book ownership
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { userId: true, title: true, status: true },
    });

    if (!book) {
      return Response.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (book.status !== "ready") {
      return Response.json(
        { error: "Book must be ready before exporting" },
        { status: 400 },
      );
    }

    // Generate PDF
    const options = {
      pageSize: body.pageSize || "A4",
      includeSolutions: body.includeSolutions !== false,
      solutionPlacement: body.solutionPlacement || "back",
    };

    const result = await PDFGenerator.generateBookPDF(bookId, options);

    // Return PDF as file
    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="' + book.title.replace(/ /g, "_") + '.pdf"',
        "Content-Length": result.buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return Response.json(
      { error: error.message || "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
