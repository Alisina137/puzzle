export { ThemeCategoryService } from "./theme-category.service";
export { ThemeService } from "./theme.service";
export type { CreateCategoryInput, UpdateCategoryInput } from "./theme-category.service";
export type { CreateThemeInput, UpdateThemeInput } from "./theme.service";

// Domain-based vocabulary system
export { DomainWordSelectionService } from "./vocabulary/domain-word-selection.service";
export { VocabularyPipelineService } from "./vocabulary/vocabulary-pipeline.service";
export { AIService } from "./vocabulary/ai-service";
export { getEligibleDifficultyPools, isPoolEligible } from "./vocabulary/difficulty-pools";
export { loadThemeDomains, loadDomainWords, loadMultipleDomainWords } from "./vocabulary/word-list-loader";
export type {
  DomainMetadata,
  DomainVocabulary,
  DomainVocabularyFile,
  DomainInfo,
  ThemeDomainInfo,
  WordSelectionMode,
  BookDifficulty,
  VocabularyDifficulty,
} from "./domain/domain.types";
