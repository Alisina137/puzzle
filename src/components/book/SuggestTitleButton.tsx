"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface SuggestTitleButtonProps {
  theme: string;
  difficultyLevel: string;
  targetAudience: string;
  puzzleCount: number;
  onSelectTitle: (title: string) => void;
}

export function SuggestTitleButton({
  theme,
  difficultyLevel,
  targetAudience,
  puzzleCount,
  onSelectTitle,
}: SuggestTitleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  const canSuggest =
    Boolean(theme) &&
    Boolean(difficultyLevel) &&
    Boolean(targetAudience) &&
    puzzleCount > 0;

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setSelectedTitle(null);

    try {
      const res = await fetch("/api/books/suggest-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          difficultyLevel,
          targetAudience,
          puzzleCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setSuggestions(data.titles || []);
    } catch (err: any) {
      setError(err.message || "Could not generate titles. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (title: string) => {
    setSelectedTitle(title);
    onSelectTitle(title);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleSuggest}
        disabled={!canSuggest || loading}
        title={
          !canSuggest
            ? "Select theme, difficulty, and audience first"
            : undefined
        }
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50 disabled:hover:border-blue-200"
      >
        {loading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles size={13} />
            Suggest Titles
          </>
        )}
      </button>

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}

      {suggestions.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
          {suggestions.map((title, i) => {
            const isSelected = title === selectedTitle;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(title)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
