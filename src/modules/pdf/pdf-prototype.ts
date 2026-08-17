import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface PDFPuzzle {
  grid: string[][];
  words: string[];
  number: number;
}

export interface PDFOptions {
  pageSize?: 'A4' | 'Letter';
  margins?: { top: number; bottom: number; left: number; right: number };
  includeSolutions?: boolean;
  fontSize?: number;
}

export class PDFPrototype {
  private static readonly DEFAULT_OPTIONS: PDFOptions = {
    pageSize: 'A4',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
    includeSolutions: true,
    fontSize: 10,
  };

  static generatePrototype(
    puzzles: PDFPuzzle[],
    options: PDFOptions = {}
  ): Buffer {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const doc = new PDFDocument({
      size: opts.pageSize === 'A4' ? 'A4' : 'letter',
      margins: opts.margins,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    // Title page
    doc.fontSize(18).text('Puzzle Book Prototype', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Generated: ' + new Date().toLocaleDateString(), { align: 'center' });
    doc.moveDown();
    doc.text('This is a prototype to validate puzzle page layout and KDP formatting.', { align: 'center' });
    doc.addPage();

    // Puzzle pages
    for (const puzzle of puzzles) {
      this.renderPuzzle(doc, puzzle, opts);
      doc.addPage();
    }

    // Solutions page
    if (opts.includeSolutions) {
      doc.fontSize(16).text('Solutions', { align: 'center' });
      doc.moveDown();
      for (const puzzle of puzzles) {
        doc.fontSize(10).text('Puzzle #' + puzzle.number + ': ' + puzzle.words.join(', '));
        doc.moveDown(0.5);
      }
    }

    doc.end();

    return Buffer.concat(buffers);
  }

  private static renderPuzzle(
    doc: PDFKit.PDFDocument,
    puzzle: PDFPuzzle,
    options: PDFOptions
  ): void {
    const { grid, number, words } = puzzle;
    const cellSize = this.calculateCellSize(doc, grid.length);

    // Puzzle header
    doc.fontSize(14).text('Puzzle #' + number, { align: 'center' });
    doc.moveDown(0.5);

    // Word list
    doc.fontSize(8).text('Words to find: ' + words.join(', '), { align: 'center' });
    doc.moveDown(0.5);

    // Draw grid
    const startX = (doc.page.width - (grid[0].length * cellSize)) / 2;
    const startY = doc.y + 20;

    // Draw grid lines and letters
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const x = startX + j * cellSize;
        const y = startY + i * cellSize;

        // Draw cell border
        doc.rect(x, y, cellSize, cellSize).stroke();

        // Draw letter
        if (grid[i][j] !== '') {
          doc.fontSize(options.fontSize || 10);
          doc.text(grid[i][j], x + cellSize / 2 - 4, y + cellSize / 2 - 6);
        }
      }
    }

    // Move cursor past the grid
    doc.y = startY + grid.length * cellSize + 40;
  }

  private static calculateCellSize(doc: PDFKit.PDFDocument, gridSize: number): number {
    const maxWidth = doc.page.width - 144;
    const maxHeight = doc.page.height - 300;
    const sizeByWidth = maxWidth / gridSize;
    const sizeByHeight = maxHeight / gridSize;
    return Math.min(sizeByWidth, sizeByHeight, 30);
  }

  static savePrototype(
    puzzles: PDFPuzzle[],
    filePath: string,
    options: PDFOptions = {}
  ): void {
    const buffer = this.generatePrototype(puzzles, options);
    fs.writeFileSync(filePath, buffer);
    console.log('PDF saved to: ' + filePath);
  }
}