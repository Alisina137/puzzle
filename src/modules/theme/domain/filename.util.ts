/**
 * Deterministic filename normalization utility.
 *
 * Converts human-readable names into safe, lowercase, kebab-case filenames
 * suitable for use as domain vocabulary file names.
 *
 * Examples:
 *   "Sports"          → "sports"
 *   "Water Sports"    → "water-sports"
 *   "Football & Soccer" → "football-and-soccer"
 *   "Christmas Gifts" → "christmas-gifts"
 */

/**
 * Normalize a human-readable name into a safe filesystem filename.
 *
 * - Lowercases
 * - Replaces spaces with hyphens
 * - Removes apostrophes and punctuation
 * - Replaces & and + with "and"
 * - Collapses consecutive hyphens
 * - Strips leading/trailing hyphens
 * - Removes path traversal characters
 */
export function normalizeFilename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    // Replace & and + with "and"
    .replace(/&/g, "and")
    .replace(/\+/g, "and")
    // Remove apostrophes
    .replace(/['']/g, "")
    // Remove path traversal characters and other unsafe chars
    .replace(/[\\/:*?"<>|]/g, "")
    // Replace any non-alphanumeric character (except hyphens and spaces) with space
    .replace(/[^a-z0-9\s-]/g, " ")
    // Replace spaces with hyphens
    .replace(/\s+/g, "-")
    // Collapse consecutive hyphens
    .replace(/-+/g, "-")
    // Strip leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize a theme name into a directory name.
 * Same rules as normalizeFilename.
 */
export function normalizeThemeDir(themeName: string): string {
  return normalizeFilename(themeName);
}

/**
 * Build the full relative path for a domain vocabulary file.
 *
 * @param themeName - Human-readable theme name (e.g., "Sports")
 * @param domainName - Human-readable domain name (e.g., "Water Sports")
 * @param suffix - File suffix without dot (e.g., "json" or "raw.json")
 * @returns Relative path like "src/modules/theme/word-lists/sports/water-sports.json"
 */
export function buildDomainFilePath(
  themeName: string,
  domainName: string,
  suffix: string = "json",
): string {
  const themeDir = normalizeThemeDir(themeName);
  const domainFile = normalizeFilename(domainName);
  return `src/modules/theme/word-lists/${themeDir}/${domainFile}.${suffix}`;
}

/**
 * Build the directory path for a theme's domain vocabulary files.
 */
export function buildThemeDirPath(themeName: string): string {
  const themeDir = normalizeThemeDir(themeName);
  return `src/modules/theme/word-lists/${themeDir}`;
}
