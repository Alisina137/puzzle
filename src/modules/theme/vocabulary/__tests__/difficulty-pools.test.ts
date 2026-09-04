import { describe, it, expect } from "vitest";
import { getEligibleDifficultyPools, isPoolEligible } from "../difficulty-pools";

describe("DifficultyPools", () => {
  describe("getEligibleDifficultyPools", () => {
    it("should return only simple for Easy", () => {
      const pools = getEligibleDifficultyPools("Easy");
      expect(pools).toEqual(["simple"]);
    });

    it("should return simple and intermediate for Medium", () => {
      const pools = getEligibleDifficultyPools("Medium");
      expect(pools).toEqual(["simple", "intermediate"]);
    });

    it("should return only hard for Hard", () => {
      const pools = getEligibleDifficultyPools("Hard");
      expect(pools).toEqual(["hard"]);
    });

    it("should return only hard for Expert", () => {
      const pools = getEligibleDifficultyPools("Expert");
      expect(pools).toEqual(["hard"]);
    });

    it("should be case-insensitive", () => {
      expect(getEligibleDifficultyPools("easy")).toEqual(["simple"]);
      expect(getEligibleDifficultyPools("MEDIUM")).toEqual(["simple", "intermediate"]);
      expect(getEligibleDifficultyPools("HARD")).toEqual(["hard"]);
    });

    it("should fall back to simple+intermediate for unknown difficulty", () => {
      const pools = getEligibleDifficultyPools("Unknown");
      expect(pools).toEqual(["simple", "intermediate"]);
    });

    it("should fall back for null/undefined", () => {
      const pools = getEligibleDifficultyPools(null as unknown as string);
      expect(pools).toEqual(["simple", "intermediate"]);
    });
  });

  describe("isPoolEligible", () => {
    it("should allow simple for Easy", () => {
      expect(isPoolEligible("simple", "Easy")).toBe(true);
      expect(isPoolEligible("intermediate", "Easy")).toBe(false);
      expect(isPoolEligible("hard", "Easy")).toBe(false);
    });

    it("should allow simple+intermediate for Medium", () => {
      expect(isPoolEligible("simple", "Medium")).toBe(true);
      expect(isPoolEligible("intermediate", "Medium")).toBe(true);
      expect(isPoolEligible("hard", "Medium")).toBe(false);
    });

    it("should allow only hard for Hard", () => {
      expect(isPoolEligible("simple", "Hard")).toBe(false);
      expect(isPoolEligible("intermediate", "Hard")).toBe(false);
      expect(isPoolEligible("hard", "Hard")).toBe(true);
    });

    it("should allow only hard for Expert", () => {
      expect(isPoolEligible("simple", "Expert")).toBe(false);
      expect(isPoolEligible("intermediate", "Expert")).toBe(false);
      expect(isPoolEligible("hard", "Expert")).toBe(true);
    });
  });
});
