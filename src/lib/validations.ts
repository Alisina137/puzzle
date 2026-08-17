import { z } from 'zod';

// Book Schemas
export const createBookSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title must be less than 255 characters'),
  puzzleCount: z.number().int().min(1, 'Must have at least 1 puzzle').max(500, 'Maximum 500 puzzles per book'),
  theme: z.string().min(1, 'Theme is required'),
});

export const updateBookSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title must be less than 255 characters').optional(),
  theme: z.string().min(1, 'Theme is required').optional(),
});

// Book ID schema - accept string that is a valid CUID or UUID
export const bookIdSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
});

// Puzzle Schemas
export const puzzleIdSchema = z.object({
  puzzleId: z.string().min(1, 'Puzzle ID is required'),
});

export const createPuzzleSchema = z.object({
  type: z.enum(['wordsearch', 'sudoku', 'maze', 'crossword']).default('wordsearch'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  data: z.record(z.any()),
});

export const regeneratePuzzleSchema = z.object({
  bookPuzzleId: z.string().min(1, 'Book puzzle ID is required'),
});

// Reorder Schema
export const reorderPuzzlesSchema = z.object({
  order: z.array(z.string().min(1, 'Invalid puzzle ID format')).min(1, 'At least one puzzle is required'),
});

// Export Schemas
export const exportBookSchema = z.object({
  includeSolutions: z.boolean().default(true),
  templateId: z.string().optional(),
  pageSize: z.enum(['A4', 'Letter']).default('A4'),
});

// User Schemas
export const registerUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be less than 100 characters'),
});

export const loginUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Theme Schemas
export const createThemeSchema = z.object({
  name: z.string().min(2, 'Theme name must be at least 2 characters').max(100, 'Theme name must be less than 100 characters'),
  words: z.array(z.string().min(1, 'Word is required')).min(5, 'At least 5 words are required').max(100, 'Maximum 100 words allowed'),
});

// Validation Helper
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _form: ['Validation failed'] } };
  }
}