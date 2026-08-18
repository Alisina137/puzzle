import { describe, expect, it } from "vitest";
import { GridUtils } from "../grid-utils";

describe("GridUtils", () => {
  const grid = [
    ["A", "B", "C"],
    ["D", "E", "F"],
    ["G", "H", "I"],
  ];

  describe("isValidPosition", () => {
    it("returns true for a valid position", () => {
      expect(GridUtils.isValidPosition(grid, 1, 1)).toBe(true);
    });

    it("returns false for an invalid row", () => {
      expect(GridUtils.isValidPosition(grid, -1, 1)).toBe(false);
      expect(GridUtils.isValidPosition(grid, 3, 1)).toBe(false);
    });

    it("returns false for an invalid column", () => {
      expect(GridUtils.isValidPosition(grid, 1, -1)).toBe(false);
      expect(GridUtils.isValidPosition(grid, 1, 3)).toBe(false);
    });
  });

  describe("getDimensions", () => {
    it("returns correct dimensions", () => {
      expect(GridUtils.getDimensions(grid)).toEqual({
        rows: 3,
        cols: 3,
      });
    });

    it("handles an empty grid", () => {
      expect(GridUtils.getDimensions([])).toEqual({
        rows: 0,
        cols: 0,
      });
    });
  });

  describe("getNeighbors", () => {
    it("returns all 8 neighbors for a center cell", () => {
      const neighbors = GridUtils.getNeighbors(grid, 1, 1);

      expect(neighbors).toHaveLength(8);
      expect(neighbors).toContainEqual({ row: 0, col: 0 });
      expect(neighbors).toContainEqual({ row: 0, col: 1 });
      expect(neighbors).toContainEqual({ row: 2, col: 2 });
    });

    it("returns only valid neighbors for a corner", () => {
      const neighbors = GridUtils.getNeighbors(grid, 0, 0);

      expect(neighbors).toHaveLength(3);
    });
  });

  describe("getSubgrid", () => {
    it("returns the requested subgrid", () => {
      expect(GridUtils.getSubgrid(grid, 0, 0, 2, 2)).toEqual([
        ["A", "B"],
        ["D", "E"],
      ]);
    });
  });

  describe("isEmpty", () => {
    it("returns true for an empty grid", () => {
      expect(GridUtils.isEmpty([])).toBe(true);
    });

    it("returns true for a grid with an empty first row", () => {
      expect(GridUtils.isEmpty([[]])).toBe(true);
    });

    it("returns false for a populated grid", () => {
      expect(GridUtils.isEmpty(grid)).toBe(false);
    });
  });

  describe("isSquare", () => {
    it("returns true for a square grid", () => {
      expect(GridUtils.isSquare(grid)).toBe(true);
    });

    it("returns false for a non-square grid", () => {
      expect(
        GridUtils.isSquare([
          ["A", "B", "C"],
          ["D", "E", "F"],
        ]),
      ).toBe(false);
    });
  });

  describe("getNonEmptyBounds", () => {
    it("returns the bounds of non-empty cells", () => {
      const testGrid = [
        ["", "", "", ""],
        ["", "A", "B", ""],
        ["", "C", "D", ""],
        ["", "", "", ""],
      ];

      expect(GridUtils.getNonEmptyBounds(testGrid)).toEqual({
        minRow: 1,
        maxRow: 2,
        minCol: 1,
        maxCol: 2,
      });
    });

    it("returns null when the grid is empty", () => {
      expect(
        GridUtils.getNonEmptyBounds([
          ["", ""],
          ["", ""],
        ]),
      ).toBeNull();
    });
  });

  describe("gridToString", () => {
    it("converts a grid to a string", () => {
      expect(GridUtils.gridToString(grid)).toBe("A B C\nD E F\nG H I");
    });
  });

  describe("getRow", () => {
    it("returns a copy of the requested row", () => {
      const row = GridUtils.getRow(grid, 1);

      expect(row).toEqual(["D", "E", "F"]);
      expect(row).not.toBe(grid[1]);
    });

    it("returns an empty array for an invalid row", () => {
      expect(GridUtils.getRow(grid, -1)).toEqual([]);
      expect(GridUtils.getRow(grid, 99)).toEqual([]);
    });
  });

  describe("getColumn", () => {
    it("returns the requested column", () => {
      expect(GridUtils.getColumn(grid, 1)).toEqual(["B", "E", "H"]);
    });
  });

  describe("getWordCapacity", () => {
    it("calculates word capacity", () => {
      expect(GridUtils.getWordCapacity(grid)).toBe(2);
    });
  });

  describe("copyGrid", () => {
    it("creates a deep copy of the grid", () => {
      const copy = GridUtils.copyGrid(grid);

      expect(copy).toEqual(grid);
      expect(copy).not.toBe(grid);
      expect(copy[0]).not.toBe(grid[0]);

      copy[0][0] = "Z";

      expect(grid[0][0]).toBe("A");
    });
  });
});
