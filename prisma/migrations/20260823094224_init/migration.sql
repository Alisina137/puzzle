-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "theme" VARCHAR(100) NOT NULL,
    "puzzleCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "targetAudience" VARCHAR(50),
    "difficultyLevel" VARCHAR(50),
    "generationSettings" JSONB,
    "qualityScore" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzles" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'wordsearch',
    "data" JSONB NOT NULL,
    "difficulty" TEXT DEFAULT 'medium',
    "difficultyScore" INTEGER DEFAULT 0,
    "difficultyLabel" VARCHAR(20),
    "validationStatus" VARCHAR(20),
    "qualityMetrics" JSONB,
    "fingerprint" VARCHAR(255),
    "qualityScore" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puzzle_versions" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_puzzles" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "puzzleVersionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "displayNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_puzzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solutions" (
    "id" TEXT NOT NULL,
    "bookPuzzleId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "isValid" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "categoryId" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "description" VARCHAR(500),
    "difficulty" VARCHAR(20),
    "tags" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_words" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "word" VARCHAR(50) NOT NULL,
    "difficulty" TEXT DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedCount" INTEGER NOT NULL,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "validCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "log" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_attempts" (
    "id" TEXT NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "puzzleId" TEXT,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exports" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "url" TEXT,
    "filesize" INTEGER,
    "preflightPassed" BOOLEAN,
    "preflightErrors" JSONB,
    "preflightWarnings" JSONB,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "previewImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_word_lists" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "words" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_word_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuration_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "audience" VARCHAR(50) NOT NULL,
    "difficulty" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuration_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_quality_reports" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "totalPuzzles" INTEGER NOT NULL,
    "validPuzzles" INTEGER NOT NULL,
    "verifiedSolutions" INTEGER NOT NULL,
    "duplicates" INTEGER NOT NULL,
    "difficultyConsistency" DECIMAL(5,2),
    "warnings" JSONB,
    "recommendations" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_quality_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regeneration_requests" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "newPuzzleId" TEXT,

    CONSTRAINT "regeneration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kdp_configurations" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "trimSize" VARCHAR(50) NOT NULL,
    "hasBleed" BOOLEAN NOT NULL DEFAULT false,
    "marginTop" INTEGER NOT NULL DEFAULT 72,
    "marginBottom" INTEGER NOT NULL DEFAULT 72,
    "marginLeft" INTEGER NOT NULL DEFAULT 72,
    "marginRight" INTEGER NOT NULL DEFAULT 72,
    "gutter" INTEGER NOT NULL DEFAULT 0,
    "largePrint" BOOLEAN NOT NULL DEFAULT false,
    "pageNumbering" BOOLEAN NOT NULL DEFAULT true,
    "solutionPlacement" TEXT NOT NULL DEFAULT 'end',
    "includeSolution" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kdp_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "books_userId_idx" ON "books"("userId");

-- CreateIndex
CREATE INDEX "books_status_idx" ON "books"("status");

-- CreateIndex
CREATE INDEX "books_targetAudience_idx" ON "books"("targetAudience");

-- CreateIndex
CREATE INDEX "books_difficultyLevel_idx" ON "books"("difficultyLevel");

-- CreateIndex
CREATE INDEX "puzzles_type_idx" ON "puzzles"("type");

-- CreateIndex
CREATE INDEX "puzzles_difficultyScore_idx" ON "puzzles"("difficultyScore");

-- CreateIndex
CREATE INDEX "puzzles_fingerprint_idx" ON "puzzles"("fingerprint");

-- CreateIndex
CREATE INDEX "puzzle_versions_puzzleId_idx" ON "puzzle_versions"("puzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_versions_puzzleId_versionNumber_key" ON "puzzle_versions"("puzzleId", "versionNumber");

-- CreateIndex
CREATE INDEX "book_puzzles_bookId_position_idx" ON "book_puzzles"("bookId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "book_puzzles_bookId_position_key" ON "book_puzzles"("bookId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "book_puzzles_bookId_displayNumber_key" ON "book_puzzles"("bookId", "displayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "solutions_bookPuzzleId_key" ON "solutions"("bookPuzzleId");

-- CreateIndex
CREATE UNIQUE INDEX "themes_name_key" ON "themes"("name");

-- CreateIndex
CREATE INDEX "themes_name_idx" ON "themes"("name");

-- CreateIndex
CREATE INDEX "themes_isPublic_idx" ON "themes"("isPublic");

-- CreateIndex
CREATE INDEX "themes_categoryId_idx" ON "themes"("categoryId");

-- CreateIndex
CREATE INDEX "theme_words_themeId_idx" ON "theme_words"("themeId");

-- CreateIndex
CREATE UNIQUE INDEX "theme_words_themeId_word_key" ON "theme_words"("themeId", "word");

-- CreateIndex
CREATE INDEX "generation_jobs_bookId_idx" ON "generation_jobs"("bookId");

-- CreateIndex
CREATE INDEX "generation_jobs_status_idx" ON "generation_jobs"("status");

-- CreateIndex
CREATE INDEX "generation_attempts_generationJobId_idx" ON "generation_attempts"("generationJobId");

-- CreateIndex
CREATE INDEX "exports_bookId_idx" ON "exports"("bookId");

-- CreateIndex
CREATE INDEX "exports_userId_idx" ON "exports"("userId");

-- CreateIndex
CREATE INDEX "templates_isDefault_idx" ON "templates"("isDefault");

-- CreateIndex
CREATE INDEX "custom_word_lists_userId_idx" ON "custom_word_lists"("userId");

-- CreateIndex
CREATE INDEX "custom_word_lists_isPublic_idx" ON "custom_word_lists"("isPublic");

-- CreateIndex
CREATE INDEX "configuration_templates_audience_difficulty_idx" ON "configuration_templates"("audience", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "configuration_templates_audience_difficulty_key" ON "configuration_templates"("audience", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "theme_categories_name_key" ON "theme_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "book_quality_reports_bookId_key" ON "book_quality_reports"("bookId");

-- CreateIndex
CREATE INDEX "book_quality_reports_bookId_idx" ON "book_quality_reports"("bookId");

-- CreateIndex
CREATE INDEX "regeneration_requests_bookId_idx" ON "regeneration_requests"("bookId");

-- CreateIndex
CREATE INDEX "regeneration_requests_status_idx" ON "regeneration_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "kdp_configurations_bookId_key" ON "kdp_configurations"("bookId");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_versions" ADD CONSTRAINT "puzzle_versions_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_puzzles" ADD CONSTRAINT "book_puzzles_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_puzzles" ADD CONSTRAINT "book_puzzles_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_puzzles" ADD CONSTRAINT "book_puzzles_puzzleVersionId_fkey" FOREIGN KEY ("puzzleVersionId") REFERENCES "puzzle_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_bookPuzzleId_fkey" FOREIGN KEY ("bookPuzzleId") REFERENCES "book_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "theme_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_words" ADD CONSTRAINT "theme_words_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_attempts" ADD CONSTRAINT "generation_attempts_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_word_lists" ADD CONSTRAINT "custom_word_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_quality_reports" ADD CONSTRAINT "book_quality_reports_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regeneration_requests" ADD CONSTRAINT "regeneration_requests_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regeneration_requests" ADD CONSTRAINT "regeneration_requests_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kdp_configurations" ADD CONSTRAINT "kdp_configurations_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
