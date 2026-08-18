export interface PreflightCheck {
  name: string;
  passed: boolean;
  message?: string;
  details?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PreflightResult {
  passed: boolean;
  checks: PreflightCheck[];
  errors: PreflightCheck[];
  warnings: PreflightCheck[];
  infos: PreflightCheck[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningsCount: number;
  };
}

export interface KDPRequirements {
  pageSize: {
    width: number;
    height: number;
    allowed: Array<{ width: number; height: number; name: string }>;
  };
  margins: {
    minTop: number;
    minBottom: number;
    minLeft: number;
    minRight: number;
  };
  bleed: {
    required: boolean;
    minBleed: number;
  };
  fonts: {
    embedded: boolean;
    allowed: string[];
  };
  images: {
    minDpi: number;
    maxDpi: number;
  };
  pages: {
    minPages: number;
    maxPages: number;
  };
}