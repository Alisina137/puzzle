import { prisma } from "@/lib/prisma";
import { PDFGenerator } from "@/modules/pdf/pdf-generator.js";
import fs from "fs";
import path from "path";

export interface ExportOptions {
  pageSize?: "A4" | "Letter";
  includeSolutions?: boolean;
  solutionPlacement?: "back" | "after";
}

export interface ExportResult {
  id: string;
  bookId: string;
  format: string;
  status: string;
  url?: string;
  filesize?: number;
  createdAt: Date;
  completedAt?: Date;
}

export class ExportService {
  private static readonly STORAGE_DIR = path.join(
    process.cwd(),
    "storage",
    "exports",
  );

  static initStorage(): void {
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  static async createExport(
    bookId: string,
    userId: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const exportRecord = await prisma.export.create({
      data: {
        bookId,
        userId,
        format: "pdf",
        status: "pending",
        options: {
          pageSize: options.pageSize,
          includeSolutions: options.includeSolutions,
          solutionPlacement: options.solutionPlacement,
        },
      },
    });

    return {
      id: exportRecord.id,
      bookId: exportRecord.bookId,
      format: exportRecord.format,
      status: exportRecord.status,
      createdAt: exportRecord.createdAt,
      completedAt: exportRecord.completedAt || undefined,
    };
  }

  static async generateExport(exportId: string): Promise<ExportResult> {
    this.initStorage();

    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
      include: {
        book: true,
        user: true,
      },
    });

    if (!exportRecord) {
      throw new Error("Export record not found");
    }

    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: "processing",
      },
    });

    try {
      const options: ExportOptions =
        (exportRecord.options as ExportOptions | null) ?? {};

      const result = await PDFGenerator.generateBookPDF(
        exportRecord.bookId,
        options,
      );

      const safeBookTitle = exportRecord.book.title
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

      const filename = `${safeBookTitle || "book"}_${exportRecord.id}.pdf`;
      const filePath = path.join(this.STORAGE_DIR, filename);

      this.initStorage();

      fs.writeFileSync(filePath, result.buffer);

      const updated = await prisma.export.update({
        where: { id: exportId },
        data: {
          status: "completed",
          url: `/api/exports/${exportId}/download`,
          filesize: result.buffer.length,
          completedAt: new Date(),
        },
      });

      return {
        id: updated.id,
        bookId: updated.bookId,
        format: updated.format,
        status: updated.status,
        url: updated.url || undefined,
        filesize: updated.filesize || undefined,
        createdAt: updated.createdAt,
        completedAt: updated.completedAt || undefined,
      };
    } catch (error) {
      console.error(`Export generation failed for ${exportId}:`, error);

      await prisma.export.update({
        where: { id: exportId },
        data: {
          status: "failed",
        },
      });

      throw error;
    }
  }

  static async getExportStatus(exportId: string): Promise<ExportResult> {
    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
    });

    if (!exportRecord) {
      throw new Error("Export record not found");
    }

    return {
      id: exportRecord.id,
      bookId: exportRecord.bookId,
      format: exportRecord.format,
      status: exportRecord.status,
      url: exportRecord.url || undefined,
      filesize: exportRecord.filesize || undefined,
      createdAt: exportRecord.createdAt,
      completedAt: exportRecord.completedAt || undefined,
    };
  }

  static async getExportHistory(bookId: string): Promise<ExportResult[]> {
    const exports = await prisma.export.findMany({
      where: { bookId },
      orderBy: { createdAt: "desc" },
    });

    return exports.map((exp) => ({
      id: exp.id,
      bookId: exp.bookId,
      format: exp.format,
      status: exp.status,
      url: exp.url || undefined,
      filesize: exp.filesize || undefined,
      createdAt: exp.createdAt,
      completedAt: exp.completedAt || undefined,
    }));
  }

  static getFilePath(exportId: string): string {
    if (!fs.existsSync(this.STORAGE_DIR)) {
      return "";
    }

    const files = fs.readdirSync(this.STORAGE_DIR);

    const file = files.find(
      (filename) => filename.endsWith(".pdf") && filename.includes(exportId),
    );

    return file ? path.join(this.STORAGE_DIR, file) : "";
  }

  static getDownloadPath(exportId: string): string {
    return this.getFilePath(exportId);
  }

  static async cleanupOldExports(days: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const oldExports = await prisma.export.findMany({
      where: {
        status: "completed",
        completedAt: {
          lt: cutoff,
        },
      },
    });

    let deletedCount = 0;

    for (const exp of oldExports) {
      try {
        const filePath = this.getFilePath(exp.id);

        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        await prisma.export.delete({
          where: {
            id: exp.id,
          },
        });

        deletedCount++;
      } catch (error) {
        console.error(`Failed to clean up export ${exp.id}:`, error);
      }
    }

    return deletedCount;
  }
}

ExportService.initStorage();
