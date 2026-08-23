"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, X, Save } from "lucide-react";
import { toast } from "sonner";

interface KDPConfig {
  id?: string;
  trimSize: string;
  hasBleed: boolean;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  gutter: number;
  largePrint: boolean;
  pageNumbering: boolean;
  solutionPlacement: string;
  includeSolution: boolean;
}

interface KDPConfigProps {
  bookId: string;
  onConfigSaved?: () => void;
}

const TRIM_SIZES = [
  { value: "5x8", label: "5\" x 8\"" },
  { value: "5.5x8.5", label: "5.5\" x 8.5\"" },
  { value: "6x9", label: "6\" x 9\"" },
  { value: "7x10", label: "7\" x 10\"" },
  { value: "8.5x11", label: "8.5\" x 11\"" },
];

const SOLUTION_PLACEMENTS = [
  { value: "end", label: "At the end of the book" },
  { value: "after_each", label: "After each puzzle" },
  { value: "none", label: "Do not include solutions" },
];

const defaultConfig: KDPConfig = {
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

export function KDPConfig({ bookId, onConfigSaved }: KDPConfigProps) {
  const [config, setConfig] = useState<KDPConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/books/${bookId}/kdp/config`);
        const data = await response.json();

        if (data.success && data.data) {
          setConfig({
            trimSize: data.data.trimSize || defaultConfig.trimSize,
            hasBleed: data.data.hasBleed ?? defaultConfig.hasBleed,
            marginTop: data.data.marginTop ?? defaultConfig.marginTop,
            marginBottom: data.data.marginBottom ?? defaultConfig.marginBottom,
            marginLeft: data.data.marginLeft ?? defaultConfig.marginLeft,
            marginRight: data.data.marginRight ?? defaultConfig.marginRight,
            gutter: data.data.gutter ?? defaultConfig.gutter,
            largePrint: data.data.largePrint ?? defaultConfig.largePrint,
            pageNumbering: data.data.pageNumbering ?? defaultConfig.pageNumbering,
            solutionPlacement: data.data.solutionPlacement || defaultConfig.solutionPlacement,
            includeSolution: data.data.includeSolution ?? defaultConfig.includeSolution,
          });
          setHasConfig(true);
        }
      } catch (error) {
        console.error("Error fetching KDP config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [bookId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/books/${bookId}/kdp/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("KDP configuration saved successfully!");
        setHasConfig(true);
        onConfigSaved?.();
      } else {
        toast.error(data.error || "Failed to save configuration");
      }
    } catch (error) {
      console.error("Error saving KDP config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete the KDP configuration?")) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/books/${bookId}/kdp/config`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("KDP configuration deleted");
        setHasConfig(false);
        setConfig(defaultConfig);
        onConfigSaved?.();
      } else {
        toast.error(data.error || "Failed to delete configuration");
      }
    } catch (error) {
      console.error("Error deleting KDP config:", error);
      toast.error("Failed to delete configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={20} className="animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-500">Loading KDP settings...</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">KDP Publishing</h2>
          {hasConfig && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Configured
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? "Hide Settings" : "Show Settings"}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Trim Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Trim Size
            </label>
            <select
              value={config.trimSize}
              onChange={(e) => setConfig({ ...config, trimSize: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TRIM_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Bleed */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasBleed"
                checked={config.hasBleed}
                onChange={(e) => setConfig({ ...config, hasBleed: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="hasBleed" className="text-sm text-gray-700">
                Include Bleed
              </label>
            </div>

            {/* Large Print */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="largePrint"
                checked={config.largePrint}
                onChange={(e) => setConfig({ ...config, largePrint: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="largePrint" className="text-sm text-gray-700">
                Large Print Mode
              </label>
            </div>

            {/* Page Numbering */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pageNumbering"
                checked={config.pageNumbering}
                onChange={(e) => setConfig({ ...config, pageNumbering: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="pageNumbering" className="text-sm text-gray-700">
                Include Page Numbers
              </label>
            </div>

            {/* Include Solutions */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeSolution"
                checked={config.includeSolution}
                onChange={(e) => setConfig({ ...config, includeSolution: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includeSolution" className="text-sm text-gray-700">
                Include Solutions
              </label>
            </div>
          </div>

          {/* Margins */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Top (pts)</label>
              <input
                type="number"
                value={config.marginTop}
                onChange={(e) => setConfig({ ...config, marginTop: parseInt(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Bottom (pts)</label>
              <input
                type="number"
                value={config.marginBottom}
                onChange={(e) => setConfig({ ...config, marginBottom: parseInt(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Left (pts)</label>
              <input
                type="number"
                value={config.marginLeft}
                onChange={(e) => setConfig({ ...config, marginLeft: parseInt(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Right (pts)</label>
              <input
                type="number"
                value={config.marginRight}
                onChange={(e) => setConfig({ ...config, marginRight: parseInt(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="200"
              />
            </div>
          </div>

          {/* Gutter */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Gutter (pts)</label>
            <input
              type="number"
              value={config.gutter}
              onChange={(e) => setConfig({ ...config, gutter: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
            />
          </div>

          {/* Solution Placement */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Solution Placement
            </label>
            <select
              value={config.solutionPlacement}
              onChange={(e) => setConfig({ ...config, solutionPlacement: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SOLUTION_PLACEMENTS.map((placement) => (
                <option key={placement.value} value={placement.value}>
                  {placement.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving..." : "Save Settings"}
            </button>

            {hasConfig && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-lg border border-red-300 px-4 py-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                Delete Configuration
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
