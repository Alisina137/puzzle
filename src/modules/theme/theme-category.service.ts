import { prisma } from "@/lib/prisma";
import { ThemeCategory } from "@prisma/client";

export interface CreateCategoryInput {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
}

export class ThemeCategoryService {
  /**
   * Create a new theme category
   */
  static async createCategory(data: CreateCategoryInput): Promise<ThemeCategory> {
    try {
      const category = await prisma.themeCategory.create({
        data: {
          name: data.name,
          description: data.description,
          icon: data.icon,
        },
      });
      return category;
    } catch (error) {
      console.error("[ThemeCategoryService] Error creating category:", error);
      throw error;
    }
  }

  /**
   * Get all theme categories
   */
  static async getAllCategories(): Promise<ThemeCategory[]> {
    try {
      const categories = await prisma.themeCategory.findMany({
        include: {
          themes: {
            select: {
              id: true,
              name: true,
              wordCount: true,
              isCustom: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });
      return categories;
    } catch (error) {
      console.error("[ThemeCategoryService] Error fetching categories:", error);
      return [];
    }
  }

  /**
   * Get a category by ID
   */
  static async getCategoryById(id: string): Promise<ThemeCategory | null> {
    try {
      const category = await prisma.themeCategory.findUnique({
        where: { id },
        include: {
          themes: {
            include: {
              words: true,
            },
          },
        },
      });
      return category;
    } catch (error) {
      console.error("[ThemeCategoryService] Error fetching category:", error);
      return null;
    }
  }

  /**
   * Update a category
   */
  static async updateCategory(
    id: string,
    data: UpdateCategoryInput
  ): Promise<ThemeCategory | null> {
    try {
      const category = await prisma.themeCategory.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          icon: data.icon,
        },
      });
      return category;
    } catch (error) {
      console.error("[ThemeCategoryService] Error updating category:", error);
      return null;
    }
  }

  /**
   * Delete a category
   */
  static async deleteCategory(id: string): Promise<boolean> {
    try {
      await prisma.themeCategory.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error("[ThemeCategoryService] Error deleting category:", error);
      return false;
    }
  }

  /**
   * Get categories with theme counts
   */
  static async getCategoriesWithCounts(): Promise<
    Array<ThemeCategory & { themeCount: number }>
  > {
    try {
      const categories = await prisma.themeCategory.findMany({
        include: {
          themes: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return categories.map((category) => ({
        ...category,
        themeCount: category.themes.length,
      }));
    } catch (error) {
      console.error("[ThemeCategoryService] Error fetching categories with counts:", error);
      return [];
    }
  }
}
