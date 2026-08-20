import { prisma } from '@/lib/prisma';

export const themeRepository = {
  // Get all themes
  async findAll() {
    return prisma.theme.findMany({
      include: {
        words: true,
        category: true,
      },
    });
  },

  // Get a theme by name
  async findByName(name: string) {
    return prisma.theme.findUnique({
      where: { name },
      include: {
        words: true,
        category: true,
      },
    });
  },

  // Get theme words
  async getThemeWords(themeId: string) {
    return prisma.themeWord.findMany({
      where: { themeId },
      select: { word: true },
    });
  },

  // Create a custom theme
  async createCustom(data: { name: string; categoryId?: string; words: string[] }) {
    return prisma.theme.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        isCustom: true,
        wordCount: data.words.length,
        words: {
          create: data.words.map((word) => ({
            word,
            difficulty: 'medium',
          })),
        },
      },
    });
  },
};