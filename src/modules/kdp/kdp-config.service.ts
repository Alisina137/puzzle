import { prisma } from "@/lib/prisma";

export interface KDPConfigInput {
  trimSize: string;
  hasBleed?: boolean;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  gutter?: number;
  largePrint?: boolean;
  pageNumbering?: boolean;
  solutionPlacement?: string;
  includeSolution?: boolean;
}

export interface KDPConfigUpdate {
  trimSize?: string;
  hasBleed?: boolean;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  gutter?: number;
  largePrint?: boolean;
  pageNumbering?: boolean;
  solutionPlacement?: string;
  includeSolution?: boolean;
}

export const TRIM_SIZES = [
  { value: "5x8", label: "5\" x 8\"" },
  { value: "5.5x8.5", label: "5.5\" x 8.5\"" },
  { value: "6x9", label: "6\" x 9\"" },
  { value: "7x10", label: "7\" x 10\"" },
  { value: "8.5x11", label: "8.5\" x 11\"" },
] as const;

export const SOLUTION_PLACEMENTS = [
  { value: "end", label: "At the end of the book" },
  { value: "after_each", label: "After each puzzle" },
  { value: "none", label: "Do not include solutions" },
] as const;

export class KDPConfigService {
  /**
   * Get KDP configuration for a book
   */
  static async getConfig(bookId: string, userId: string) {
    try {
      // Verify book ownership
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { userId: true },
      });

      if (!book || book.userId !== userId) {
        throw new Error("Book not found or unauthorized");
      }

      const config = await prisma.kDPConfiguration.findUnique({
        where: { bookId },
      });

      return config;
    } catch (error) {
      console.error("[KDPConfigService] Error getting config:", error);
      throw error;
    }
  }

  /**
   * Create or update KDP configuration for a book
   */
  static async upsertConfig(
    bookId: string,
    userId: string,
    data: KDPConfigInput
  ) {
    try {
      // Verify book ownership
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { userId: true },
      });

      if (!book || book.userId !== userId) {
        throw new Error("Book not found or unauthorized");
      }

      const config = await prisma.kDPConfiguration.upsert({
        where: { bookId },
        update: {
          trimSize: data.trimSize,
          hasBleed: data.hasBleed ?? false,
          marginTop: data.marginTop ?? 72,
          marginBottom: data.marginBottom ?? 72,
          marginLeft: data.marginLeft ?? 72,
          marginRight: data.marginRight ?? 72,
          gutter: data.gutter ?? 0,
          largePrint: data.largePrint ?? false,
          pageNumbering: data.pageNumbering ?? true,
          solutionPlacement: data.solutionPlacement ?? "end",
          includeSolution: data.includeSolution ?? true,
        },
        create: {
          bookId,
          trimSize: data.trimSize,
          hasBleed: data.hasBleed ?? false,
          marginTop: data.marginTop ?? 72,
          marginBottom: data.marginBottom ?? 72,
          marginLeft: data.marginLeft ?? 72,
          marginRight: data.marginRight ?? 72,
          gutter: data.gutter ?? 0,
          largePrint: data.largePrint ?? false,
          pageNumbering: data.pageNumbering ?? true,
          solutionPlacement: data.solutionPlacement ?? "end",
          includeSolution: data.includeSolution ?? true,
        },
      });

      return config;
    } catch (error) {
      console.error("[KDPConfigService] Error upserting config:", error);
      throw error;
    }
  }

  /**
   * Delete KDP configuration
   */
  static async deleteConfig(bookId: string, userId: string) {
    try {
      // Verify book ownership
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { userId: true },
      });

      if (!book || book.userId !== userId) {
        throw new Error("Book not found or unauthorized");
      }

      await prisma.kDPConfiguration.delete({
        where: { bookId },
      });

      return { success: true };
    } catch (error) {
      console.error("[KDPConfigService] Error deleting config:", error);
      throw error;
    }
  }

  /**
   * Get default KDP configuration
   */
  static getDefaultConfig(): KDPConfigInput {
    return {
      trimSize: "6x9",
      hasBleed: false,
      marginTop: 72,
      marginBottom: 72,
      marginLeft: 72,
      marginRight: 72,
      gutter: 0,
      largePrint: false,
      pageNumbering: true,
      solutionPlacement: "end",
      includeSolution: true,
    };
  }
}
