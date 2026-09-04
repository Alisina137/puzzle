import { describe, it, expect } from "vitest";
import {
  normalizeFilename,
  normalizeThemeDir,
  buildDomainFilePath,
  buildThemeDirPath,
} from "../filename.util";

describe("FilenameUtil", () => {
  describe("normalizeFilename", () => {
    it("should lowercase simple names", () => {
      expect(normalizeFilename("Sports")).toBe("sports");
    });

    it("should replace spaces with hyphens", () => {
      expect(normalizeFilename("Water Sports")).toBe("water-sports");
    });

    it("should replace & with and", () => {
      expect(normalizeFilename("Football & Soccer")).toBe("football-and-soccer");
    });

    it("should remove apostrophes", () => {
      expect(normalizeFilename("Children's Games")).toBe("childrens-games");
    });

    it("should remove punctuation", () => {
      expect(normalizeFilename("Hello, World!")).toBe("hello-world");
    });

    it("should collapse consecutive hyphens", () => {
      expect(normalizeFilename("A   B")).toBe("a-b");
    });

    it("should strip leading/trailing hyphens", () => {
      expect(normalizeFilename("  Sports  ")).toBe("sports");
    });

    it("should remove path traversal characters", () => {
      expect(normalizeFilename("../etc/passwd")).toBe("etc-passwd");
    });

    it("should handle Christmas Gifts", () => {
      expect(normalizeFilename("Christmas Gifts")).toBe("christmas-gifts");
    });

    it("should handle numbers", () => {
      expect(normalizeFilename("Top 10 Sports")).toBe("top-10-sports");
    });
  });

  describe("normalizeThemeDir", () => {
    it("should normalize theme names", () => {
      expect(normalizeThemeDir("Sports")).toBe("sports");
      expect(normalizeThemeDir("Space Exploration")).toBe("space-exploration");
    });
  });

  describe("buildDomainFilePath", () => {
    it("should build correct path", () => {
      const path = buildDomainFilePath("Sports", "Water Sports");
      expect(path).toBe("src/modules/theme/word-lists/sports/water-sports.json");
    });

    it("should support custom suffix", () => {
      const path = buildDomainFilePath("Sports", "Water Sports", "raw.json");
      expect(path).toBe("src/modules/theme/word-lists/sports/water-sports.raw.json");
    });
  });

  describe("buildThemeDirPath", () => {
    it("should build correct directory path", () => {
      const path = buildThemeDirPath("Sports");
      expect(path).toBe("src/modules/theme/word-lists/sports");
    });
  });
});
