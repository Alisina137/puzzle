'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, BookOpen } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

const createBookSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title must be less than 255 characters'),
  puzzleCount: z.number().int().min(1, 'Must have at least 1 puzzle').max(500, 'Maximum 500 puzzles per book'),
  theme: z.string().min(1, 'Please select a theme'),
});

type CreateBookFormData = z.infer<typeof createBookSchema>;

const themes = [
  { value: 'animals', label: 'Animals' },
  { value: 'space', label: 'Space' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'sports', label: 'Sports' },
];

const puzzleCountPresets = [10, 25, 50, 100, 200];

export default function CreateBookPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBookFormData>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      title: '',
      puzzleCount: 50,
      theme: '',
    },
  });

  const puzzleCount = watch('puzzleCount');

  const onSubmit = async (data: CreateBookFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          puzzleCount: data.puzzleCount,
          theme: data.theme,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create book');
        setIsSubmitting(false);
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <PlusCircle size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Create New Book</h1>
            <p className="text-gray-500 text-sm">Fill in the details to generate your puzzle book</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Book Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Book Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('title')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your book title..."
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Puzzle Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Puzzles <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {puzzleCountPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setValue('puzzleCount', preset)}
                    className={px-3 py-1 text-sm rounded-full transition-colors }
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="number"
                {...register('puzzleCount', { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter custom number..."
                disabled={isSubmitting}
                min={1}
                max={500}
              />
              {errors.puzzleCount && (
                <p className="text-red-500 text-sm mt-1">{errors.puzzleCount.message}</p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                You are generating {puzzleCount || 0} puzzles.
              </p>
            </div>

            {/* Theme Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Theme <span className="text-red-500">*</span>
              </label>
              <select
                {...register('theme')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">Select a theme...</option>
                {themes.map((theme) => (
                  <option key={theme.value} value={theme.value}>
                    {theme.label}
                  </option>
                ))}
              </select>
              {errors.theme && (
                <p className="text-red-500 text-sm mt-1">{errors.theme.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating book...
                </>
              ) : (
                <>
                  <PlusCircle size={18} />
                  Generate Book
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-1">What happens next?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>? Your book will be created and queued for generation</li>
            <li>? Puzzles will be generated in the background</li>
            <li>? You will be redirected to the dashboard where you can track progress</li>
            <li>? Once complete, you can review, regenerate, and reorder puzzles</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}