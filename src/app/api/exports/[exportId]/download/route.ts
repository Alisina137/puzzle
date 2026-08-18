import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ExportService } from "@/modules/export/export.service";
import fs from "fs";
import path from "path";

// GET /api/exports/[exportId]/download - Download an export
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ exportId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exportId } = await context.params;

    // Get export record
    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
      include: {
        book: true,
        user: true,
      },
    });

    if (!exportRecord) {
      return Response.json({ error: "Export not found" }, { status: 404 });
    }

    // Verify ownership
    if (exportRecord.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (exportRecord.status !== "completed") {
      return Response.json(
        { error: "Export is not ready yet. Status: " + exportRecord.status },
        { status: 400 },
      );
    }

    // Get file path
    const storageDir = path.join(process.cwd(), "storage", "exports");
    const files = fs.readdirSync(storageDir);
    const file = files.find((f) => f.includes(exportId));

    if (!file) {
      return Response.json({ error: "Export file not found" }, { status: 404 });
    }

    const filepath = path.join(storageDir, file);
    const fileBuffer = fs.readFileSync(filepath);

    // Return file
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="' +
          exportRecord.book.title.replace(/ /g, "_") +
          '.pdf"',
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);
    return Response.json(
      { error: error.message || "Failed to download export" },
      { status: 500 },
    );
  }
}
