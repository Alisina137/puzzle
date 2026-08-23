import { prisma } from "@/lib/prisma";
import { PDFGenerator } from "@/modules/pdf/pdf-generator";

export interface KDPExportOptions {
  trimSize: string;
  hasBleed: boolean;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  gutter: number;
  largePrint: boolean;
  pageNumbering: boolean;
  solutionPlacement: "end" | "after_each" | "none";
  includeSolution: boolean;
}

export interface KDPExportResult {
  success: boolean;
  pdfBuffer?: Buffer;
  fileName?: string;
  pageCount?: number;
  error?: string;
}

export class KDPExportService {
  /**
   * Export a book as KDP-ready PDF
   */
  static async exportToKDP(
    bookId: string,
    userId: string,
    options?: Partial<KDPExportOptions>
  ): Promise<KDPExportResult> {
    try {
      // Verify book ownership and get book data
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          kdpConfig: true,
        },
      });

      if (!book || book.userId !== userId) {
        return {
          success: false,
          error: "Book not found or unauthorized",
        };
      }

      // Get KDP config or use defaults
      const config = book.kdpConfig;
      const exportOptions: KDPExportOptions = {
        trimSize: options?.trimSize || config?.trimSize || "6x9",
        hasBleed: options?.hasBleed ?? config?.hasBleed ?? false,
        marginTop: options?.marginTop ?? config?.marginTop ?? 72,
        marginBottom: options?.marginBottom ?? config?.marginBottom ?? 72,
        marginLeft: options?.marginLeft ?? config?.marginLeft ?? 72,
        marginRight: options?.marginRight ?? config?.marginRight ?? 72,
        gutter: options?.gutter ?? config?.gutter ?? 0,
        largePrint: options?.largePrint ?? config?.largePrint ?? false,
        pageNumbering: options?.pageNumbering ?? config?.pageNumbering ?? true,
        solutionPlacement: (options?.solutionPlacement || config?.solutionPlacement || "end") as KDPExportOptions["solutionPlacement"],
        includeSolution: options?.includeSolution ?? config?.includeSolution ?? true,
      };

      // Generate PDF using the existing PDFGenerator
      const result = await PDFGenerator.generateBookPDF(bookId, {
        pageSize: exportOptions.largePrint ? "Letter" : "A4",
        includeSolutions: exportOptions.includeSolution,
        solutionPlacement: exportOptions.solutionPlacement === "end" ? "back" : "after",
        margins: {
          top: exportOptions.marginTop,
          bottom: exportOptions.marginBottom,
          left: exportOptions.marginLeft,
          right: exportOptions.marginRight,
        },
      });

      // Create export record
      await prisma.export.create({
        data: {
          bookId,
          userId,
          format: "kdp-pdf",
          status: "completed",
          filesize: result.buffer.length,
          options: {
            trimSize: exportOptions.trimSize,
            hasBleed: exportOptions.hasBleed,
            largePrint: exportOptions.largePrint,
            pageNumbering: exportOptions.pageNumbering,
            solutionPlacement: exportOptions.solutionPlacement,
            includeSolution: exportOptions.includeSolution,
          },
          completedAt: new Date(),
        },
      });

      return {
        success: true,
        pdfBuffer: result.buffer,
        fileName: `${book.title.replace(/\s+/g, "_")}_KDP.pdf`,
        pageCount: result.pageCount,
      };
    } catch (error) {
      console.error("[KDPExportService] Error exporting to KDP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export KDP PDF",
      };
    }
  }

  /**
   * Get KDP export options for a book
   */
  static async getExportOptions(bookId: string, userId: string): Promise<KDPExportOptions | null> {
    try {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: { kdpConfig: true },
      });

      if (!book || book.userId !== userId) {
        return null;
      }

      const config = book.kdpConfig;
      return {
        trimSize: config?.trimSize || "6x9",
        hasBleed: config?.hasBleed ?? false,
        marginTop: config?.marginTop ?? 72,
        marginBottom: config?.marginBottom ?? 72,
        marginLeft: config?.marginLeft ?? 72,
        marginRight: config?.marginRight ?? 72,
        gutter: config?.gutter ?? 0,
        largePrint: config?.largePrint ?? false,
        pageNumbering: config?.pageNumbering ?? true,
        solutionPlacement: (config?.solutionPlacement || "end") as KDPExportOptions["solutionPlacement"],
        includeSolution: config?.includeSolution ?? true,
      };
    } catch (error) {
      console.error("[KDPExportService] Error getting export options:", error);
      return null;
    }
  }
}
