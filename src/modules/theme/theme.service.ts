import { prisma } from "@/lib/prisma";
import { Theme } from "@prisma/client";

export interface CreateThemeInput {
  name: string;
  categoryId?: string;
  description?: string;
  difficulty?: string;
  tags?: string[];
  isPublic?: boolean;
  words: string[];
}

export interface UpdateThemeInput {
  name?: string;
  categoryId?: string;
  description?: string;
  difficulty?: string;
  tags?: string[];
  isPublic?: boolean;
}

export class ThemeService {
  /**
   * Create a new theme with category support
   */
  static async createTheme(data: CreateThemeInput): Promise<Theme> {
    try {
      const theme = await prisma.theme.create({
        data: {
          name: data.name,
          categoryId: data.categoryId,
          description: data.description,
          difficulty: data.difficulty || "medium",
          tags: data.tags || [],
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          wordCount: data.words.length,
          words: {
            create: data.words.map((word) => ({
              word,
              difficulty: data.difficulty || "medium",
            })),
          },
        },
        include: {
          words: true,
          category: true,
        },
      });
      return theme;
    } catch (error) {
      console.error("[ThemeService] Error creating theme:", error);
      throw error;
    }
  }

  /**
   * Get all themes with category and word count
   */
  static async getAllThemes(): Promise<Theme[]> {
    try {
      const themes = await prisma.theme.findMany({
        include: {
          words: true,
          category: true,
        },
        orderBy: {
          name: "asc",
        },
      });
      return themes;
    } catch (error) {
      console.error("[ThemeService] Error fetching themes:", error);
      return [];
    }
  }

  /**
   * Get themes by category
   */
  static async getThemesByCategory(categoryId: string): Promise<Theme[]> {
    try {
      const themes = await prisma.theme.findMany({
        where: { categoryId },
        include: {
          words: true,
          category: true,
        },
        orderBy: {
          name: "asc",
        },
      });
      return themes;
    } catch (error) {
      console.error("[ThemeService] Error fetching themes by category:", error);
      return [];
    }
  }

  /**
   * Get a theme by ID
   */
  static async getThemeById(id: string): Promise<Theme | null> {
    try {
      const theme = await prisma.theme.findUnique({
        where: { id },
        include: {
          words: true,
          category: true,
        },
      });
      return theme;
    } catch (error) {
      console.error("[ThemeService] Error fetching theme:", error);
      return null;
    }
  }

  /**
   * Get a theme by name
   */
  static async getThemeByName(name: string): Promise<Theme | null> {
    try {
      const theme = await prisma.theme.findUnique({
        where: { name },
        include: {
          words: true,
          category: true,
        },
      });
      return theme;
    } catch (error) {
      console.error("[ThemeService] Error fetching theme by name:", error);
      return null;
    }
  }

  /**
   * Update a theme
   */
  static async updateTheme(id: string, data: UpdateThemeInput): Promise<Theme | null> {
    try {
      const theme = await prisma.theme.update({
        where: { id },
        data: {
          name: data.name,
          categoryId: data.categoryId,
          description: data.description,
          difficulty: data.difficulty,
          tags: data.tags,
          isPublic: data.isPublic,
        },
        include: {
          words: true,
          category: true,
        },
      });
      return theme;
    } catch (error) {
      console.error("[ThemeService] Error updating theme:", error);
      return null;
    }
  }

  /**
   * Delete a theme
   */
  static async deleteTheme(id: string): Promise<boolean> {
    try {
      await prisma.theme.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error("[ThemeService] Error deleting theme:", error);
      return false;
    }
  }

  /**
   * Duplicate a theme
   */
  static async duplicateTheme(id: string, newName: string): Promise<Theme | null> {
    try {
      const existing = await prisma.theme.findUnique({
        where: { id },
        include: {
          words: true,
        },
      });

      if (!existing) {
        return null;
      }

      const duplicated = await prisma.theme.create({
        data: {
          name: newName,
          categoryId: existing.categoryId,
          description: existing.description,
          difficulty: existing.difficulty,
          tags: existing.tags,
          isPublic: false,
          wordCount: existing.words.length,
          words: {
            create: existing.words.map((word) => ({
              word: word.word,
              difficulty: word.difficulty || "medium",
            })),
          },
        },
        include: {
          words: true,
          category: true,
        },
      });
      return duplicated;
    } catch (error) {
      console.error("[ThemeService] Error duplicating theme:", error);
      return null;
    }
  }

  /**
   * Add words to a theme
   */
  static async addWordsToTheme(themeId: string, words: string[]): Promise<Theme | null> {
    try {
      const theme = await prisma.theme.update({
        where: { id: themeId },
        data: {
          wordCount: {
            increment: words.length,
          },
          words: {
            create: words.map((word) => ({
              word,
              difficulty: "medium",
            })),
          },
        },
        include: {
          words: true,
          category: true,
        },
      });
      return theme;
    } catch (error) {
      console.error("[ThemeService] Error adding words to theme:", error);
      return null;
    }
  }

  /**
   * Remove words from a theme
   */
  static async removeWordsFromTheme(themeId: string, wordIds: string[]): Promise<Theme | null> {
    try {
      const theme = await prisma.theme.update({
        where: { id: themeId },
        data: {
          wordCount: {
            decrement: wordIds.length,
          },
          words: {
            delete: wordIds.map((id) => ({ id })),
          },
        },
        include: {
          words: true,
          category: true,
        },
      });
      return theme;
    } catch (error) {
      console.error("[ThemeService] Error removing words from theme:", error);
      return null;
    }
  }
}
