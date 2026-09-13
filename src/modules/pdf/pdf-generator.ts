import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import path from "path";

export interface PDFOptions {
  pageSize?: "A4" | "Letter";
  includeSolutions?: boolean;
  solutionPlacement?: "back" | "after";
  fontSize?: number;
  fontName?: string;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface PDFResult {
  buffer: Buffer;
  pageCount: number;
}

interface DirectionVector {
  dr: number;
  dc: number;
}

interface NormalizedPlacedWord {
  word: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  direction: DirectionVector;
  directionName: string;
}

interface WordFlowItem {
  word: string;
  label: string;
  info: NormalizedPlacedWord | undefined;
  x: number;
  row: number;
  color: string;
  maxWidth: number; // this item's safe text width, given its column's width
}

export class PDFGenerator {
  private static readonly DEFAULT_OPTIONS: Required<
    Omit<PDFOptions, "margins">
  > & {
    margins: Required<NonNullable<PDFOptions["margins"]>>;
  } = {
    pageSize: "A4",
    includeSolutions: true,
    solutionPlacement: "back",
    fontSize: 10,
    fontName: "Helvetica",
    margins: {
      top: 54,
      bottom: 54,
      left: 54,
      right: 54,
    },
  };

  private static readonly GUTTER_TABLE: Array<{
    maxPages: number;
    gutterIn: number;
  }> = [
    { maxPages: 150, gutterIn: 0.375 },
    { maxPages: 300, gutterIn: 0.5 },
    { maxPages: 500, gutterIn: 0.625 },
    { maxPages: 700, gutterIn: 0.75 },
    { maxPages: 828, gutterIn: 0.875 },
  ];

  private static addTitlePage(doc: PDFKit.PDFDocument, book: any): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerY = pageHeight / 2;

    // Keep the title inside comfortable side margins and let it wrap /
    // shrink rather than overflow. See fitTitleFontSize for why this is
    // needed: a fixed font size only "happens" to work for short titles.
    const sidePadding = 60;
    const maxTitleWidth = Math.max(100, pageWidth - sidePadding * 2);

    const title = this.safeText(book.title);
    const titleFit = this.fitTitleFontSize(
      doc,
      title,
      maxTitleWidth,
      pageHeight * 0.3,
      28,
      14,
      "Helvetica-Bold",
    );

    const titleY = centerY - 60 - titleFit.height / 2;

    doc
      .fontSize(titleFit.fontSize)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(title, sidePadding, titleY, {
        align: "center",
        width: maxTitleWidth,
      });

    const subtitleY = titleY + titleFit.height + 15;

    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#555")
      .text("Word Search Puzzle Book", 0, subtitleY, {
        align: "center",
        width: pageWidth,
      });

    if (book.subtitle) {
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#777")
        .text(this.safeText(book.subtitle), 0, subtitleY + 30, {
          align: "center",
          width: pageWidth,
        });
    }

    // Intentionally minimal — no border, icon, or metadata block.
    // This is the plain title page; decorative branding lives on the
    // interior cover page that follows.
  }

  private static buildTocEntries(
    book: any,
    opts: any,
    frontMatterPageCount: number,
  ): Array<{ label: string; page: number }> {
    const entries: Array<{ label: string; page: number }> = [];
    const puzzleCount = book.bookPuzzles.length;
    const puzzlesStartPage = frontMatterPageCount + 1;

    entries.push({
      label: puzzleCount > 1 ? `Puzzles 1-${puzzleCount}` : "Puzzle 1",
      page: puzzlesStartPage,
    });

    if (opts.includeSolutions) {
      if (opts.solutionPlacement === "back") {
        const solutionsStartPage = puzzlesStartPage + puzzleCount;
        entries.push({ label: "Solutions", page: solutionsStartPage });
      } else {
        // "after" placement interleaves a solution page right after each
        // puzzle page, so there's no single distinct solutions section.
        entries.push({
          label: "Solutions (follow each puzzle)",
          page: puzzlesStartPage + 1,
        });
      }
    }

    return entries;
  }

  private static computeBookStats(bookPuzzles: any[]): {
    directionsUsed: string[];
    minWordsPerPuzzle: number;
    maxWordsPerPuzzle: number;
  } {
    const directionSet = new Set<string>();
    let minWords = Infinity;
    let maxWords = 0;

    for (const bp of bookPuzzles) {
      const puzzleData = bp.puzzle?.data as any;
      const words = Array.isArray(puzzleData?.words) ? puzzleData.words : [];
      const placedWords = Array.isArray(puzzleData?.placedWords)
        ? puzzleData.placedWords
        : [];

      if (words.length > 0) {
        minWords = Math.min(minWords, words.length);
        maxWords = Math.max(maxWords, words.length);
      }

      for (const pw of placedWords) {
        const name = String(pw?.direction?.name || "").toLowerCase();
        if (name) directionSet.add(name);
      }
    }

    const directionLabels: Record<string, string> = {
      right: "Horizontal",
      left: "Horizontal",
      down: "Vertical",
      up: "Vertical",
      "down-right": "Diagonal",
      "up-left": "Diagonal",
      "down-left": "Diagonal",
      "up-right": "Diagonal",
    };

    const categories = new Set<string>();
    for (const dir of directionSet) {
      if (directionLabels[dir]) categories.add(directionLabels[dir]);
    }

    return {
      directionsUsed: Array.from(categories).sort(),
      minWordsPerPuzzle: minWords === Infinity ? 0 : minWords,
      maxWordsPerPuzzle: maxWords,
    };
  }

  private static addBookInfoPage(
    doc: PDFKit.PDFDocument,
    book: any,
    stats: {
      directionsUsed: string[];
      minWordsPerPuzzle: number;
      maxWordsPerPuzzle: number;
    },
  ): void {
    const pageWidth = doc.page.width;
    const margin = doc.page.margins.left;
    const contentWidth =
      pageWidth - doc.page.margins.left - doc.page.margins.right;
    const centerX = pageWidth / 2;

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text("About This Book", 0, 55, {
        align: "center",
        width: pageWidth,
      });

    doc
      .moveTo(centerX - 60, 82)
      .lineTo(centerX + 60, 82)
      .strokeColor("#4a4a6a")
      .lineWidth(1)
      .stroke();

    const wordRangeText =
      stats.minWordsPerPuzzle === stats.maxWordsPerPuzzle
        ? `${stats.minWordsPerPuzzle}`
        : `${stats.minWordsPerPuzzle} - ${stats.maxWordsPerPuzzle}`;

    const rows: Array<[string, string]> = [
      ["Title", this.safeText(book.title)],
      ["Theme", this.safeText(book.theme)],
      ["Target Audience", this.safeText(book.targetAudience || "General")],
      ["Difficulty Level", this.safeText(book.difficultyLevel || "Medium")],
      ["Total Puzzles", String(book.bookPuzzles.length)],
      [
        "Directions Used",
        stats.directionsUsed.length > 0
          ? stats.directionsUsed.join(", ")
          : "N/A",
      ],
      ["Words Per Puzzle", wordRangeText],
    ];

    const labelWidth = contentWidth * 0.4;
    const valueWidth = contentWidth - labelWidth - 12;
    const baseRowHeight = 34;

    // Row heights are no longer a fixed 34pt. Long values — most often
    // the book Title or Theme, which can be arbitrarily long strings of
    // comma-joined subthemes — can wrap to 2+ lines at 11pt inside
    // valueWidth. A fixed row height caused wrapped text to run straight
    // through the divider line and into the next row. Each row now
    // reserves however much height its own value actually needs.
    doc.fontSize(11).font("Helvetica");
    const rowHeights = rows.map(([, value]) => {
      const textHeight = doc.heightOfString(value, { width: valueWidth });
      return Math.max(baseRowHeight, textHeight + 20);
    });
    const blockHeight = rowHeights.reduce((sum, h) => sum + h, 0);

    // Vertically center the info block in the space below the header
    // instead of anchoring it at a fixed y=130. On trims like 8.25x11 the
    // 7-row table only used ~35% of the page height, leaving a large,
    // unintentional-looking dead zone below it (see review point 1.5).
    const headerBottom = 100;
    const footerZone = 40;
    const availableHeight =
      doc.page.height - doc.page.margins.bottom - footerZone - headerBottom;
    let y = headerBottom + Math.max(0, (availableHeight - blockHeight) / 2);

    rows.forEach(([label, value], index) => {
      const rowHeight = rowHeights[index];

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#555")
        .text(label, margin, y, { width: labelWidth, lineBreak: false });

      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#1a1a2e")
        .text(value, margin + labelWidth + 12, y, {
          width: valueWidth,
          lineBreak: true,
        });

      doc
        .moveTo(margin, y + rowHeight - 10)
        .lineTo(margin + contentWidth, y + rowHeight - 10)
        .strokeColor("#e5e5e5")
        .lineWidth(0.5)
        .stroke();

      y += rowHeight;
    });

    // ✅ Page number is added in the main loop, not here
  }

  private static addTableOfContentsPage(
    doc: PDFKit.PDFDocument,
    entries: Array<{ label: string; page: number }>,
  ): void {
    const pageWidth = doc.page.width;
    const margin = doc.page.margins.left;
    const contentWidth =
      pageWidth - doc.page.margins.left - doc.page.margins.right;

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text("Table of Contents", margin, 50, {
        width: contentWidth,
        align: "left",
      });

    doc
      .moveTo(margin, 78)
      .lineTo(margin + 80, 78)
      .strokeColor("#4a4a6a")
      .lineWidth(1.5)
      .stroke();

    let y = 105;
    const rowHeight = 24;

    doc.fontSize(11).font("Helvetica").fillColor("#333");

    for (const entry of entries) {
      const pageLabel = String(entry.page);
      const labelWidth = doc.widthOfString(entry.label);
      const pageLabelWidth = doc.widthOfString(pageLabel);

      doc.text(entry.label, margin, y, { lineBreak: false });

      // Dot leader between label and page number
      const dotsStartX = margin + labelWidth + 6;
      const dotsEndX = margin + contentWidth - pageLabelWidth - 6;
      if (dotsEndX > dotsStartX) {
        doc
          .fontSize(11)
          .fillColor("#999")
          .text(
            ".".repeat(Math.max(0, Math.floor((dotsEndX - dotsStartX) / 4))),
            dotsStartX,
            y,
            { lineBreak: false },
          );
      }

      doc
        .fontSize(11)
        .fillColor("#333")
        .text(pageLabel, margin + contentWidth - pageLabelWidth, y, {
          lineBreak: false,
        });

      y += rowHeight;
    }
  }

  private static getGutterPoints(estimatedPageCount: number): number {
    const IN_TO_PT = 72;
    for (const tier of this.GUTTER_TABLE) {
      if (estimatedPageCount <= tier.maxPages) {
        return tier.gutterIn * IN_TO_PT;
      }
    }
    // Beyond KDP's 828-page ceiling, hold at the largest defined gutter
    return this.GUTTER_TABLE[this.GUTTER_TABLE.length - 1].gutterIn * IN_TO_PT;
  }

  /**
   * Mirrored margins: odd pages are right-hand (recto) — spine is on their
   * LEFT edge, so the gutter goes into the left margin. Even pages are
   * left-hand (verso) — spine is on their RIGHT edge, gutter goes right.
   */
  private static getPageMargins(
    pageNumber: number,
    baseMargins: { top: number; bottom: number; left: number; right: number },
    gutter: number,
  ): { top: number; bottom: number; left: number; right: number } {
    const isRightHandPage = pageNumber % 2 === 1;
    if (isRightHandPage) {
      return {
        top: baseMargins.top,
        bottom: baseMargins.bottom,
        left: baseMargins.left + gutter,
        right: baseMargins.right,
      };
    }
    return {
      top: baseMargins.top,
      bottom: baseMargins.bottom,
      left: baseMargins.left,
      right: baseMargins.right + gutter,
    };
  }

  /**
   * Mirrors the pagination logic inside addSolutionsPages WITHOUT drawing,
   * so we can know the solutions section's page count in advance for gutter
   * sizing. Keep this in sync if addSolutionsPages' packing logic changes.
   */
  private static estimateSolutionsPageCount(bookPuzzles: any[]): number {
    const LARGE_GRID_THRESHOLD = 18;
    let pageCount = 0;
    let slot = 0;
    let currentLayout: "small" | "large" | null = null;
    let pageStarted = false;

    for (let i = 0; i < bookPuzzles.length; i++) {
      const puzzleData = bookPuzzles[i].puzzle?.data as any;
      const gridSize = Array.isArray(puzzleData?.grid)
        ? puzzleData.grid.length
        : 0;
      const layout: "small" | "large" =
        gridSize > LARGE_GRID_THRESHOLD ? "large" : "small";
      const perPage = layout === "small" ? 4 : 2;

      const needsNewPage =
        !pageStarted || layout !== currentLayout || slot >= perPage;

      if (needsNewPage) {
        pageCount++;
        pageStarted = true;
        currentLayout = layout;
        slot = 0;
      }
      slot++;
    }

    return pageCount;
  }

  private static readonly TRIM_SIZES: Record<string, [number, number]> = {
    "5x8": [360, 576],
    "5.25x8": [378, 576],
    "5.5x8.5": [396, 612],
    "6x9": [432, 648],
    "7x10": [504, 720],
    "8.25x11": [594, 792],
    "8.5x11": [612, 792],
    A4: [595.28, 841.89],
    LETTER: [612, 792],
    Letter: [612, 792],
  };

  private static recommendTrimSize(maxGridSize: number): string {
    // Grids up to 15x15 use the compact 6x9 trim with the 4-per-page mini
    // solution layout. Everything above that (16x16 and up, including
    // beyond 24x24) uses 8.25x11 — but 16-18 still use the 4-per-page mini
    // solution layout despite the bigger trim; only 19+ switches to the
    // 2-per-page large layout. See LARGE_GRID_THRESHOLD in
    // addSolutionsPages and estimateSolutionsPageCount below.
    if (maxGridSize <= 15) return "6x9";
    return "8.5x11";
  }

  private static getPageSize(trimSize: string): [number, number] {
    return this.TRIM_SIZES[trimSize] || this.TRIM_SIZES["6x9"];
  }

  private static safeText(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    let text = String(value);

    text = text
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, "-")
      .replace(/…/g, "...")
      .replace(/\u00a0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // Remove non-printable characters
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");

    return text;
  }

  /**
   * Shrinks a single-line label to fit maxWidth, stepping fontSize down in
   * 0.3pt increments before falling back to an ellipsis truncation.
   *
   * Why this exists: word-list rows were rendered with a fixed font size
   * and `lineBreak: false`. That's fine for typical words, but long
   * theme words (e.g. "WOMENSWORLDCUP", "SIGNALIDUNAPARK") could still
   * overflow the column — either wrapping onto (and colliding with) the
   * row below, or bleeding horizontally into the grid/next column,
   * depending on the PDFKit code path taken. Measuring and shrinking
   * per-item guarantees the row always stays inside its own box.
   */
  private static fitTextToWidth(
    doc: PDFKit.PDFDocument,
    text: string,
    maxWidth: number,
    startFontSize: number,
    minFontSize: number,
    font = "Helvetica",
  ): { fontSize: number; text: string } {
    let fontSize = startFontSize;
    doc.font(font).fontSize(fontSize);

    while (fontSize > minFontSize && doc.widthOfString(text) > maxWidth) {
      fontSize = Math.max(minFontSize, fontSize - 0.3);
      doc.fontSize(fontSize);
    }

    let renderText = text;
    if (doc.widthOfString(renderText) > maxWidth) {
      // Still doesn't fit even at the font-size floor — truncate with an
      // ellipsis rather than let it wrap or overflow into neighboring
      // content. This should be rare; it's a last-resort safety net.
      while (
        renderText.length > 3 &&
        doc.widthOfString(renderText + "…") > maxWidth
      ) {
        renderText = renderText.slice(0, -1);
      }
      renderText = renderText + "…";
    }

    return { fontSize: Math.round(fontSize * 10) / 10, text: renderText };
  }

  /**
   * Finds the largest font size (within [minFontSize, startFontSize], in
   * 1pt steps) at which `text`, WRAPPED to `maxWidth`, fits inside
   * `maxHeight` — measured with the real PDFKit line-wrapping via
   * doc.heightOfString, not estimated.
   *
   * This is the headline counterpart to fitTextToWidth: fitTextToWidth is
   * for single-line list rows where truncating with an ellipsis is an
   * acceptable last resort. A book title should never be silently
   * truncated, so this instead lets it wrap across multiple lines and
   * only shrinks the font size — the caller is responsible for reserving
   * enough vertical room (or reflowing what comes after it) based on the
   * returned `height`.
   *
   * This directly fixes the interior cover page (and title/copyright
   * pages) rendering titles at a fixed font size with no regard for
   * their actual length: short titles happened to fit, longer ones
   * overflowed the decorative border and collided with the subtitle.
   */
  private static fitTitleFontSize(
    doc: PDFKit.PDFDocument,
    text: string,
    maxWidth: number,
    maxHeight: number,
    startFontSize: number,
    minFontSize: number,
    font = "Helvetica-Bold",
  ): { fontSize: number; height: number } {
    doc.font(font);
    let fontSize = startFontSize;

    while (fontSize > minFontSize) {
      doc.fontSize(fontSize);
      const height = doc.heightOfString(text, {
        width: maxWidth,
        align: "center",
      });
      if (height <= maxHeight) {
        return { fontSize, height };
      }
      fontSize -= 1;
    }

    // Floor reached — accept whatever height results rather than shrink
    // indefinitely. Callers size their layout with generous headroom, so
    // this only bites for pathologically long titles.
    doc.fontSize(minFontSize);
    const height = doc.heightOfString(text, {
      width: maxWidth,
      align: "center",
    });
    return { fontSize: minFontSize, height };
  }

  private static getDirectionVector(direction: unknown): DirectionVector {
    if (direction && typeof direction === "object") {
      const value = direction as { dr?: unknown; dc?: unknown };
      const dr = typeof value.dr === "number" ? value.dr : Number(value.dr);
      const dc = typeof value.dc === "number" ? value.dc : Number(value.dc);

      if (
        Number.isFinite(dr) &&
        Number.isFinite(dc) &&
        (dr !== 0 || dc !== 0)
      ) {
        return { dr, dc };
      }
    }

    if (typeof direction === "string") {
      const normalized = direction.trim().toLowerCase();
      const map: Record<string, DirectionVector> = {
        right: { dr: 0, dc: 1 },
        left: { dr: 0, dc: -1 },
        down: { dr: 1, dc: 0 },
        up: { dr: -1, dc: 0 },
        "down-right": { dr: 1, dc: 1 },
        "up-left": { dr: -1, dc: -1 },
        "down-left": { dr: 1, dc: -1 },
        "up-right": { dr: -1, dc: 1 },
      };
      if (map[normalized]) {
        return map[normalized];
      }
    }

    return { dr: 0, dc: 1 };
  }

  private static getDirectionName(
    direction: unknown,
    vector: DirectionVector,
  ): string {
    if (typeof direction === "string") {
      const normalized = direction.trim().toLowerCase();
      const validNames = new Set([
        "right",
        "left",
        "down",
        "up",
        "down-right",
        "up-left",
        "down-left",
        "up-right",
      ]);
      if (validNames.has(normalized)) {
        return normalized;
      }
    }

    const names: Record<string, string> = {
      "0,1": "right",
      "0,-1": "left",
      "1,0": "down",
      "-1,0": "up",
      "1,1": "down-right",
      "-1,-1": "up-left",
      "1,-1": "down-left",
      "-1,1": "up-right",
    };
    return names[`${vector.dr},${vector.dc}`] || "right";
  }

  private static normalizePlacedWord(placedWord: any): NormalizedPlacedWord {
    const word = this.safeText(placedWord?.word || "");
    const startRow = Number(placedWord?.row ?? placedWord?.startRow ?? 0);
    const startCol = Number(placedWord?.col ?? placedWord?.startCol ?? 0);
    const directionValue = placedWord?.direction;
    const direction = this.getDirectionVector(directionValue);
    const directionName = this.getDirectionName(directionValue, direction);
    const endRow = startRow + direction.dr * Math.max(0, word.length - 1);
    const endCol = startCol + direction.dc * Math.max(0, word.length - 1);

    return {
      word,
      startRow,
      startCol,
      endRow,
      endCol,
      direction,
      directionName,
    };
  }

  private static getDirectionLabel(directionName: string): string {
    const labels: Record<string, string> = {
      right: "Horizontal Right",
      left: "Horizontal Left",
      down: "Vertical Down",
      up: "Vertical Up",
      "down-right": "Diagonal Down-Right",
      "up-left": "Diagonal Up-Left",
      "down-left": "Diagonal Down-Left",
      "up-right": "Diagonal Up-Right",
    };
    return labels[directionName] || "Horizontal Right";
  }

  static async generateBookPDF(
    bookId: string,
    options: PDFOptions = {},
  ): Promise<PDFResult> {
    const opts = {
      ...this.DEFAULT_OPTIONS,
      ...options,
      margins: {
        ...this.DEFAULT_OPTIONS.margins,
        ...(options.margins ?? {}),
      },
    };

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        bookPuzzles: {
          include: {
            puzzle: true,
            puzzleVersion: true,
            solution: true,
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!book) {
      throw new Error("Book not found");
    }

    const generationSettings = (book.generationSettings as any) || {};

    const maxGridSize = Math.max(
      ...book.bookPuzzles.map((bp: any) => {
        const g = (bp.puzzle?.data as any)?.grid;
        return Array.isArray(g) ? g.length : 0;
      }),
      0,
    );
    const recommendedTrim = this.recommendTrimSize(maxGridSize);
    const requestedTrim = generationSettings.trimSize || "6x9";
    const trimRank = [
      "5x8",
      "5.25x8",
      "5.5x8.5",
      "6x9",
      "7x10",
      "8.25x11",
      "8.5x11",
      "A4",
      "LETTER",
      "Letter",
    ];
    const requestedRank = trimRank.indexOf(requestedTrim);
    const recommendedRank = trimRank.indexOf(recommendedTrim);
    const finalTrim =
      requestedRank !== -1 && requestedRank < recommendedRank
        ? recommendedTrim
        : requestedTrim;
    const pageSize = this.getPageSize(finalTrim);

    const FRONT_MATTER_PAGE_COUNT = 5; // cover, copyright, book info, instructions, TOC

    const solutionsAfterCount =
      opts.includeSolutions && opts.solutionPlacement === "after"
        ? book.bookPuzzles.length
        : 0;
    const solutionsBackCount =
      opts.includeSolutions && opts.solutionPlacement === "back"
        ? this.estimateSolutionsPageCount(book.bookPuzzles)
        : 0;

    let estimatedTotalPages =
      FRONT_MATTER_PAGE_COUNT +
      book.bookPuzzles.length +
      solutionsAfterCount +
      solutionsBackCount;
    if (estimatedTotalPages % 2 !== 0) estimatedTotalPages++;

    const initialGutter = this.getGutterPoints(estimatedTotalPages);
    const baseMargins = opts.margins;

    let renderResult = await this.renderPdfWithGutter(
      book,
      opts,
      pageSize,
      baseMargins,
      initialGutter,
    );

    // The gutter above was picked from an ESTIMATE computed before
    // rendering. If reality lands on the other side of a tier boundary
    // (e.g. estimated 149 pages but the real render comes out to 151+),
    // the smaller gutter would already be baked into the file — exactly
    // what triggers KDP's "insufficient gutter" warning. Checking the
    // gutter table against the ACTUAL rendered page count and
    // re-rendering once if they disagree guarantees correctness
    // regardless of any drift in the estimate.
    const correctedGutter = this.getGutterPoints(renderResult.pageCount);
    if (correctedGutter !== initialGutter) {
      console.warn(
        `[PDFGenerator] Gutter mismatch: estimated ${estimatedTotalPages} pages ` +
          `(gutter ${initialGutter}pt) but actually rendered ${renderResult.pageCount} pages ` +
          `(requires ${correctedGutter}pt). Re-rendering with the corrected gutter.`,
      );
      renderResult = await this.renderPdfWithGutter(
        book,
        opts,
        pageSize,
        baseMargins,
        correctedGutter,
      );
    }

    return renderResult;
  }

  private static async renderPdfWithGutter(
    book: any,
    opts: any,
    pageSize: [number, number],
    baseMargins: { top: number; bottom: number; left: number; right: number },
    gutter: number,
  ): Promise<PDFResult> {
    const doc = new PDFDocument({
      size: pageSize,
      autoFirstPage: false,
      info: {
        Title: this.safeText(book.title),
        Author: "Puzzle Book Generator",
        Subject: `${book.puzzleCount} Word Search Puzzles`,
      },
    });
    this.registerFonts(doc);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    let pageCount = 0;
    const bookTitle = this.safeText(book.title);

    // ==========================================================
    // PAGE 1: Interior Cover
    // ==========================================================
    pageCount = 1;
    doc.addPage({
      size: pageSize,
      margins: this.getPageMargins(pageCount, baseMargins, gutter),
    });
    this.addInteriorCoverPage(doc, book);
    this.addPageNumber(doc, "1", doc.page.width, doc.page.height);

    // ==========================================================
    // PAGE 2: Copyright
    // ==========================================================
    pageCount = 2;
    doc.addPage({
      size: pageSize,
      margins: this.getPageMargins(pageCount, baseMargins, gutter),
    });
    this.addCopyrightPage(doc, book, pageCount);
    this.addPageNumber(doc, "2", doc.page.width, doc.page.height);

    // ==========================================================
    // PAGE 3: Book Info (theme, audience, difficulty, stats)
    // ==========================================================
    pageCount = 3;
    doc.addPage({
      size: pageSize,
      margins: this.getPageMargins(pageCount, baseMargins, gutter),
    });
    const bookStats = this.computeBookStats(book.bookPuzzles);
    this.addBookInfoPage(doc, book, bookStats);
    this.addPageNumber(doc, "3", doc.page.width, doc.page.height);

    // ==========================================================
    // PAGE 4: Instructions
    // ==========================================================
    pageCount = 4;
    doc.addPage({
      size: pageSize,
      margins: this.getPageMargins(pageCount, baseMargins, gutter),
    });
    this.addInstructionsPage(doc, pageCount);
    this.addPageNumber(doc, "4", doc.page.width, doc.page.height);

    // ==========================================================
    // PAGE 5: Table of Contents
    // ==========================================================
    pageCount = 5;
    doc.addPage({
      size: pageSize,
      margins: this.getPageMargins(pageCount, baseMargins, gutter),
    });
    const tocEntries = this.buildTocEntries(book, opts, 5);
    this.addTableOfContentsPage(doc, tocEntries);
    this.addPageNumber(doc, "5", doc.page.width, doc.page.height);

    // ==========================================================
    // PAGES 6+: Puzzles
    // ==========================================================

    for (let i = 0; i < book.bookPuzzles.length; i++) {
      const bookPuzzle = book.bookPuzzles[i];

      pageCount++;
      doc.addPage({
        size: pageSize,
        margins: this.getPageMargins(pageCount, baseMargins, gutter),
      });

      this.addPuzzlePage(
        doc,
        bookPuzzle,
        bookPuzzle.displayNumber,
        opts,
        pageCount,
      );
      this.addRunningHeader(
        doc,
        pageCount,
        bookTitle,
        `Puzzle #${bookPuzzle.displayNumber}`,
      );
      this.addPageNumber(
        doc,
        String(pageCount),
        doc.page.width,
        doc.page.height,
      );

      if (opts.includeSolutions && opts.solutionPlacement === "after") {
        pageCount++;
        doc.addPage({
          size: pageSize,
          margins: this.getPageMargins(pageCount, baseMargins, gutter),
        });
        this.addSingleSolutionPage(doc, bookPuzzle, pageCount);
        this.addRunningHeader(
          doc,
          pageCount,
          bookTitle,
          `Solution #${bookPuzzle.displayNumber}`,
        );
        this.addPageNumber(
          doc,
          String(pageCount),
          doc.page.width,
          doc.page.height,
        );
      }
    }

    // ==========================================================
    // SOLUTIONS AT BACK
    // ==========================================================

    if (opts.includeSolutions && opts.solutionPlacement === "back") {
      pageCount++;
      doc.addPage({
        size: pageSize,
        margins: this.getPageMargins(pageCount, baseMargins, gutter),
      });
      const { lastPageNumber } = this.addSolutionsPages(
        doc,
        book.bookPuzzles,
        pageCount,
        pageSize,
        baseMargins,
        gutter,
        bookTitle,
      );
      pageCount = lastPageNumber;
    }

    // ==========================================================
    // ENSURE EVEN PAGE COUNT (must be last, before doc.end())
    // ==========================================================
    if (pageCount % 2 !== 0) {
      pageCount++;
      doc.addPage({
        size: pageSize,
        margins: this.getPageMargins(pageCount, baseMargins, gutter),
      });
      this.addBlankFillerPage(doc, pageCount);
      this.addPageNumber(
        doc,
        String(pageCount),
        doc.page.width,
        doc.page.height,
      );
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, pageCount });
      });
      doc.on("error", reject);
    });
  }

  private static registerFonts(doc: PDFKit.PDFDocument): void {
    const fontDir = path.join(process.cwd(), "fonts");
    const fontsToRegister: Array<[string, string]> = [
      ["Helvetica", "LiberationSans-Regular.ttf"],
      ["Helvetica-Bold", "LiberationSans-Bold.ttf"],
    ];

    for (const [name, filename] of fontsToRegister) {
      const fontPath = path.join(fontDir, filename);
      try {
        doc.registerFont(name, fontPath);
      } catch (err) {
        // Falls back to PDFKit's built-in (non-embedded) standard font
        // rather than crashing the whole export. KDP will re-flag the
        // "fonts not embedded" warning in this case, but the book still
        // generates — better than a hard failure on every export.
        console.warn(
          `[PDFGenerator] Could not load font file at ${fontPath}. ` +
            `Falling back to built-in "${name}" (will not be embedded). ` +
            `Error: ${(err as Error).message}`,
        );
      }
    }
  }

  // ==========================================================
  // COVER
  // ==========================================================

  private static addInteriorCoverPage(
    doc: PDFKit.PDFDocument,
    book: any,
  ): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;

    this.drawDecorativeBorder(doc, pageWidth, pageHeight);

    // ── Layout is now computed top-down from real measurements instead
    // of fixed offsets from centerY. Previously the title rendered at a
    // hard-coded 34pt regardless of length: short titles like
    // "adult, expert, mix" happened to fit, but anything longer ran past
    // the decorative border and/or collided with the subtitle line,
    // which sat at a fixed centerY - 40 no matter how tall the title
    // actually rendered. Flowing everything downward from the icon, and
    // sizing the title with fitTitleFontSize, fixes both. ──

    const sidePadding = 70; // stay well inside drawDecorativeBorder's frame
    const maxTitleWidth = Math.max(100, pageWidth - sidePadding * 2);

    const iconY = pageHeight * 0.2;
    this.drawPuzzleIcon(doc, centerX, iconY);

    const topDividerY = iconY + 55;
    doc
      .moveTo(centerX - 80, topDividerY)
      .lineTo(centerX + 80, topDividerY)
      .strokeColor("#4a4a6a")
      .lineWidth(2)
      .stroke();

    const title = this.safeText(book.title);

    // Reserve a generous vertical band for the title so it can wrap to
    // 2-3 lines and shrink gracefully instead of overflowing.
    const maxTitleHeight = pageHeight * 0.28;
    const titleFit = this.fitTitleFontSize(
      doc,
      title,
      maxTitleWidth,
      maxTitleHeight,
      34,
      15,
      "Helvetica-Bold",
    );

    const titleY = topDividerY + 30;

    doc
      .fontSize(titleFit.fontSize)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(title, sidePadding, titleY, {
        align: "center",
        width: maxTitleWidth,
      });

    const subtitleY = titleY + titleFit.height + 20;

    doc
      .fontSize(18)
      .font("Helvetica")
      .fillColor("#4a4a6a")
      .text("Word Search Puzzle Book", 0, subtitleY, {
        align: "center",
        width: pageWidth,
      });

    const bottomDividerY = subtitleY + 38;
    doc
      .moveTo(centerX - 120, bottomDividerY)
      .lineTo(centerX + 120, bottomDividerY)
      .strokeColor("#4a4a6a")
      .lineWidth(1.5)
      .stroke();

    // ✅ Page number is added in the main loop, not here
  }

  private static drawPuzzleIcon(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
  ): void {
    const size = 50;
    const gap = 4;
    const cellSize = (size - gap * 3) / 4;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cx = x - size / 2 + c * (cellSize + gap) + gap / 2;
        const cy = y + r * (cellSize + gap) + gap / 2;
        const isDark = (r + c) % 2 === 0;

        doc
          .rect(cx, cy, cellSize, cellSize)
          .fill(isDark ? "#4a4a6a" : "#e8e8e8");

        doc
          .rect(cx, cy, cellSize, cellSize)
          .strokeColor("#cccccc")
          .lineWidth(0.5)
          .stroke();
      }
    }
  }

  // ==========================================================
  // COPYRIGHT
  // ==========================================================

  private static addCopyrightPage(
    doc: PDFKit.PDFDocument,
    book: any,
    pageNumber: number,
  ): void {
    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;
    const sidePadding = 60;
    const maxTitleWidth = Math.max(100, pageWidth - sidePadding * 2);

    doc
      .moveTo(centerX - 60, 80)
      .lineTo(centerX + 60, 80)
      .strokeColor("#4a4a6a")
      .lineWidth(1)
      .stroke();

    const title = this.safeText(book.title);

    // Was a fixed 14pt with only a ~30pt gap before the subtitle line —
    // a title that wrapped to 2 lines at 14pt (height ~34pt) would run
    // straight into it. Now measured and the subtitle/copyright block
    // flows below whatever height the title actually needs.
    const titleFit = this.fitTitleFontSize(
      doc,
      title,
      maxTitleWidth,
      90,
      14,
      9,
      "Helvetica-Bold",
    );

    const titleY = 120;

    doc
      .fontSize(titleFit.fontSize)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(title, sidePadding, titleY, {
        align: "center",
        width: maxTitleWidth,
      });

    const subtitleY = titleY + titleFit.height + 12;

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666")
      .text("Word Search Puzzle Book", 0, subtitleY, {
        align: "center",
        width: pageWidth,
      });

    // Keep the original ~220pt anchor as a floor for short (single-line)
    // titles, so the page's overall look doesn't shift for the common
    // case — it only moves down further when a long title needed it.
    const copyrightY = Math.max(220, subtitleY + 40);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#444")
      .text(`Copyright (c) ${new Date().getFullYear()}`, 0, copyrightY, {
        align: "center",
        width: pageWidth,
      });

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#444")
      .text("All rights reserved.", 0, copyrightY + 20, {
        align: "center",
        width: pageWidth,
      });

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666")
      .text(
        "No part of this book may be reproduced, stored in a retrieval system,",
        0,
        copyrightY + 55,
        { align: "center", width: pageWidth },
      );

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666")
      .text(
        "or transmitted in any form or by any means, without the prior written permission",
        0,
        copyrightY + 70,
        { align: "center", width: pageWidth },
      );

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666")
      .text(
        "of the author, except in the case of brief quotations in reviews.",
        0,
        copyrightY + 85,
        { align: "center", width: pageWidth },
      );

    // ✅ Page number is added in the main loop, not here
  }

  // ==========================================================
  // INSTRUCTIONS
  // ==========================================================

  private static addInstructionsPage(
    doc: PDFKit.PDFDocument,
    pageNumber: number,
  ): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = doc.page.margins.left;

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text("How to Play", margin, 50);

    doc
      .moveTo(margin, 80)
      .lineTo(margin + 80, 80)
      .strokeColor("#4a4a6a")
      .lineWidth(1.5)
      .stroke();

    const instructions = [
      "1. Each puzzle contains a grid of letters.",
      "2. Find the hidden words listed below the grid.",
      "3. Words can be placed in any direction:",
      "   - Horizontal - left to right or right to left",
      "   - Vertical - top to bottom or bottom to top",
      "   - Diagonal - any of the four diagonal directions",
      "4. Words may overlap with other words.",
      "5. Once you find a word, circle or highlight it.",
      "6. All words from the list are hidden in the grid.",
      "",
      "Tip: Start with the longer words first!",
    ];

    let y = 100;
    doc.fontSize(10.5).font("Helvetica").fillColor("#333");

    for (const line of instructions) {
      doc.text(this.safeText(line), margin + 10, y);
      y += 18;
    }

    y += 10;
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#333")
      .text("Example:", margin, y);

    y += 18;

    const exampleGrid = [
      ["X", "X", "X", "X", "X", "B", "X"],
      ["C", "A", "T", "X", "I", "X", "R"],
      ["X", "X", "X", "R", "X", "E", "X"],
      ["X", "D", "D", "X", "G", "X", "X"],
      ["X", "O", "X", "I", "X", "X", "X"],
      ["X", "G", "T", "X", "X", "X", "X"],
      ["X", "X", "X", "X", "X", "X", "X"],
    ];

    const cellSize = 22;
    const startX = margin + 80;
    const startY = y;

    for (let r = 0; r < exampleGrid.length; r++) {
      for (let c = 0; c < exampleGrid[r].length; c++) {
        const cx = startX + c * cellSize;
        const cy = startY + r * cellSize;
        const isDark = (r + c) % 2 === 0;

        doc
          .rect(cx, cy, cellSize, cellSize)
          .fill(isDark ? "#fafafa" : "#f0f0f0");

        doc
          .rect(cx, cy, cellSize, cellSize)
          .strokeColor("#d0d0d0")
          .lineWidth(0.5)
          .stroke();

        const char = exampleGrid[r][c];
        if (char !== "X") {
          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor("#333")
            .text(char, cx + 5, cy + 4);
        }
      }
    }

    const legendY = startY + exampleGrid.length * cellSize + 15;
    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor("#666")
      .text(
        "Find: CAT (horizontal), DOG (vertical), BIRD (diagonal) TIGER (diagonal)",
        startX,
        legendY,
        {
          width: pageWidth - startX - margin,
        },
      );

    // ✅ Page number is added in the main loop, not here
  }

  // ==========================================================
  // RUNNING HEADER
  // ==========================================================

  /**
   * Book title / section label printed in the top margin, mirrored like
   * the gutter: verso (even) pages show the book title toward the outer
   * left edge, recto (odd) pages show the section label toward the outer
   * right edge — standard trade-book convention, and cheap polish for
   * someone flipping through mid-book. Only called for content pages
   * (puzzles, solutions); front matter is left clean on purpose.
   *
   * Deliberately positioned to end (divider at y=34) well above where
   * puzzle-page and solution-page titles start (y=46 / y=50 respectively)
   * so it never collides with the in-page heading.
   */
  // private static addRunningHeader(
  //   doc: PDFKit.PDFDocument,
  //   pageNumber: number,
  //   bookTitle: string,
  //   sectionLabel: string,
  // ): void {
  //   const pageWidth = doc.page.width;
  //   const margin = doc.page.margins.left;
  //   const rightMargin = doc.page.margins.right;
  //   const isRightHandPage = pageNumber % 2 === 1;
  //   const contentWidth = pageWidth - margin - rightMargin;

  //   const originalTopMargin = doc.page.margins.top;
  //   doc.page.margins.top = 0; // draw in the header zone without triggering auto-pagination

  //   doc.fontSize(8).font("Helvetica").fillColor("#9a9aa8");

  //   if (isRightHandPage) {
  //     // Recto (right-hand) page: section label toward the outer edge
  //     doc.text(sectionLabel, margin, 18, {
  //       width: contentWidth,
  //       align: "right",
  //       lineBreak: false,
  //     });
  //   } else {
  //     // Verso (left-hand) page: book title toward the outer edge
  //     doc.text(bookTitle, margin, 18, {
  //       width: contentWidth,
  //       align: "left",
  //       lineBreak: false,
  //     });
  //   }

  //   doc
  //     .moveTo(margin, 34)
  //     .lineTo(pageWidth - rightMargin, 34)
  //     .strokeColor("#e5e5ec")
  //     .lineWidth(0.5)
  //     .stroke();

  //   doc.page.margins.top = originalTopMargin;
  // }

  private static addRunningHeader(
    doc: PDFKit.PDFDocument,
    pageNumber: number,
    bookTitle: string,
    sectionLabel: string,
  ): void {
    const pageWidth = doc.page.width;
    const margin = doc.page.margins.left;
    const rightMargin = doc.page.margins.right;
    const isRightHandPage = pageNumber % 2 === 1;
    const contentWidth = pageWidth - margin - rightMargin;

    const originalTopMargin = doc.page.margins.top;
    doc.page.margins.top = 0;

    // Was: drawn with lineBreak:false and no enforced max width, so a
    // long book title could run straight past contentWidth and into (or
    // past) the margin/gutter — this is what triggered "text outside
    // margins" specifically on verso pages, which have a smaller
    // contentWidth than recto pages. fitTextToWidth actually enforces
    // the width, shrinking the font and falling back to an ellipsis.
    const rawLabel = isRightHandPage ? sectionLabel : bookTitle;
    const fitHeader = this.fitTextToWidth(
      doc,
      this.safeText(rawLabel),
      contentWidth,
      8,
      6,
    );

    doc.fontSize(fitHeader.fontSize).font("Helvetica").fillColor("#9a9aa8");
    doc.text(fitHeader.text, margin, 18, {
      width: contentWidth,
      align: isRightHandPage ? "right" : "left",
      lineBreak: false,
    });

    doc
      .moveTo(margin, 34)
      .lineTo(pageWidth - rightMargin, 34)
      .strokeColor("#e5e5ec")
      .lineWidth(0.5)
      .stroke();

    doc.page.margins.top = originalTopMargin;
  }

  // ==========================================================
  // CONTENT PAGE FRAME (border + corner icons)
  // ==========================================================

  /**
   * Thin magnifying glass — the "hunt" — drawn as a stroked circle plus a
   * diagonal handle. Used at bottom-left on every content page.
   */
  private static drawMagnifyingGlassIcon(
    doc: PDFKit.PDFDocument,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    const r = size * 0.32;
    const circCx = cx - size * 0.08;
    const circCy = cy - size * 0.08;
    const angle = Math.PI / 4;

    doc.save();
    doc.strokeColor(color).lineWidth(Math.max(size * 0.09, 0.8));
    doc.circle(circCx, circCy, r).stroke();

    const hx1 = circCx + Math.cos(angle) * r;
    const hy1 = circCy + Math.sin(angle) * r;
    const hx2 = hx1 + Math.cos(angle) * size * 0.4;
    const hy2 = hy1 + Math.sin(angle) * size * 0.4;
    doc.moveTo(hx1, hy1).lineTo(hx2, hy2).stroke();
    doc.restore();
  }

  /**
   * Simple bow-and-shaft key glyph — "the answer, unlocked". Used at
   * bottom-right on solution pages.
   */
  private static drawKeyIcon(
    doc: PDFKit.PDFDocument,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    doc.save();
    doc.strokeColor(color).lineWidth(Math.max(size * 0.08, 0.8));

    const bowR = size * 0.22;
    const bowCx = cx - size * 0.28;
    doc.circle(bowCx, cy, bowR).stroke();

    const shaftStartX = bowCx + bowR;
    const shaftEndX = cx + size * 0.35;
    doc.moveTo(shaftStartX, cy).lineTo(shaftEndX, cy).stroke();
    doc
      .moveTo(shaftEndX - size * 0.12, cy)
      .lineTo(shaftEndX - size * 0.12, cy + size * 0.16)
      .stroke();
    doc
      .moveTo(shaftEndX - size * 0.02, cy)
      .lineTo(shaftEndX - size * 0.02, cy + size * 0.2)
      .stroke();
    doc.restore();
  }

  /**
   * "?" glyph — "the unsolved challenge". Used at bottom-right on puzzle
   * pages (mirrors the key on solution pages).
   */
  private static drawQuestionMarkIcon(
    doc: PDFKit.PDFDocument,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    doc.save();
    doc.fontSize(size).font("Helvetica-Bold").fillColor(color);
    const text = "?";
    const w = doc.widthOfString(text);
    const h = doc.currentLineHeight(true);
    doc.text(text, cx - w / 2, cy - h / 2, { lineBreak: false });
    doc.restore();
  }

  /**
   * Thin decorative frame + two corner icons for content pages (puzzles
   * and solutions only — front matter stays clean by design, per review).
   * Icons sit at the BOTTOM corners deliberately: the top of the page is
   * already occupied by the running header, page title, and (on puzzle
   * pages) the word-count badge, so top corners would collide with those.
   * Inset is small enough to stay inside the existing margin band and
   * never overlaps body content.
   */
  private static drawContentPageFrame(
    doc: PDFKit.PDFDocument,
    pageWidth: number,
    pageHeight: number,
    variant: "puzzle" | "solution",
  ): void {
    const inset = 24;
    const frameColor = "#e2e2ec";
    const iconColor = "#c7c7dc";
    const iconSize = 11;

    doc
      .roundedRect(
        inset,
        inset,
        pageWidth - inset * 2,
        pageHeight - inset * 2,
        6,
      )
      .strokeColor(frameColor)
      .lineWidth(0.75)
      .stroke();

    const bottomY = pageHeight - inset - 15;
    this.drawMagnifyingGlassIcon(doc, inset + 13, bottomY, iconSize, iconColor);

    if (variant === "puzzle") {
      this.drawQuestionMarkIcon(
        doc,
        pageWidth - inset - 13,
        bottomY,
        iconSize + 4,
        iconColor,
      );
    } else {
      this.drawKeyIcon(
        doc,
        pageWidth - inset - 13,
        bottomY,
        iconSize + 3,
        iconColor,
      );
    }
  }

  /**
   * Letters used in the watermark's hexagon tiles — this is where "your
   * identity" lives. Change these two letters (e.g. to your initials or
   * an imprint abbreviation) and the watermark updates everywhere.
   */
  private static readonly WATERMARK_LETTERS: [string, string] = ["W", "S"];

  /**
   * A single tilted hexagon "tile" with a letter inside, styled after
   * word-tile game aesthetics (rounded-hex letter tiles).
   */
  private static drawHexTile(
    doc: PDFKit.PDFDocument,
    cx: number,
    cy: number,
    radius: number,
    rotationDeg: number,
    letter: string,
    tileColor: string,
    letterColor: string,
  ): void {
    const points: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = ((60 * i + rotationDeg) * Math.PI) / 180;
      points.push([
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle),
      ]);
    }

    doc
      .polygon(...points)
      .fillColor(tileColor)
      .fill();

    if (letter) {
      const fontSize = radius * 0.9;
      doc.fontSize(fontSize).font("Helvetica-Bold").fillColor(letterColor);
      const w = doc.widthOfString(letter);
      const h = doc.currentLineHeight(true);
      doc.text(letter, cx - w / 2, cy - h / 2, { lineBreak: false });
    }
  }

  /**
   * Brand watermark behind the word list: two tilted letter-tiles plus a
   * magnifying glass — a word-search "tile + magnifier" mark, echoing the
   * genre without reproducing any specific app's exact artwork/mascot.
   *
   * Deliberately smaller than the old checkerboard version and anchored
   * toward the bottom-right of the block (~68%/62%) rather than dead
   * center: that's normally the least text-dense corner of a 2-column
   * word list, so the mark mostly sits in open space instead of directly
   * under a wall of text. Call this BEFORE the word-list text loop.
   *
   * Legibility is handled two ways: the mark itself renders at very low
   * opacity (7-9%), AND each word label gets an opaque white backing
   * rect drawn just before its text (see the word-list loop in
   * addPuzzlePage) — so contrast is guaranteed regardless of exactly
   * where the mark lands, not just tuned by eye.
   */
  private static drawWordListWatermark(
    doc: PDFKit.PDFDocument,
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number,
  ): void {
    const markSize = Math.min(boxWidth, boxHeight) * 0.55;
    const cx = boxX + boxWidth * 0.68;
    const cy = boxY + boxHeight * 0.62;
    const tileR = markSize * 0.26;
    const tileColor = "#c7c7dc";
    const letterColor = "#8a8aa8";

    doc.save();
    doc.opacity(0.07);
    this.drawHexTile(
      doc,
      cx - tileR * 0.55,
      cy - tileR * 0.5,
      tileR,
      -8,
      this.WATERMARK_LETTERS[0],
      tileColor,
      letterColor,
    );
    this.drawHexTile(
      doc,
      cx + tileR * 0.65,
      cy - tileR * 0.15,
      tileR,
      10,
      this.WATERMARK_LETTERS[1],
      tileColor,
      letterColor,
    );

    doc.opacity(0.09);
    this.drawMagnifyingGlassIcon(
      doc,
      cx + tileR * 0.35,
      cy + tileR * 0.9,
      tileR * 1.3,
      letterColor,
    );
    doc.restore();
  }

  // ==========================================================
  // PAGE NUMBER
  // ==========================================================

  private static addPageNumber(
    doc: PDFKit.PDFDocument,
    pageNumber: string,
    pageWidth: number,
    pageHeight: number,
  ): void {
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // let us draw in the footer zone without triggering auto-pagination

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#999")
      .text(pageNumber, 0, pageHeight - 30, {
        align: "center",
        width: pageWidth,
        lineBreak: false,
      });

    doc.page.margins.bottom = originalBottomMargin; // restore for the next page's content
  }

  private static addBlankFillerPage(
    doc: PDFKit.PDFDocument,
    pageNumber: number,
  ): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#bbb")
      .text("This page is intentionally left blank.", 0, pageHeight / 2 - 5, {
        align: "center",
        width: pageWidth,
      });
  }

  // ==========================================================
  // PUZZLE PAGE
  // ==========================================================

  private static addPuzzlePage(
    doc: PDFKit.PDFDocument,
    bookPuzzle: any,
    displayNumber: number,
    opts: any,
    pageNumber: number,
  ): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = doc.page.margins.left; // was: opts.margins.left || 54

    const puzzle = bookPuzzle.puzzle;
    const puzzleData = puzzle?.data as any;
    const grid = Array.isArray(puzzleData?.grid) ? puzzleData.grid : [];
    const words = Array.isArray(puzzleData?.words) ? puzzleData.words : [];

    if (grid.length === 0 || !Array.isArray(grid[0])) {
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#333")
        .text("Puzzle data not available", margin, 100);
      // ✅ Page number is added in the main loop, not here
      return;
    }

    const gridSize = grid.length;

    // Domain label: single-domain puzzles store puzzleData.domain (a
    // string); mixed-domain puzzles store puzzleData.domains (an array).
    // This was already being generated by DomainWordSelectionService and
    // persisted into Puzzle.data — it just wasn't being read back out
    // anywhere downstream. No schema change needed, this is read-only.
    const domainLabel: string | null =
      typeof puzzleData?.domain === "string" && puzzleData.domain.trim()
        ? this.safeText(puzzleData.domain)
        : Array.isArray(puzzleData?.domains) && puzzleData.domains.length > 0
          ? puzzleData.domains
              .map((d: unknown) => this.safeText(String(d)))
              .join(", ")
          : null;

    // Frame + corner icons (magnifying glass / question mark) — drawn
    // first so everything else layers on top of it.
    this.drawContentPageFrame(doc, pageWidth, pageHeight, "puzzle");

    // Was 35 — moved down to 46 to leave clear room for the running
    // header (text at y=18, divider at y=34) added above it.
    const headerY = 46;

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(`Puzzle #${displayNumber}`, margin, headerY, { lineBreak: false });
    const titleWidth = doc.widthOfString(`Puzzle #${displayNumber}`);

    // Badge geometry computed now (not drawn yet) so the domain label
    // knows exactly how much room it has before running into it — both
    // now share the title's row instead of the domain sitting on its
    // own line beneath it.
    doc.fontSize(8).font("Helvetica");
    const badgeLabel = `${words.length} words · ${gridSize}\u00d7${gridSize}`;
    const badgeTextWidth = doc.widthOfString(badgeLabel);
    const badgeHeight = 16;
    const badgeWidth = badgeTextWidth + 16;
    const badgeX = pageWidth - doc.page.margins.right - badgeWidth;
    const badgeY = headerY + 1;

    // Domain label inline, right after the title on the same line.
    // fitTextToWidth handles mixed-domain puzzles that join several
    // domain names into a long string — shrinking/truncating it to fit
    // the gap between the title and the badge, rather than wrapping.
    const domainGap = 10;
    const domainX = margin + titleWidth + domainGap;
    const domainAvailableWidth = badgeX - domainX - 10;

    if (domainLabel && domainAvailableWidth > 30) {
      const fit = this.fitTextToWidth(
        doc,
        domainLabel,
        domainAvailableWidth,
        9.5,
        7,
      );
      doc
        .fontSize(fit.fontSize)
        .font("Helvetica")
        .fillColor("#8a8aa8")
        .text(fit.text, domainX, headerY + 4, {
          width: domainAvailableWidth,
          lineBreak: false,
        });
    }

    // Quick-glance badge (word count / grid size) so someone flipping to a
    // random puzzle mid-book can gauge it at a glance without checking the
    // front-matter "About This Book" page.
    doc
      .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2)
      .fillColor("#f0f0f5")
      .fill();
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#5a5a72")
      .text(badgeLabel, badgeX + 8, badgeY + 4, { lineBreak: false });

    let yPos = headerY + 29;

    // Compute the word-list geometry up front (instead of after drawing)
    // so the watermark can be painted behind the whole block before any
    // text lands on top of it.
    const wordsPerColumn = Math.min(
      3,
      Math.max(1, Math.ceil(words.length / 10)),
    );
    const availableWidth =
      pageWidth - doc.page.margins.left - doc.page.margins.right;
    const columnWidth = availableWidth / wordsPerColumn;
    const wordRowHeight = 13;
    const totalRows = Math.ceil(words.length / wordsPerColumn);
    const wordListLabelHeight = 15;
    const wordListHeight = totalRows * wordRowHeight + 8;

    this.drawWordListWatermark(
      doc,
      margin,
      yPos,
      availableWidth,
      wordListLabelHeight + wordListHeight,
    );

    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#333")
      .text("Find these words:", margin, yPos);

    yPos += wordListLabelHeight;

    for (let i = 0; i < words.length; i++) {
      // Column-major: word numbering runs down a column before wrapping
      // to the next one (1,2,3... at the top of column 1), instead of
      // across each row.
      const col = Math.floor(i / totalRows);
      const row = i % totalRows;
      const x = margin + col * columnWidth;
      const y = yPos + row * wordRowHeight;
      const word = this.safeText(words[i]);
      const label = `${i + 1}. ${word}`;
      const availableLabelWidth = columnWidth - 6;

      // Guard against long compound theme words overflowing their column
      // (see fitTextToWidth doc comment for why this matters).
      const fit = this.fitTextToWidth(doc, label, availableLabelWidth, 8, 6);

      // Opaque white backing behind the label, sized tight to the fitted
      // text. This guarantees the word list stays crisp over the
      // watermark no matter where the mark's hexagon tiles/magnifying
      // glass happen to land, rather than relying solely on the
      // watermark's opacity being "low enough" everywhere.
      const fittedLabelWidth = doc.widthOfString(fit.text);
      const fittedLabelHeight = doc.currentLineHeight(true);
      doc
        .rect(x - 1, y - 1, fittedLabelWidth + 2, fittedLabelHeight + 2)
        .fillColor("#ffffff")
        .fill();

      doc
        .fontSize(fit.fontSize)
        .font("Helvetica")
        .fillColor("#444")
        .text(fit.text, x, y, {
          width: availableLabelWidth,
          lineBreak: false,
        });
    }

    yPos += wordListHeight + 12;

    const labelSize = 16;
    // availableWidth already computed above using actual left/right margins
    const availableHeight = pageHeight - yPos - doc.page.margins.bottom - 30;
    const cellSizeFromWidth = (availableWidth - labelSize) / gridSize;
    const cellSizeFromHeight = (availableHeight - labelSize) / gridSize;

    let cellSize = Math.min(cellSizeFromWidth, cellSizeFromHeight);
    cellSize = Math.min(cellSize, 23);
    cellSize = Math.max(cellSize, 8);

    const finalTotalWidth = labelSize + gridSize * cellSize;
    const finalTotalHeight = labelSize + gridSize * cellSize;
    // Center within the printable area (left margin -> page width - right margin),
    // not across the raw pageWidth, since mirrored gutters make left/right unequal.
    const gridStartX =
      doc.page.margins.left + (availableWidth - finalTotalWidth) / 2;
    const gridStartY = yPos;

    if (
      gridStartY + finalTotalHeight >
      pageHeight - doc.page.margins.bottom - 25
    ) {
      throw new Error(
        `Puzzle ${displayNumber} cannot fit on one PDF page. ` +
          `Grid size: ${gridSize}, words: ${words.length}.`,
      );
    }

    this.drawGridWithLabels(
      doc,
      grid,
      gridSize,
      gridStartX,
      gridStartY,
      cellSize,
      labelSize,
    );

    // ✅ Page number is added in the main loop, not here
  }

  // ==========================================================
  // GRID
  // ==========================================================

  private static readonly SOLUTION_GRID_COLORS = [
    "#3b5bdb",
    "#2f9e44",
    "#e8590c",
    "#9c36b5",
    "#1098ad",
    "#c2255c",
  ];

  /**
   * Draws a single highlighted "found word" on a solution grid as a
   * translucent rounded band along its path, with a thin full-opacity
   * stroke for a crisp edge.
   *
   * Why translucent fill instead of a stroked outline: with 17-18 words
   * per puzzle (this book's design), long diagonal words routinely cross
   * the same cells. Stacking opaque strokes turns into an unreadable
   * tangle (visually confirmed on the sample export — Puzzle #1 and #3
   * solutions in particular). A translucent fill stacks like highlighter
   * ink instead — legible even with 5+ overlapping words in the same
   * cells — while the thin stroke keeps each band's edges defined.
   */
  private static drawWordCapsule(
    doc: PDFKit.PDFDocument,
    startCx: number,
    startCy: number,
    endCx: number,
    endCy: number,
    cellSize: number,
    color: string,
  ): void {
    const dx = endCx - startCx;
    const dy = endCy - startCy;
    const length = Math.sqrt(dx * dx + dy * dy) + cellSize;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const capsuleHeight = cellSize * 0.78;
    const midX = (startCx + endCx) / 2;
    const midY = (startCy + endCy) / 2;

    doc.save();
    doc.rotate(angleDeg, { origin: [midX, midY] });

    doc.opacity(0.3);
    doc
      .roundedRect(
        midX - length / 2,
        midY - capsuleHeight / 2,
        length,
        capsuleHeight,
        capsuleHeight / 2,
      )
      .fill(color);

    doc.opacity(1);
    doc
      .roundedRect(
        midX - length / 2,
        midY - capsuleHeight / 2,
        length,
        capsuleHeight,
        capsuleHeight / 2,
      )
      .lineWidth(0.5)
      .strokeColor(color)
      .stroke();

    doc.restore();
  }

  private static drawSolutionLargeGrid(
    doc: PDFKit.PDFDocument,
    bookPuzzle: any,
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number,
  ): void {
    const puzzle = bookPuzzle.puzzle;
    const puzzleData = puzzle?.data as any;
    const grid: string[][] = Array.isArray(puzzleData?.grid)
      ? puzzleData.grid
      : [];
    const words: string[] = Array.isArray(puzzleData?.words)
      ? puzzleData.words
      : [];
    const placedWords: any[] = Array.isArray(puzzleData?.placedWords)
      ? puzzleData.placedWords
      : [];

    const titleHeight = 16;
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(`Puzzle #${bookPuzzle.displayNumber}`, boxX, boxY, {
        width: boxWidth,
        align: "left",
      });

    const bodyTop = boxY + titleHeight;
    const bodyHeight = boxHeight - titleHeight;

    if (grid.length === 0 || !Array.isArray(grid[0])) {
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#999")
        .text("Grid data not available", boxX, bodyTop, { width: boxWidth });
      return;
    }

    const gridSize = grid.length;

    // Build the placed-word lookup FIRST, so the word list can draw direction arrows
    const wordMap = new Map<string, NormalizedPlacedWord>();
    for (const pw of placedWords) {
      const normalized = this.normalizePlacedWord(pw);
      if (normalized.word) wordMap.set(normalized.word, normalized);
    }

    // ── Left: single-column word list with direction arrows ──
    const wordsColWidth = Math.max(100, boxWidth * 0.22);
    const gapBetween = 14;
    const gridColWidth = boxWidth - wordsColWidth - gapBetween;

    let wordFontSize = 8;
    let rowH = 13;
    if (words.length > 14) {
      wordFontSize = 7;
      rowH = 11.5;
    }
    if (words.length > 18) {
      wordFontSize = 6.3;
      rowH = 10;
    }
    if (words.length > 24) {
      wordFontSize = 5.6;
      rowH = 9;
    }
    const maxRowH = bodyHeight / Math.max(words.length, 1);
    if (rowH > maxRowH) rowH = Math.max(7, maxRowH);

    // Floor of 6.2pt: below this the arrowhead geometry in
    // drawDirectionArrow starts getting cramped against the row height.
    const arrowSize = Math.max(6.2, Math.min(9, rowH - 1));
    const arrowGap = 4;
    const textX = boxX + arrowSize + arrowGap;
    const textWidth = wordsColWidth - arrowSize - arrowGap - 6;

    let colorIndex = 0;
    const wordColors = new Map<string, string>();

    for (let i = 0; i < words.length; i++) {
      const word = this.safeText(words[i]);
      const info = wordMap.get(word);
      const y = bodyTop + i * rowH;

      const color =
        this.SOLUTION_GRID_COLORS[
          colorIndex % this.SOLUTION_GRID_COLORS.length
        ];
      wordColors.set(word, color);
      colorIndex++;

      if (info) {
        const angleDeg =
          (Math.atan2(info.direction.dr, info.direction.dc) * 180) / Math.PI;
        const arrowY = y + (rowH - arrowSize) / 2;
        this.drawDirectionArrow(doc, boxX, arrowY, arrowSize, angleDeg, color);
      }

      // Long theme words (e.g. "WOMENSWORLDCUP") could overflow this
      // column at the base word-list font size and wrap onto — and
      // visually collide with — the row below it. Shrink per-item
      // instead of letting that happen.
      const label = `${i + 1}. ${word}`;
      const fit = this.fitTextToWidth(doc, label, textWidth, wordFontSize, 5);

      doc
        .fontSize(fit.fontSize)
        .font("Helvetica")
        .fillColor("#444")
        .text(fit.text, textX, y, {
          width: textWidth,
          lineBreak: false,
        });
    }

    // ── Right: grid with circled words ──
    const gridAreaX = boxX + wordsColWidth + gapBetween;
    let cellSize = Math.min(gridColWidth / gridSize, bodyHeight / gridSize);
    cellSize = Math.max(cellSize, 6);
    cellSize = Math.min(cellSize, 22);

    const gridPxSize = cellSize * gridSize;
    const gridStartX = gridAreaX + (gridColWidth - gridPxSize) / 2;
    const gridStartY = bodyTop + (bodyHeight - gridPxSize) / 2;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = gridStartX + c * cellSize;
        const y = gridStartY + r * cellSize;
        const cell = this.safeText(grid[r]?.[c] || "");
        if (cell) {
          const fontSize = Math.min(9, cellSize * 0.5);
          doc.fontSize(fontSize).font("Helvetica").fillColor("#333");
          const textWidth2 = doc.widthOfString(cell);
          const textHeight = doc.currentLineHeight(true);
          doc.text(
            cell,
            x + (cellSize - textWidth2) / 2,
            y + (cellSize - textHeight) / 2,
            { width: textWidth2, height: textHeight, lineBreak: false },
          );
        }
      }
    }

    doc
      .rect(gridStartX, gridStartY, gridPxSize, gridPxSize)
      .strokeColor("#bbbbbb")
      .lineWidth(0.75)
      .stroke();

    for (const word of words) {
      const cleanWord = this.safeText(word);
      const info = wordMap.get(cleanWord);
      if (!info) continue;

      const color = wordColors.get(cleanWord) || this.SOLUTION_GRID_COLORS[0];

      const startCx = gridStartX + info.startCol * cellSize + cellSize / 2;
      const startCy = gridStartY + info.startRow * cellSize + cellSize / 2;
      const endCx = gridStartX + info.endCol * cellSize + cellSize / 2;
      const endCy = gridStartY + info.endRow * cellSize + cellSize / 2;

      this.drawWordCapsule(
        doc,
        startCx,
        startCy,
        endCx,
        endCy,
        cellSize,
        color,
      );
    }
  }

  /**
   * Greedily flows numbered word labels left-to-right, wrapping to a new
   * row only when the next item genuinely doesn't fit — instead of
   * forcing a fixed number of words per row. A row might end up with 2
   * words if a 3rd one is too long to join them, or more than 3 if
   * they're all short. Pure measurement, no drawing: the same layout is
   * reused for both sizing (to know how tall the block will be before
   * the grid's share of the box is computed) and actual rendering, so
   * what gets measured is exactly what gets drawn — no drift between
   * the two passes.
   */
  private static flowWordListItems(
    doc: PDFKit.PDFDocument,
    words: string[],
    wordMap: Map<string, NormalizedPlacedWord>,
    boxWidth: number,
    fontSize: number,
    arrowSize: number,
    arrowGap: number,
    itemGap: number,
  ): { items: WordFlowItem[]; rowCount: number } {
    doc.fontSize(fontSize).font("Helvetica");

    const items: WordFlowItem[] = [];
    let x = 0;
    let row = 0;
    let colorIndex = 0;

    for (let i = 0; i < words.length; i++) {
      const word = this.safeText(words[i]);
      const label = `${i + 1}. ${word}`;
      const labelWidth = doc.widthOfString(label);
      const itemWidth = arrowSize + arrowGap + labelWidth;

      // Wrap to a new row if this item doesn't fit — unless the row is
      // still empty (x === 0), in which case place it anyway so a
      // single very long word can't produce an empty row forever;
      // fitTextToWidth shrinks it at draw time instead if needed.
      if (x > 0 && x + itemWidth > boxWidth) {
        row++;
        x = 0;
      }

      const color =
        this.SOLUTION_GRID_COLORS[
          colorIndex % this.SOLUTION_GRID_COLORS.length
        ];
      colorIndex++;

      items.push({
        word,
        label,
        info: wordMap.get(word),
        x,
        row,
        color,
        maxWidth: boxWidth - x - arrowSize - arrowGap,
      });
      x += itemWidth + itemGap;
    }

    return { items, rowCount: row + 1 };
  }

  /**
   * Sizes each column to its own widest word at the chosen font size, then
   * splits whatever whitespace is left over EVENLY across all 3 columns —
   * instead of anchoring column 1/3 to the box edges and only letting the
   * middle column absorb slack. That anchor approach could push column 3
   * left of where column 1 actually ended whenever the natural widths
   * already summed close to (or over) boxWidth, causing the overlap seen
   * on puzzles with long compound words. Even distribution keeps every
   * column's start position strictly increasing and never overlapping,
   * because the padding added to column 1 always shifts column 2's start
   * point further right by the same amount, and so on down the line.
   */
  private static layoutSolutionWordList(
    doc: PDFKit.PDFDocument,
    words: string[],
    wordMap: Map<string, NormalizedPlacedWord>,
    boxWidth: number,
    arrowGap: number,
    itemGap: number,
  ): {
    items: WordFlowItem[];
    rowCount: number;
    fontSize: number;
    rowH: number;
  } {
    const COLUMNS = 3;
    const MAX_FONT = 6.5;
    const MIN_FONT = 4.5;
    const FONT_STEP = 0.3;
    const SEARCH_ARROW_SIZE = 6;
    const COLUMN_GAP = itemGap;

    const itemsPerColumn = Math.ceil(words.length / COLUMNS) || 1;
    const columnGroups: number[][] = [];
    for (let c = 0; c < COLUMNS; c++) {
      const start = c * itemsPerColumn;
      const end = Math.min(start + itemsPerColumn, words.length);
      if (start < end) {
        columnGroups.push(
          Array.from({ length: end - start }, (_, k) => start + k),
        );
      }
    }

    const naturalWidthsAt = (fontSize: number): number[] => {
      doc.fontSize(fontSize).font("Helvetica");
      return columnGroups.map((colIndices) => {
        let w = 0;
        for (const idx of colIndices) {
          const label = `${idx + 1}. ${this.safeText(words[idx])}`;
          w = Math.max(
            w,
            SEARCH_ARROW_SIZE + arrowGap + doc.widthOfString(label),
          );
        }
        return w;
      });
    };

    // Pick the largest font size where the columns' own natural widths
    // (before any padding) already fit within boxWidth — same search as
    // before, just re-measuring per column rather than assuming a fixed
    // 3-column packing order.
    let chosenFontSize = MIN_FONT;
    let naturalWidths = naturalWidthsAt(MIN_FONT);

    for (
      let fontSize = MAX_FONT;
      fontSize >= MIN_FONT - 0.001;
      fontSize -= FONT_STEP
    ) {
      const widths = naturalWidthsAt(fontSize);
      const total =
        widths.reduce((a, b) => a + b, 0) + COLUMN_GAP * (widths.length - 1);
      chosenFontSize = fontSize;
      naturalWidths = widths;
      if (total <= boxWidth) break;
    }

    const rowH = Math.max(7, chosenFontSize + 3);
    const arrowSize = Math.max(5.8, Math.min(6, rowH - 1));

    // Leftover whitespace = boxWidth minus what the columns actually need
    // at their natural widths. Split it evenly across every column instead
    // of letting only one column claim it.
    //
    // If this comes out negative (natural widths already exceed boxWidth
    // even at MIN_FONT — only happens with extremely long words), each
    // column gets an equal small haircut below its own natural width. That
    // alone would risk overlap, but the per-item fitTextToWidth call in
    // drawSolutionMiniGrid (unchanged, still runs after this) re-measures
    // each word against its assigned column width and shrinks/truncates
    // it individually — so no two words can ever collide, even here.
    const naturalTotal =
      naturalWidths.reduce((a, b) => a + b, 0) +
      COLUMN_GAP * (naturalWidths.length - 1);
    const leftoverSpace = boxWidth - naturalTotal;
    const extraPerColumn = leftoverSpace / naturalWidths.length;

    const columnWidths = naturalWidths.map((w) =>
      Math.max(10, w + extraPerColumn),
    );

    const columnX: number[] = [];
    let cursorX = 0;
    for (const w of columnWidths) {
      columnX.push(cursorX);
      cursorX += w + COLUMN_GAP;
    }

    const items: WordFlowItem[] = [];
    let colorIndex = 0;

    columnGroups.forEach((colIndices, colPos) => {
      colIndices.forEach((idx, rowPos) => {
        const word = this.safeText(words[idx]);
        const label = `${idx + 1}. ${word}`;
        const color =
          this.SOLUTION_GRID_COLORS[
            colorIndex % this.SOLUTION_GRID_COLORS.length
          ];
        colorIndex++;

        items.push({
          word,
          label,
          info: wordMap.get(word),
          x: columnX[colPos],
          row: rowPos,
          color,
          maxWidth: columnWidths[colPos] - arrowSize - arrowGap,
        });
      });
    });

    return {
      items,
      rowCount: itemsPerColumn,
      fontSize: chosenFontSize,
      rowH,
    };
  }

  private static drawSolutionMiniGrid(
    doc: PDFKit.PDFDocument,
    bookPuzzle: any,
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number,
  ): void {
    const puzzle = bookPuzzle.puzzle;
    const puzzleData = puzzle?.data as any;
    const grid: string[][] = Array.isArray(puzzleData?.grid)
      ? puzzleData.grid
      : [];
    const words: string[] = Array.isArray(puzzleData?.words)
      ? puzzleData.words
      : [];
    const placedWords: any[] = Array.isArray(puzzleData?.placedWords)
      ? puzzleData.placedWords
      : [];

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(`Puzzle #${bookPuzzle.displayNumber}`, boxX, boxY, {
        width: boxWidth,
        align: "center",
      });

    const labelHeight = 15;
    const cursorYStart = boxY + labelHeight;

    if (grid.length === 0 || !Array.isArray(grid[0])) {
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#999")
        .text("Grid data not available", boxX, cursorYStart, {
          width: boxWidth,
          align: "center",
        });
      return;
    }

    const gridSize = grid.length;

    // Build the placed-word lookup FIRST, so the word list can draw direction arrows
    const wordMap = new Map<string, NormalizedPlacedWord>();
    for (const pw of placedWords) {
      const normalized = this.normalizePlacedWord(pw);
      if (normalized.word) wordMap.set(normalized.word, normalized);
    }

    // ── Word-list sizing: prefer a clean 3-per-row grid, shrinking font
    // size first before ever letting a row drop below 3 items ──
    const arrowGap = 2;
    const itemGap = 4;

    const layout = this.layoutSolutionWordList(
      doc,
      words,
      wordMap,
      boxWidth,
      arrowGap,
      itemGap,
    );
    const wordFontSize = layout.fontSize;
    const rowH = layout.rowH;
    const flowResult = { items: layout.items, rowCount: layout.rowCount };

    const rowsNeeded = flowResult.rowCount;
    const wordListHeight = rowsNeeded * rowH + 6;

    const gapBeforeList = 6;
    const gridAreaHeight =
      boxHeight - labelHeight - wordListHeight - gapBeforeList;
    const gridAreaWidth = boxWidth;

    let cellSize = Math.min(
      gridAreaWidth / gridSize,
      gridAreaHeight / gridSize,
    );
    cellSize = Math.max(cellSize, 5);
    cellSize = Math.min(cellSize, 16);

    const gridPxSize = cellSize * gridSize;
    const gridStartX = boxX + (boxWidth - gridPxSize) / 2;
    const gridStartY = cursorYStart;

    // Letters
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = gridStartX + c * cellSize;
        const y = gridStartY + r * cellSize;
        const cell = this.safeText(grid[r]?.[c] || "");
        if (cell) {
          const fontSize = Math.min(7, cellSize * 0.55);
          doc.fontSize(fontSize).font("Helvetica").fillColor("#333");
          const textWidth = doc.widthOfString(cell);
          const textHeight = doc.currentLineHeight(true);
          doc.text(
            cell,
            x + (cellSize - textWidth) / 2,
            y + (cellSize - textHeight) / 2,
            { width: textWidth, height: textHeight, lineBreak: false },
          );
        }
      }
    }

    doc
      .rect(gridStartX, gridStartY, gridPxSize, gridPxSize)
      .strokeColor("#bbbbbb")
      .lineWidth(0.75)
      .stroke();

    // ── Word list with direction arrows, drawn from the same flow layout
    // that was used to size this block above (no drift between the two
    // passes) ──
    const listTop = gridStartY + gridPxSize + gapBeforeList;
    const arrowSize = Math.max(5.8, Math.min(6, rowH - 1));

    const wordColors = new Map<string, string>();

    for (const item of flowResult.items) {
      const y = listTop + item.row * rowH;
      const x = boxX + item.x;
      wordColors.set(item.word, item.color);

      if (item.info) {
        const angleDeg =
          (Math.atan2(item.info.direction.dr, item.info.direction.dc) * 180) /
          Math.PI;
        this.drawDirectionArrow(
          doc,
          x,
          y + 0.5,
          arrowSize,
          angleDeg,
          item.color,
        );
      }

      // Available width is "however much room is left to the box's
      // right edge from this item's start" — not a fixed column width,
      // since items no longer sit in fixed columns. This only actually
      // shrinks anything for the rare word too long to fit even alone
      // on its own row.
      const availableWidth = item.maxWidth;
      const fit = this.fitTextToWidth(
        doc,
        item.label,
        availableWidth,
        wordFontSize,
        4.5,
      );

      doc
        .fontSize(fit.fontSize)
        .font("Helvetica")
        .fillColor("#555")
        .text(fit.text, x + arrowSize + arrowGap, y, {
          width: availableWidth,
          lineBreak: false,
        });
    }

    // ── Circle each found word on the grid, reusing the same colors ──
    for (const word of words) {
      const cleanWord = this.safeText(word);
      const info = wordMap.get(cleanWord);
      if (!info) continue;

      const color = wordColors.get(cleanWord) || this.SOLUTION_GRID_COLORS[0];

      const startCx = gridStartX + info.startCol * cellSize + cellSize / 2;
      const startCy = gridStartY + info.startRow * cellSize + cellSize / 2;
      const endCx = gridStartX + info.endCol * cellSize + cellSize / 2;
      const endCy = gridStartY + info.endRow * cellSize + cellSize / 2;

      this.drawWordCapsule(
        doc,
        startCx,
        startCy,
        endCx,
        endCy,
        cellSize,
        color,
      );
    }
  }

  private static drawDirectionArrow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    size: number,
    angleDeg: number,
    color: string,
  ): void {
    // At the icon sizes used in solution word lists (as small as ~6pt),
    // the old proportions (shaft 0.42*size, head 0.24*size) produced an
    // arrowhead under ~1.5pt — a sub-pixel smear at print resolution,
    // which is why every direction tick rendered as a plain dash
    // regardless of angle (confirmed visually on the sample export). A
    // shorter shaft with a proportionally larger head, plus absolute
    // floors, reads as a clear chevron even at icon scale.
    const rad = (angleDeg * Math.PI) / 180;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const len = Math.max(size * 0.34, 2.2);
    const dx = Math.cos(rad) * len;
    const dy = Math.sin(rad) * len;
    const startX = cx - dx;
    const startY = cy - dy;
    const endX = cx + dx;
    const endY = cy + dy;

    doc.save();
    doc.strokeColor(color).lineWidth(Math.max(size * 0.11, 0.9));
    doc.moveTo(startX, startY).lineTo(endX, endY).stroke();

    const headLen = Math.max(size * 0.42, 2.4);
    const headAngle = Math.PI / 6.2;
    const h1x = endX - headLen * Math.cos(rad - headAngle);
    const h1y = endY - headLen * Math.sin(rad - headAngle);
    const h2x = endX - headLen * Math.cos(rad + headAngle);
    const h2y = endY - headLen * Math.sin(rad + headAngle);

    doc
      .moveTo(endX, endY)
      .lineTo(h1x, h1y)
      .lineTo(h2x, h2y)
      .closePath()
      .fillColor(color)
      .fill();
    doc.restore();
  }

  private static drawGridWithLabels(
    doc: PDFKit.PDFDocument,
    grid: string[][],
    gridSize: number,
    startX: number,
    startY: number,
    cellSize: number,
    labelSize: number,
  ): void {
    const labelFontSize = Math.min(9, cellSize * 0.45);

    // Top labels
    doc
      .rect(startX + labelSize, startY, gridSize * cellSize, labelSize)
      .fill("#e8e8e8");
    doc
      .rect(startX + labelSize, startY, gridSize * cellSize, labelSize)
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .stroke();

    doc.fontSize(labelFontSize).font("Helvetica-Bold").fillColor("#333333");
    for (let c = 0; c < gridSize; c++) {
      const x = startX + labelSize + c * cellSize;
      const labelText = String(c + 1);
      const textWidth = doc.widthOfString(labelText);
      const textHeight = doc.currentLineHeight(true);
      doc.text(
        labelText,
        x + (cellSize - textWidth) / 2,
        startY + (labelSize - textHeight) / 2,
        {
          width: textWidth,
          height: textHeight,
          align: "center",
          lineBreak: false,
        },
      );
    }

    // Left labels
    doc
      .rect(startX, startY + labelSize, labelSize, gridSize * cellSize)
      .fill("#e8e8e8");
    doc
      .rect(startX, startY + labelSize, labelSize, gridSize * cellSize)
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .stroke();

    doc.fontSize(labelFontSize).font("Helvetica-Bold").fillColor("#333333");
    for (let r = 0; r < gridSize; r++) {
      const y = startY + labelSize + r * cellSize;
      const labelText = r < 26 ? String.fromCharCode(65 + r) : String(r + 1);
      const textWidth = doc.widthOfString(labelText);
      const textHeight = doc.currentLineHeight(true);
      doc.text(
        labelText,
        startX + (labelSize - textWidth) / 2,
        y + (cellSize - textHeight) / 2,
        {
          width: textWidth,
          height: textHeight,
          align: "center",
          lineBreak: false,
        },
      );
    }

    // Grid cells
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = startX + labelSize + c * cellSize;
        const y = startY + labelSize + r * cellSize;
        const cell = this.safeText(grid[r]?.[c] || "");
        const isDark = (r + c) % 2 === 0;

        doc.rect(x, y, cellSize, cellSize).fill(isDark ? "#fafafa" : "#f0f0f0");
        doc
          .rect(x, y, cellSize, cellSize)
          .strokeColor("#d0d0d0")
          .lineWidth(0.5)
          .stroke();

        if (cell) {
          const fontSize = Math.min(12, cellSize * 0.5);
          doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#333");
          const textWidth = doc.widthOfString(cell);
          const textHeight = doc.currentLineHeight(true);
          doc.text(
            cell,
            x + (cellSize - textWidth) / 2,
            y + (cellSize - textHeight) / 2,
            {
              width: textWidth,
              height: textHeight,
              align: "center",
              lineBreak: false,
            },
          );
        }
      }
    }

    const totalWidth = labelSize + gridSize * cellSize;
    const totalHeight = labelSize + gridSize * cellSize;
    doc
      .rect(startX, startY, totalWidth, totalHeight)
      .strokeColor("#999999")
      .lineWidth(1)
      .stroke();
  }

  // ==========================================================
  // SOLUTION HEADER
  // ==========================================================

  private static drawSolutionsHeader(
    doc: PDFKit.PDFDocument,
    pageWidth: number,
    continuation = false,
  ): void {
    doc
      .fontSize(continuation ? 16 : 20)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(continuation ? "Solutions (continued)" : "Solutions", 0, 50, {
        align: "center",
        width: pageWidth,
      });

    const lineX = pageWidth / 2 - 60;
    doc
      .moveTo(lineX, 75)
      .lineTo(lineX + 120, 75)
      .strokeColor("#4a4a6a")
      .lineWidth(1)
      .stroke();
  }

  // ==========================================================
  // SOLUTIONS PAGES
  // ==========================================================

  private static addSolutionsPages(
    doc: PDFKit.PDFDocument,
    bookPuzzles: any[],
    startingPageNumber: number,
    pageSize: [number, number],
    baseMargins: { top: number; bottom: number; left: number; right: number },
    gutter: number,
    bookTitle: string,
  ): { lastPageNumber: number } {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    let pageNumber = startingPageNumber;

    const LARGE_GRID_THRESHOLD = 18;

    const contentTop = 88;
    const contentBottom = pageHeight - 45;
    const gutterX = 20;
    // Was a single gutterY = 20 shared by both layouts. Split so the 2x2
    // mini-solution layout can have a tighter vertical gap between its
    // two rows without affecting the large (2-per-page) layout's spacing.
    const gutterYSmall = 10;
    const gutterYLarge = 20;

    let slot = 0;
    let currentLayout: "small" | "large" | null = null;
    let pageStarted = false;

    const startNewPage = () => {
      if (pageStarted) {
        pageNumber++;
        doc.addPage({
          size: pageSize,
          margins: this.getPageMargins(pageNumber, baseMargins, gutter),
        });
      }
      this.drawContentPageFrame(
        doc,
        doc.page.width,
        doc.page.height,
        "solution",
      );
      this.drawSolutionsHeader(doc, doc.page.width, pageStarted);
      this.addRunningHeader(doc, pageNumber, bookTitle, "Solutions");
      this.addPageNumber(
        doc,
        String(pageNumber),
        doc.page.width,
        doc.page.height,
      );
      pageStarted = true;
      slot = 0;
    };

    for (let i = 0; i < bookPuzzles.length; i++) {
      const bookPuzzle = bookPuzzles[i];
      const puzzleData = bookPuzzle.puzzle?.data as any;
      const gridSize = Array.isArray(puzzleData?.grid)
        ? puzzleData.grid.length
        : 0;
      const layout: "small" | "large" =
        gridSize > LARGE_GRID_THRESHOLD ? "large" : "small";
      const perPage = layout === "small" ? 4 : 2;

      const needsNewPage =
        !pageStarted || layout !== currentLayout || slot >= perPage;

      if (needsNewPage) {
        startNewPage();
        currentLayout = layout;
      }

      // ── Use this page's actual (mirrored) margins for content width ──
      const margin = doc.page.margins.left;
      const contentWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const contentHeight = contentBottom - contentTop;

      if (layout === "small") {
        const smallCellWidth = (contentWidth - gutterX) / 2;
        const smallCellHeight = (contentHeight - gutterYSmall) / 2;
        const col = slot % 2;
        const row = Math.floor(slot / 2);
        const boxX = margin + col * (smallCellWidth + gutterX);
        const boxY = contentTop + row * (smallCellHeight + gutterYSmall);
        this.drawSolutionMiniGrid(
          doc,
          bookPuzzle,
          boxX,
          boxY,
          smallCellWidth,
          smallCellHeight,
        );
      } else {
        const largeCellWidth = contentWidth;
        const largeCellHeight = (contentHeight - gutterYLarge) / 2;
        const boxX = margin;
        const boxY = contentTop + slot * (largeCellHeight + gutterYLarge);
        this.drawSolutionLargeGrid(
          doc,
          bookPuzzle,
          boxX,
          boxY,
          largeCellWidth,
          largeCellHeight,
        );
      }

      slot++;
    }

    return { lastPageNumber: pageNumber };
  }

  // ==========================================================
  // SINGLE SOLUTION PAGE
  // ==========================================================

  private static addSingleSolutionPage(
    doc: PDFKit.PDFDocument,
    bookPuzzle: any,
    pageNumber: number,
  ): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = doc.page.margins.left;

    const puzzle = bookPuzzle.puzzle;
    const puzzleData = puzzle?.data as any;

    const words = Array.isArray(puzzleData?.words) ? puzzleData.words : [];
    const placedWords = Array.isArray(puzzleData?.placedWords)
      ? puzzleData.placedWords
      : [];

    const wordMap = new Map<string, NormalizedPlacedWord>();
    for (const placedWord of placedWords) {
      const normalized = this.normalizePlacedWord(placedWord);
      if (normalized.word) {
        wordMap.set(normalized.word, normalized);
      }
    }

    this.drawContentPageFrame(doc, pageWidth, pageHeight, "solution");

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(`Solution - Puzzle ${bookPuzzle.displayNumber}`, margin, 55, {
        width: pageWidth - doc.page.margins.left - doc.page.margins.right,
        align: "center",
      });

    let y = 105;
    const rowHeight = 17;
    const halfWords = Math.ceil(words.length / 2);
    const columnWidth =
      (pageWidth - doc.page.margins.left - doc.page.margins.right) / 2 - 10;

    for (let i = 0; i < words.length; i++) {
      const isRight = i >= halfWords;
      const displayIndex = isRight ? i - halfWords : i;
      const x = isRight ? margin + columnWidth + 15 : margin;
      const rowY = y + displayIndex * rowHeight;

      if (rowY > pageHeight - 55) {
        throw new Error(
          `Solution for Puzzle ${bookPuzzle.displayNumber} does not fit on one page.`,
        );
      }

      const word = this.safeText(words[i]);
      const info = wordMap.get(word);

      let coordinateText = "Location unavailable";
      if (info) {
        coordinateText =
          `${this.formatCoordinate(info.startRow, info.startCol)} -> ` +
          `${this.formatCoordinate(info.endRow, info.endCol)} ` +
          `(${this.getDirectionLabel(info.directionName)})`;
      }

      const label = `${String(i + 1).padStart(2, " ")}. ${word}`;
      const labelWidth = columnWidth - 115;
      const fit = this.fitTextToWidth(
        doc,
        label,
        labelWidth,
        7.8,
        6,
        "Helvetica-Bold",
      );

      doc
        .fontSize(fit.fontSize)
        .font("Helvetica-Bold")
        .fillColor("#333")
        .text(fit.text, x, rowY, {
          width: labelWidth,
          lineBreak: false,
        });

      doc
        .fontSize(6.8)
        .font("Helvetica")
        .fillColor("#666")
        .text(coordinateText, x + 105, rowY + 1, {
          width: columnWidth - 105,
          lineBreak: false,
        });
    }

    // ✅ Page number is added in the main loop, not here
  }

  // ==========================================================
  // COORDINATES
  // ==========================================================

  private static formatCoordinate(row: number, col: number): string {
    const safeRow = Number.isFinite(row) ? Math.max(0, row) : 0;
    const safeCol = Number.isFinite(col) ? Math.max(0, col) : 0;

    const rowLabel =
      safeRow < 26 ? String.fromCharCode(65 + safeRow) : `R${safeRow + 1}`;

    return `${rowLabel}${safeCol + 1}`;
  }

  // ==========================================================
  // DECORATIVE COVER BORDER
  // ==========================================================

  private static drawDecorativeBorder(
    doc: PDFKit.PDFDocument,
    width: number,
    height: number,
  ): void {
    const padding = 40;
    const cornerRadius = 10;

    const x = padding;
    const y = padding;
    const w = width - padding * 2;
    const h = height - padding * 2;

    doc
      .roundedRect(x, y, w, h, cornerRadius)
      .strokeColor("#e0e0e0")
      .lineWidth(1)
      .stroke();

    const innerPadding = 15;

    doc
      .roundedRect(
        x + innerPadding,
        y + innerPadding,
        w - innerPadding * 2,
        h - innerPadding * 2,
        cornerRadius / 2,
      )
      .strokeColor("#e8e8e8")
      .lineWidth(0.5)
      .dash(4, { space: 4 })
      .stroke();

    doc.undash();

    const corners = [
      [x + innerPadding, y + innerPadding],
      [x + w - innerPadding, y + innerPadding],
      [x + innerPadding, y + h - innerPadding],
      [x + w - innerPadding, y + h - innerPadding],
    ];

    for (const [cx, cy] of corners) {
      doc.circle(cx, cy, 3).fill("#d0d0d0").stroke();
    }
  }
}
