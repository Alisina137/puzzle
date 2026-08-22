import { prisma } from "@/lib/prisma";

export interface CreateWordListInput {
  name: string;
  description?: string;
  words: string[];
  isPublic?: boolean;
}

export interface UpdateWordListInput {
  name?: string;
  description?: string;
  words?: string[];
  isPublic?: boolean;
}

export interface WordListWithWords {
  id: string;
  name: string;
  description: string | null;
  words: string[];
  isPublic: boolean;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class WordListService {
  /**
   * Create a new custom word list
   */
  static async createWordList(userId: string, data: CreateWordListInput) {
    try {
      const wordList = await prisma.customWordList.create({
        data: {
          name: data.name,
          description: data.description,
          words: data.words,
          isPublic: data.isPublic || false,
          userId: userId,
        },
      });
      return wordList;
    } catch (error) {
      console.error("[WordListService] Error creating word list:", error);
      throw error;
    }
  }

  /**
   * Get all word lists for a user
   */
  static async getUserWordLists(userId: string) {
    try {
      const wordLists = await prisma.customWordList.findMany({
        where: {
          OR: [
            { userId: userId },
            { isPublic: true },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return wordLists;
    } catch (error) {
      console.error("[WordListService] Error fetching user word lists:", error);
      return [];
    }
  }

  /**
   * Get a word list by ID
   */
  static async getWordListById(id: string, userId?: string) {
    try {
      const where: any = { id };
      if (userId) {
        where.OR = [
          { userId: userId },
          { isPublic: true },
        ];
      }
      
      const wordList = await prisma.customWordList.findUnique({
        where,
      });
      return wordList;
    } catch (error) {
      console.error("[WordListService] Error fetching word list:", error);
      return null;
    }
  }

  /**
   * Update a word list
   */
  static async updateWordList(id: string, userId: string, data: UpdateWordListInput) {
    try {
      // Verify ownership
      const existing = await prisma.customWordList.findUnique({
        where: { id },
      });

      if (!existing || existing.userId !== userId) {
        throw new Error("Word list not found or unauthorized");
      }

      const wordList = await prisma.customWordList.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          words: data.words,
          isPublic: data.isPublic,
        },
      });
      return wordList;
    } catch (error) {
      console.error("[WordListService] Error updating word list:", error);
      throw error;
    }
  }

  /**
   * Delete a word list
   */
  static async deleteWordList(id: string, userId: string) {
    try {
      // Verify ownership
      const existing = await prisma.customWordList.findUnique({
        where: { id },
      });

      if (!existing || existing.userId !== userId) {
        throw new Error("Word list not found or unauthorized");
      }

      await prisma.customWordList.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error("[WordListService] Error deleting word list:", error);
      return false;
    }
  }

  /**
   * Get all public word lists
   */
  static async getPublicWordLists() {
    try {
      const wordLists = await prisma.customWordList.findMany({
        where: { isPublic: true },
        orderBy: {
          createdAt: "desc",
        },
      });
      return wordLists;
    } catch (error) {
      console.error("[WordListService] Error fetching public word lists:", error);
      return [];
    }
  }
}
