import * as fs from "fs";
import * as path from "path";
import { DomainMetadata, DomainVocabularyFile, ThemeDomainDiscovery } from "../domain/domain.types";
import { DomainDiscoveryService } from "./domain-discovery.service";
import { VocabularyGenerationService } from "./vocabulary-generation.service";
import { VocabularyCleanupService } from "./vocabulary-cleanup.service";
import { AIService } from "./ai-service";
import {
  buildThemeDirPath,
  normalizeFilename,
  normalizeThemeDir,
} from "../domain/filename.util";

const WORD_LISTS_BASE = "src/modules/theme/word-lists";

export interface PipelineProgress {
  stage: "discovering" | "generating" | "cleaning" | "complete" | "error";
  theme: string;
  totalDomains: number;
  processedDomains: number;
  currentDomain?: string;
  currentDomainIndex?: number;
  successfulDomains: number;
  failedDomains: string[];
  domainResults: DomainResult[];
  message: string;
}

export interface DomainResult {
  domainName: string;
  fileName: string;
  success: boolean;
  error?: string;
  wordCount: number;
}

export interface PipelineOptions {
  theme: string;
  onProgress?: (progress: PipelineProgress) => void;
  retryDomains?: string[];
}

/**
 * Vocabulary Pipeline Service.
 *
 * Orchestrates the full three-stage vocabulary generation:
 *   Prompt 1: Domain discovery
 *   Prompt 2: Raw vocabulary generation (per domain, independently)
 *   Prompt 3: Cleanup and classification (per domain, independently)
 *
 * Handles domain-level failures: one failed domain does not fail the entire theme.
 * Supports retrying individual failed domains.
 */
export class VocabularyPipelineService {
  /**
   * Generate theme vocabulary through the full pipeline.
   */
  static async generateThemeVocabulary(
    options: PipelineOptions,
  ): Promise<PipelineProgress> {
    const { theme, onProgress, retryDomains } = options;

    if (!AIService.isConfigured()) {
      throw new Error(
        "AI service is not configured. Set OPENAI_API_KEY to generate vocabulary.",
      );
    }

    let discovery: ThemeDomainDiscovery;
    let domainsToProcess: DomainMetadata[];

    if (retryDomains && retryDomains.length > 0) {
      // Retry mode: load existing discovery from saved metadata
      discovery = this.loadSavedDiscovery(theme);
      if (!discovery) {
        throw new Error(
          `No saved domain discovery found for theme "${theme}". Run full generation first.`,
        );
      }
      domainsToProcess = discovery.domains.filter((d) =>
        retryDomains.includes(d.name),
      );
    } else {
      // Full generation: discover domains first (Prompt 1)
      onProgress?.({
        stage: "discovering",
        theme,
        totalDomains: 0,
        processedDomains: 0,
        successfulDomains: 0,
        failedDomains: [],
        domainResults: [],
        message: `Discovering domains for "${theme}"...`,
      });

      discovery = await DomainDiscoveryService.discoverDomains(theme);

      // Save discovery metadata for future retries
      this.saveDiscovery(theme, discovery);

      domainsToProcess = discovery.domains;
    }

    const totalDomains = domainsToProcess.length;
    const domainResults: DomainResult[] = [];
    const failedDomains: string[] = [];
    let successfulDomains = 0;

    // Ensure theme directory exists
    this.ensureThemeDir(theme);

    // Process each domain independently (Prompt 2 + Prompt 3)
    for (let i = 0; i < domainsToProcess.length; i++) {
      const domain = domainsToProcess[i];

      onProgress?.({
        stage: "generating",
        theme,
        totalDomains,
        processedDomains: i,
        successfulDomains,
        failedDomains,
        domainResults,
        currentDomain: domain.name,
        currentDomainIndex: i + 1,
        message: `[${i + 1}/${totalDomains}] Generating vocabulary for "${domain.name}"...`,
      });

      try {
        // Prompt 2: Generate raw vocabulary for this domain
        const rawVocabulary =
          await VocabularyGenerationService.generateDomainVocabulary(
            theme,
            domain,
          );

        onProgress?.({
          stage: "cleaning",
          theme,
          totalDomains,
          processedDomains: i,
          successfulDomains,
          failedDomains,
          domainResults,
          currentDomain: domain.name,
          currentDomainIndex: i + 1,
          message: `[${i + 1}/${totalDomains}] Cleaning and classifying "${domain.name}"...`,
        });

        // Prompt 3: Clean and classify
        const finalVocabulary =
          await VocabularyCleanupService.cleanupAndClassify(
            rawVocabulary,
            domain,
          );

        // Save the final domain vocabulary file
        const fileName = this.saveDomainVocabulary(theme, domain, finalVocabulary);

        successfulDomains++;
        domainResults.push({
          domainName: domain.name,
          fileName,
          success: true,
          wordCount: finalVocabulary.statistics.totalFinalUniqueWords,
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        failedDomains.push(domain.name);
        domainResults.push({
          domainName: domain.name,
          fileName: normalizeFilename(domain.name),
          success: false,
          error: errorMsg,
          wordCount: 0,
        });
        console.error(
          `[Pipeline] Domain "${domain.name}" failed: ${errorMsg}`,
        );
        // Continue to next domain — one failure does not stop the pipeline
      }
    }

    const progress: PipelineProgress = {
      stage: "complete",
      theme,
      totalDomains,
      processedDomains: totalDomains,
      successfulDomains,
      failedDomains,
      domainResults,
      message: `Complete: ${successfulDomains}/${totalDomains} domains successful${failedDomains.length > 0 ? `, ${failedDomains.length} failed` : ""}`,
    };

    onProgress?.(progress);
    return progress;
  }

  /**
   * Save domain vocabulary to a JSON file.
   */
  private static saveDomainVocabulary(
    theme: string,
    domain: DomainMetadata,
    vocabulary: DomainVocabularyFile | any,
  ): string {
    const themeDir = normalizeThemeDir(theme);
    const domainFile = normalizeFilename(domain.name);
    const dirPath = path.join(process.cwd(), WORD_LISTS_BASE, themeDir);

    this.ensureDir(dirPath);

    const filePath = path.join(dirPath, `${domainFile}.json`);

    const fileContent: DomainVocabularyFile = {
      ...vocabulary,
      domainId: domain.id,
      domainName: domain.name,
      description: domain.description,
      richness: domain.richness,
      priority: domain.priority,
      generationFocus: domain.generationFocus,
    };

    fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), "utf-8");

    return domainFile;
  }

  /**
   * Save domain discovery metadata for future retries.
   */
  private static saveDiscovery(
    theme: string,
    discovery: ThemeDomainDiscovery,
  ): void {
    const themeDir = normalizeThemeDir(theme);
    const dirPath = path.join(process.cwd(), WORD_LISTS_BASE, themeDir);
    this.ensureDir(dirPath);

    const filePath = path.join(dirPath, "_domains.json");
    fs.writeFileSync(filePath, JSON.stringify(discovery, null, 2), "utf-8");
  }

  /**
   * Load saved domain discovery metadata.
   */
  private static loadSavedDiscovery(
    theme: string,
  ): ThemeDomainDiscovery | null {
    const themeDir = normalizeThemeDir(theme);
    const filePath = path.join(
      process.cwd(),
      WORD_LISTS_BASE,
      themeDir,
      "_domains.json",
    );

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as ThemeDomainDiscovery;
    } catch {
      return null;
    }
  }

  /**
   * Ensure the theme directory exists.
   */
  private static ensureThemeDir(theme: string): void {
    const themeDir = normalizeThemeDir(theme);
    const dirPath = path.join(process.cwd(), WORD_LISTS_BASE, themeDir);
    this.ensureDir(dirPath);
  }

  /**
   * Ensure a directory exists, creating it if needed.
   */
  private static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
