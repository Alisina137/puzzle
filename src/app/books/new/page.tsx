"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PlusCircle, BookOpen } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SuggestTitleButton } from "@/components/book/SuggestTitleButton";

const createBookSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(255, "Title must be less than 255 characters"),
  puzzleCount: z
    .number()
    .int()
    .min(1, "Must have at least 1 puzzle")
    .max(500, "Maximum 500 puzzles per book"),
  theme: z.string().min(1, "Please select a theme"),
  targetAudience: z.string().min(1, "Please select a target audience"),
  difficultyLevel: z.string().min(1, "Please select a difficulty level"),
  trimSize: z.string().min(1, "Please select a trim size"),
  wordSelectionMode: z
    .enum(["single-domain", "mixed-domain"])
    .default("single-domain"),
});

type CreateBookFormData = z.infer<typeof createBookSchema>;

// Theme type
interface ThemeOption {
  id: string;
  label: string;
  domainCount: number;
}

// Fetch themes from the API
async function fetchThemes(): Promise<ThemeOption[]> {
  try {
    const response = await fetch("/api/themes");
    if (!response.ok) {
      throw new Error("Failed to fetch themes");
    }
    const data = await response.json();
    return data.themes || [];
  } catch (error) {
    console.error("Error fetching themes:", error);
    return [];
  }
}

const audiences = [
  { value: "Children", label: "👶 Children" },
  { value: "Teenagers", label: "🧑 Teenagers" },
  { value: "Adults", label: "👨 Adults" },
  { value: "Seniors", label: "👴 Seniors" },
  { value: "PuzzleEnthusiasts", label: "🧩 Puzzle Enthusiasts" },
];

const difficultyLevels = [
  { value: "Easy", label: "🟢 Easy" },
  { value: "Medium", label: "🟡 Medium" },
  { value: "Hard", label: "🔴 Hard" },
  { value: "Expert", label: "⚫ Expert" },
];

const puzzleCountPresets = [10, 25, 50, 100, 200];

// Trim Size Options for Amazon KDP
const trimSizes = [
  { value: "5x8", label: '5" × 8" (Digest)', description: "Small, portable" },
  {
    value: "5.25x8",
    label: '5.25" × 8" (Digest)',
    description: "Slightly wider digest",
  },
  {
    value: "5.5x8.5",
    label: '5.5" × 8.5" (US Trade)',
    description: "Standard paperback",
  },
  {
    value: "6x9",
    label: '6" × 9" (US Trade)',
    description: "Popular novel size",
  },
  { value: "7x10", label: '7" × 10" (US Trade)', description: "Large format" },
  {
    value: "8.25x11",
    label: '8.25" × 11" (US Letter)',
    description: "Letter size",
  },
];

export default function CreateBookPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);

  // Load themes on component mount
  useEffect(() => {
    async function loadThemes() {
      setIsLoadingThemes(true);
      const themeOptions = await fetchThemes();
      setThemes(themeOptions);
      setIsLoadingThemes(false);
    }
    loadThemes();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBookFormData>({
    resolver: zodResolver(createBookSchema),
    defaultValues: {
      title: "",
      puzzleCount: 50,
      theme: "",
      targetAudience: "",
      difficultyLevel: "",
      trimSize: "6x9",
      wordSelectionMode: "single-domain",
    },
  });

  const puzzleCount = watch("puzzleCount");
  const trimSize = watch("trimSize");
  const selectedTheme = watch("theme");
  const wordSelectionMode = watch("wordSelectionMode");

  // Domain info state
  const [domainInfo, setDomainInfo] = useState<{
    domainCount: number;
    hasVocabulary: boolean;
  } | null>(null);

  // Load domains when theme changes
  useEffect(() => {
    if (!selectedTheme) {
      setDomainInfo(null);
      return;
    }
    async function loadDomains() {
      try {
        const response = await fetch(
          `/api/themes/${encodeURIComponent(selectedTheme)}/domains`,
        );
        if (response.ok) {
          const data = await response.json();
          setDomainInfo({
            domainCount: data.data?.domainCount ?? 0,
            hasVocabulary: data.data?.hasVocabulary ?? false,
          });
        } else {
          setDomainInfo(null);
        }
      } catch {
        setDomainInfo(null);
      }
    }
    loadDomains();
  }, [selectedTheme]);

  const onSubmit = async (data: CreateBookFormData) => {
    setIsSubmitting(true);
    setError(null);

    const toastId = toast.loading("Creating your book...");

    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          puzzleCount: data.puzzleCount,
          theme: data.theme,
          targetAudience: data.targetAudience,
          difficultyLevel: data.difficultyLevel,
          trimSize: data.trimSize,
          wordSelectionMode: data.wordSelectionMode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.dismiss(toastId);
        setError(result.error || "Failed to create book");
        toast.error(result.error || "Failed to create book");
        setIsSubmitting(false);
        return;
      }

      toast.dismiss(toastId);
      toast.success("Book created successfully! 🎉 Generation started.");

      router.push("/books");
    } catch (error) {
      toast.dismiss(toastId);
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong. Please try again.");
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
            <h1 className="text-2xl font-bold text-gray-800">
              Create New Book
            </h1>
            <p className="text-gray-500 text-sm">
              Fill in the details to generate your puzzle book
            </p>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Book Title <span className="text-red-500">*</span>
                </label>
                <SuggestTitleButton
                  theme={
                    themes.find((t) => t.id === selectedTheme)?.label ||
                    selectedTheme
                  }
                  difficultyLevel={watch("difficultyLevel")}
                  targetAudience={watch("targetAudience")}
                  puzzleCount={puzzleCount}
                  onSelectTitle={(title) =>
                    setValue("title", title, { shouldValidate: true })
                  }
                />
              </div>
              <input
                type="text"
                {...register("title")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your book title..."
                disabled={isSubmitting}
              />

              {errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.title.message}
                </p>
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
                    onClick={() => setValue("puzzleCount", preset)}
                    className="px-3 py-1 text-sm rounded-full border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="number"
                {...register("puzzleCount", { valueAsNumber: true })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter custom number..."
                disabled={isSubmitting}
                min={1}
                max={500}
              />
              {errors.puzzleCount && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.puzzleCount.message}
                </p>
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
                {...register("theme")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting || isLoadingThemes}
              >
                <option value="">
                  {isLoadingThemes ? "Loading themes..." : "Select a theme..."}
                </option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label} ({theme.domainCount} domains)
                  </option>
                ))}
              </select>
              {errors.theme && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.theme.message}
                </p>
              )}
              {themes.length > 0 && (
                <p className="text-gray-400 text-xs mt-1">
                  {themes.length} themes available
                </p>
              )}
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Audience <span className="text-red-500">*</span>
              </label>
              <select
                {...register("targetAudience")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">Select audience...</option>
                {audiences.map((audience) => (
                  <option key={audience.value} value={audience.value}>
                    {audience.label}
                  </option>
                ))}
              </select>
              {errors.targetAudience && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.targetAudience.message}
                </p>
              )}
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level <span className="text-red-500">*</span>
              </label>
              <select
                {...register("difficultyLevel")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">Select difficulty...</option>
                {difficultyLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              {errors.difficultyLevel && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.difficultyLevel.message}
                </p>
              )}
            </div>

            {/* Word Selection Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Word Selection Mode <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue("wordSelectionMode", "single-domain")}
                  className={`px-4 py-3 text-left rounded-lg border transition-all ${
                    wordSelectionMode === "single-domain"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium text-gray-800 text-sm">
                    🎯 One Domain Per Puzzle
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Each puzzle uses words from one specific domain
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setValue("wordSelectionMode", "mixed-domain")}
                  className={`px-4 py-3 text-left rounded-lg border transition-all ${
                    wordSelectionMode === "mixed-domain"
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium text-gray-800 text-sm">
                    🔀 Mix Domains Per Puzzle
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Each puzzle can use words from multiple domains
                  </div>
                </button>
              </div>
              <input type="hidden" {...register("wordSelectionMode")} />
              {domainInfo && domainInfo.hasVocabulary && (
                <p className="text-gray-400 text-xs mt-1">
                  {domainInfo.domainCount} domains available for this theme
                </p>
              )}
              {domainInfo && !domainInfo.hasVocabulary && selectedTheme && (
                <p className="text-amber-600 text-xs mt-1">
                  No domain vocabulary generated yet for this theme. Words will
                  be selected from the default word list.
                </p>
              )}
            </div>

            {/* Trim Size Selection for KDP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Book Trim Size <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                {trimSizes.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => setValue("trimSize", size.value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${
                      trimSize === size.value
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium text-gray-800">
                      {size.label}
                    </div>
                    <div className="text-xs text-gray-400">
                      {size.description}
                    </div>
                  </button>
                ))}
              </div>
              <input type="hidden" {...register("trimSize")} />
              {errors.trimSize && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.trimSize.message}
                </p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                Choose the physical book size for Amazon KDP printing
              </p>
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
          <h3 className="text-sm font-semibold text-blue-800 mb-1">
            What happens next?
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>📚 Your book will be created and queued for generation</li>
            <li>🧩 Puzzles will be generated in the background</li>
            <li>
              📊 You will be redirected to the dashboard where you can track
              progress
            </li>
            <li>
              ✅ Once complete, you can review, regenerate, and reorder puzzles
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
