import { describe, it, expect } from "vitest";
import {
  themeHasDomains,
  loadDomainWords,
  loadMultipleDomainWords,
  loadThemeDomains,
  loadLegacyThemeWords,
} from "../word-list-loader";

describe("WordListLoader", () => {
  describe("themeHasDomains", () => {
    it("should return true for themes with domain directories", () => {
      expect(themeHasDomains("Sports")).toBe(true);
      expect(themeHasDomains("sports")).toBe(true);
    });

    it("should return false for themes without domain directories", () => {
      expect(themeHasDomains("NonExistentTheme")).toBe(false);
    });
  });

  describe("loadDomainWords", () => {
    it("should load a domain with difficulty structure preserved", () => {
      const words = loadDomainWords("Sports", "Water Sports");
      expect(words).not.toBeNull();
      expect(words!.simple).toBeInstanceOf(Array);
      expect(words!.intermediate).toBeInstanceOf(Array);
      expect(words!.hard).toBeInstanceOf(Array);
      expect(words!.simple.length).toBeGreaterThan(0);
      expect(words!.intermediate.length).toBeGreaterThan(0);
      expect(words!.hard.length).toBeGreaterThan(0);
    });

    it("should return null for non-existent domain", () => {
      const words = loadDomainWords("Sports", "Nonexistent Domain");
      expect(words).toBeNull();
    });
  });

  describe("loadMultipleDomainWords", () => {
    it("should merge multiple domains preserving difficulty structure", () => {
      const words = loadMultipleDomainWords("Sports", [
        "Water Sports",
        "Combat Sports",
      ]);
      expect(words.simple.length).toBeGreaterThan(0);
      expect(words.intermediate.length).toBeGreaterThan(0);
      expect(words.hard.length).toBeGreaterThan(0);
    });

    it("should deduplicate words across domains", () => {
      const words = loadMultipleDomainWords("Sports", [
        "Water Sports",
        "Combat Sports",
      ]);
      const allWords = [...words.simple, ...words.intermediate, ...words.hard];
      const unique = new Set(allWords);
      expect(allWords.length).toBe(unique.size);
    });
  });

  describe("loadThemeDomains", () => {
    it("should return domain info for themes with domains", () => {
      const info = loadThemeDomains("Sports");
      expect(info.hasVocabulary).toBe(true);
      expect(info.domainCount).toBeGreaterThan(0);
      expect(info.domains.length).toBeGreaterThan(0);

      const domain = info.domains[0];
      expect(domain.name).toBeDefined();
      expect(domain.fileName).toBeDefined();
      expect(domain.wordCounts.total).toBeGreaterThan(0);
    });

    it("should return empty for themes without domains", () => {
      const info = loadThemeDomains("NonExistentTheme");
      expect(info.hasVocabulary).toBe(false);
      expect(info.domainCount).toBe(0);
      expect(info.domains).toEqual([]);
    });
  });

  describe("loadLegacyThemeWords", () => {
    it("should load legacy theme words for existing themes", () => {
      const words = loadLegacyThemeWords("animals");
      expect(words).not.toBeNull();
      expect(words!.simple.length).toBeGreaterThan(0);
      expect(words!.intermediate.length).toBeGreaterThan(0);
      expect(words!.hard.length).toBeGreaterThan(0);
    });

    it("should return null for non-existent legacy themes", () => {
      const words = loadLegacyThemeWords("nonexistent");
      expect(words).toBeNull();
    });
  });
});
