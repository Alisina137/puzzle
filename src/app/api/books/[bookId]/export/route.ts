import { NextRequest } from "next/server";
import { PDFGenerator } from "@/modules/pdf/pdf-generator";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Builds a Content-Disposition header value that's safe for ANY title,
 * including em dashes, curly quotes, accented characters, etc. Raw
 * header values only allow Latin-1 bytes (0-255) — an em dash (U+2014,
 * code point 8212) is what was crashing this route. This provides both
 * an ASCII-safe fallback filename (old clients) and the proper
 * UTF-8-encoded filename* form (RFC 5987/6266) modern browsers use to
 * show the real title correctly in the download dialog.
 */
function buildContentDisposition(filename: string): string {
  const asciiSafeFallback = filename
    .replace(/[\u2014\u2013]/g, "-") // em dash, en dash → hyphen
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D]/g, '"') // curly double quotes
    .replace(/[^\x20-\x7E]/g, "");   // strip anything else non-ASCII

  const encoded = encodeURIComponent(filename);

  return `attachment; filename="${asciiSafeFallback}"; filename*=UTF-8''${encoded}`;
}

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
    const safeFilename = book.title.replace(/ /g, "_") + ".pdf";

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition(safeFilename),
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
