// Domain types for the domain-based vocabulary system

export type VocabularyDifficulty = "simple" | "intermediate" | "hard";

export type BookDifficulty = "Easy" | "Medium" | "Hard" | "Expert";

export type WordSelectionMode = "single-domain" | "mixed-domain";

export type DomainRichness = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";

export interface DomainMetadata {
  id: number;
  name: string;
  description: string;
  richness: DomainRichness;
  priority: number;
  generationFocus: string[];
}

export interface ThemeDomainDiscovery {
  theme: string;
  domains: DomainMetadata[];
}

export interface RawDomainVocabulary {
  theme: string;
  subtheme: string;
  candidates: string[];
}

export interface DomainVocabularyStatistics {
  rawCandidates: number;
  duplicatesRemoved: number;
  normalizationCollisions: number;
  invalidWordsRemoved: number;
  weakThemeWordsRemoved: number;
  crossDomainWordsRemoved: number;
  artificialCompoundsRemoved: number;
  genericFillerRemoved: number;
  lengthRejected: number;
  finalSimple: number;
  finalIntermediate: number;
  finalHard: number;
  totalFinalUniqueWords: number;
}

export interface DomainVocabulary {
  theme: string;
  subtheme: string;
  statistics: DomainVocabularyStatistics;
  words: {
    simple: string[];
    intermediate: string[];
    hard: string[];
  };
}

export interface DomainVocabularyFile extends DomainVocabulary {
  domainId: number;
  domainName: string;
  description: string;
  richness: DomainRichness;
  priority: number;
  generationFocus: string[];
}

export interface LoadedDomainWords {
  simple: string[];
  intermediate: string[];
  hard: string[];
}

export interface DomainInfo {
  id: number;
  name: string;
  description: string;
  richness: DomainRichness;
  priority: number;
  generationFocus: string[];
  fileName: string;
  wordCounts: {
    simple: number;
    intermediate: number;
    hard: number;
    total: number;
  };
}

export interface ThemeDomainInfo {
  theme: string;
  themeDir: string;
  domainCount: number;
  domains: DomainInfo[];
  hasVocabulary: boolean;
}

export interface DomainSelectionResult {
  words: string[];
  domain: string;
  domains: string[];
  mode: WordSelectionMode;
  eligiblePoolCount: number;
  shortage: boolean;
  shortageAmount: number;
}
