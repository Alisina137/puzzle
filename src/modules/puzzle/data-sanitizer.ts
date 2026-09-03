export class DataSanitizer {
  static cleanPlacedWord(pw: any): any {
    if (!pw) return null;

    return {
      word: String(pw.word || "").toUpperCase(),
      row: Number(pw.row ?? 0),
      col: Number(pw.col ?? 0),
      direction: {
        dr: Number(pw.direction?.dr ?? 0),
        dc: Number(pw.direction?.dc ?? 1),
        name: String(pw.direction?.name || "right").toLowerCase(),
      },
    };
  }

  static cleanPlacedWords(placedWords: any[]): any[] {
    if (!Array.isArray(placedWords)) return [];
    return placedWords.map((pw) => this.cleanPlacedWord(pw)).filter(Boolean);
  }

  static cleanWords(words: string[]): string[] {
    if (!Array.isArray(words)) return [];
    return words.map((w) => String(w).toUpperCase());
  }

  static cleanGrid(grid: string[][]): string[][] {
    if (!Array.isArray(grid) || grid.length === 0) return [];
    return grid.map((row) => row.map((cell) => String(cell).toUpperCase()));
  }

  static cleanSolutionWords(solutionWords: any[]): any[] {
    if (!Array.isArray(solutionWords)) return [];
    return solutionWords.map((sw: any) => ({
      word: String(sw.word || "").toUpperCase(),
      startRow: Number(sw.startRow ?? 0),
      startCol: Number(sw.startCol ?? 0),
      endRow: Number(sw.endRow ?? 0),
      endCol: Number(sw.endCol ?? 0),
      direction: String(sw.direction || "right").toLowerCase(),
    }));
  }
}
