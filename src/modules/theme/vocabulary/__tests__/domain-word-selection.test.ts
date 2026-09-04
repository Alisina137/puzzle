import { describe, it, expect } from "vitest";
import { DomainWordSelectionService } from "../domain-word-selection.service";
import { getEligibleDifficultyPools } from "../difficulty-pools";

describe("DomainWordSelectionService", () => {
  const baseOptions = {
    theme: "Sports",
    wordsPerPuzzle: 10,
    usedWords: [],
    minWordLength: 3,
    maxWordLength: 15,
    gridSize: 12,
  };

  describe("single-domain mode", () => {
    it("should select words from only the specified domain", () => {
      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domain: "Water Sports",
        mode: "single-domain",
        bookDifficulty: "Medium",
      });

      expect(result.words.length).toBeGreaterThan(0);
      expect(result.mode).toBe("single-domain");
      expect(result.domain).toBe("Water Sports");
      expect(result.domains).toEqual(["Water Sports"]);
    });

    it("should only use simple+intermediate for Medium difficulty", () => {
      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domain: "Water Sports",
        mode: "single-domain",
        bookDifficulty: "Medium",
        wordsPerPuzzle: 5,
      });

      // All selected words should come from simple or intermediate pools
      // (not hard)
      const waterSportsHard = [
        "HYDROFOIL", "DECOMPRESSION", "BUTTERFLYSTROKE",
        "FREESTYLESPRINT", "WATERPOLOGOALIE", "SYNCHRONIZED",
      ];
      for (const word of result.words) {
        expect(waterSportsHard).not.toContain(word);
      }
    });

    it("should only use simple for Easy difficulty", () => {
      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domain: "Water Sports",
        mode: "single-domain",
        bookDifficulty: "Easy",
        wordsPerPuzzle: 5,
      });

      // All selected words should come from simple pool only
      const waterSportsIntermediate = [
        "KAYAKER", "SPRINGBOARD", "FREESTYLE", "BUTTERFLY",
        "BACKSTROKE", "BREASTSTROKE",
      ];
      const waterSportsHard = [
        "HYDROFOIL", "DECOMPRESSION",
      ];
      for (const word of result.words) {
        expect(waterSportsIntermediate).not.toContain(word);
        expect(waterSportsHard).not.toContain(word);
      }
    });

    it("should only use hard for Hard difficulty", () => {
      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domain: "Water Sports",
        mode: "single-domain",
        bookDifficulty: "Hard",
        wordsPerPuzzle: 5,
      });

      // All selected words should come from hard pool only
      const waterSportsSimple = [
        "SWIM", "DIVE", "ROW", "BOAT", "POOL",
      ];
      const waterSportsIntermediate = [
        "KAYAKER", "SPRINGBOARD", "FREESTYLE",
      ];
      for (const word of result.words) {
        expect(waterSportsSimple).not.toContain(word);
        expect(waterSportsIntermediate).not.toContain(word);
      }
    });

    it("should report shortage when not enough eligible words", () => {
      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domain: "Water Sports",
        mode: "single-domain",
        bookDifficulty: "Hard",
        wordsPerPuzzle: 100, // More than available
        maxWordLength: 20,
        gridSize: 25,
      });

      expect(result.shortage).toBe(true);
      expect(result.shortageAmount).toBeGreaterThan(0);
      // Should NOT fill with simple/intermediate words
      expect(result.words.length).toBeLessThan(100);
    });

    it("should respect used words (global uniqueness)", () => {
      const usedWords = ["SWIM", "DIVE", "ROW", "BOAT", "POOL", "WAVE", "LAKE", "SURF", "RAFT", "PADDLE"];

      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domain: "Water Sports",
        mode: "single-domain",
        bookDifficulty: "Easy",
        wordsPerPuzzle: 5,
        usedWords,
      });

      for (const word of result.words) {
        expect(usedWords).not.toContain(word);
      }
    });
  });

  describe("mixed-domain mode", () => {
    it("should select words from multiple domains", () => {
      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domains: ["Water Sports", "Combat Sports"],
        mode: "mixed-domain",
        bookDifficulty: "Medium",
        wordsPerPuzzle: 10,
      });

      expect(result.words.length).toBeGreaterThan(0);
      expect(result.mode).toBe("mixed-domain");
      expect(result.domains.length).toBeGreaterThan(0);
    });

    it("should respect difficulty restrictions in mixed mode", () => {
      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domains: ["Water Sports", "Combat Sports"],
        mode: "mixed-domain",
        bookDifficulty: "Easy",
        wordsPerPuzzle: 5,
      });

      // No hard or intermediate words should appear
      const knownHard = ["HYDROFOIL", "DECOMPRESSION", "BRAZILIAN", "JIUJITSU"];
      const knownIntermediate = ["KAYAKER", "SPRINGBOARD", "BOXING", "WRESTLING"];
      for (const word of result.words) {
        expect(knownHard).not.toContain(word);
        expect(knownIntermediate).not.toContain(word);
      }
    });

    it("should only use hard words for Hard difficulty in mixed mode", () => {
      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domains: ["Water Sports", "Combat Sports"],
        mode: "mixed-domain",
        bookDifficulty: "Hard",
        wordsPerPuzzle: 5,
      });

      const knownSimple = ["SWIM", "DIVE", "BOX", "JAB", "PUNCH"];
      const knownIntermediate = ["KAYAKER", "BOXING", "WRESTLING"];
      for (const word of result.words) {
        expect(knownSimple).not.toContain(word);
        expect(knownIntermediate).not.toContain(word);
      }
    });
  });

  describe("difficulty filtering (integration with difficulty-pools)", () => {
    it("SIMPLE book: eligible words = [A] only", () => {
      const pools = getEligibleDifficultyPools("Easy");
      expect(pools).toEqual(["simple"]);
    });

    it("INTERMEDIATE book: eligible words = [A, B]", () => {
      const pools = getEligibleDifficultyPools("Medium");
      expect(pools).toEqual(["simple", "intermediate"]);
    });

    it("HARD book: eligible words = [C] only", () => {
      const pools = getEligibleDifficultyPools("Hard");
      expect(pools).toEqual(["hard"]);
    });
  });

  describe("word shortage handling", () => {
    it("should detect shortage and NOT violate difficulty for Hard book", () => {
      const result = DomainWordSelectionService.selectWords({
        ...baseOptions,
        domain: "Water Sports",
        mode: "single-domain",
        bookDifficulty: "Hard",
        wordsPerPuzzle: 50, // More than available hard words
        maxWordLength: 20,
        gridSize: 25,
      });

      expect(result.shortage).toBe(true);
      // Verify no simple/intermediate words leaked in
      const knownSimple = ["SWIM", "DIVE", "ROW", "BOAT"];
      const knownIntermediate = ["KAYAKER", "SPRINGBOARD", "FREESTYLE"];
      for (const word of result.words) {
        expect(knownSimple).not.toContain(word);
        expect(knownIntermediate).not.toContain(word);
      }
    });
  });
});
