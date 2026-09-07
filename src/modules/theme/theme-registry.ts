import fs from "node:fs";
import path from "node:path";

const WORD_LISTS_ROOT = path.join(
  process.cwd(),
  "src/modules/theme/word-lists",
);

export interface ThemeSummary {
  id: string;
  label: string;
  domainCount: number;
}

export function listAvailableThemes(): ThemeSummary[] {
  if (!fs.existsSync(WORD_LISTS_ROOT)) {
    return [];
  }

  const entries = fs.readdirSync(WORD_LISTS_ROOT, { withFileTypes: true });
  const themes: ThemeSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const themeDir = path.join(WORD_LISTS_ROOT, entry.name);
    const domainFiles = fs
      .readdirSync(themeDir)
      .filter((f) => f.endsWith(".json"));

    if (domainFiles.length === 0) continue;

    themes.push({
      id: entry.name,
      label: toDisplayLabel(entry.name),
      domainCount: domainFiles.length,
    });
  }

  return themes.sort((a, b) => a.label.localeCompare(b.label));
}

function toDisplayLabel(folderName: string): string {
  return folderName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
