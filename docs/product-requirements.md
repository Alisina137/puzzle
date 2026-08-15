# Product Requirements Document — Puzzle Book Generator

## 1. Executive Summary

The Puzzle Book Generator is a web application that allows users to create themed puzzle books with minimal configuration.

The MVP focuses on **Word Search puzzle books** and provides a simple workflow:

**Title → Puzzle Count → Theme → Generate → Review → Regenerate → Reorder → Export**

The system automatically generates, validates, and organizes puzzles while allowing users to replace individual puzzles and manually control their order.

The primary differentiation is **simplicity + quality control + editorial control**.

---

# 2. Product Vision

> For KDP publishers, hobbyists, teachers, and puzzle creators who want to produce themed puzzle books quickly without manually creating and checking every puzzle, Puzzle Book Generator is a puzzle-book creation platform that automatically generates, validates, organizes, and exports professional puzzle books. Unlike complicated publishing/design tools, it provides a simple three-input workflow while giving users precise control through individual puzzle regeneration, drag-and-drop reordering, synchronized numbering, and automatic solutions.

---

# 3. Target User Personas

## Persona 1 — KDP Publisher

**Profile:**

- Age: 25–55
- Self-publisher / online entrepreneur
- Moderate to advanced technical comfort
- Creates books regularly

**Goals:**

- Produce books quickly
- Create multiple themed books
- Minimize manual work
- Export KDP-ready PDFs

**Pain Points:**

- Time-consuming puzzle creation
- Poor-quality generated puzzles
- Manual checking
- Reformatting books
- Rebuilding books when one puzzle is bad

**Usage:**
Weekly or several times per week.

**Willingness to Pay:**
High relative to other personas because the tool directly supports commercial publishing.

---

## Persona 2 — Teacher / Educator

**Profile:**

- Age: 25–60
- Teacher or educational professional
- Moderate technical comfort

**Goals:**

- Quickly create themed worksheets
- Generate multiple puzzles
- Print/share puzzles with students

**Pain Points:**

- Manual worksheet creation
- Limited time
- Need for accurate solutions
- Need for classroom-friendly layouts

**Usage:**
Weekly or several times per month.

**Willingness to Pay:**
Low–moderate.

---

## Persona 3 — Hobbyist / Gift Creator

**Profile:**

- Age: 20–65
- Low–moderate technical comfort
- Creates books occasionally

**Goals:**

- Create personalized puzzle books
- Create gifts
- Experiment with themes

**Pain Points:**

- Professional puzzle software can be complicated
- Doesn't want to learn complex design tools

**Usage:**
Occasional.

**Willingness to Pay:**
Low.

---

## Persona 4 — Large-Print / Senior Puzzle Publisher

**Profile:**

- Publisher, caregiver, or activity provider
- Creates puzzles for older adults

**Goals:**

- Create readable puzzle books
- Generate large-print puzzles
- Produce themed books

**Pain Points:**

- Small text
- Poor layouts
- Difficult-to-read puzzle grids
- Manual formatting

**Usage:**
Weekly/monthly.

**Willingness to Pay:**
Moderate–high.

---

# 4. Primary User Journey

## Stage 1 — Discovery & Onboarding

User visits the application.

User sees:

> Create a puzzle book in minutes.

Primary CTA:

**Create Your First Book**

User signs up/logs in.

---

## Stage 2 — Book Creation

User enters:

### Title

Example:

Animal Adventures Puzzle Book

### Puzzle Count

Example:

100

### Theme

Example:

Animals

User clicks:

**Generate Book**

The system creates a background generation job.

---

## Stage 3 — Generation

System:

1. Creates theme-specific word lists.
2. Generates puzzle candidates.
3. Validates puzzles.
4. Detects duplicates.
5. Rejects invalid puzzles.
6. Automatically regenerates failures.
7. Continues until the requested number of valid puzzles exists.

Display progress:

> Generating your book...

Requested: 100
Generated: 108
Valid: 96
Rejected: 12
Regenerated: 4
Final: 100

---

## Stage 4 — Book Review

User sees all generated puzzles.

Each puzzle displays:

- Puzzle number
- Thumbnail
- Validation status
- Quality score
- Regenerate action

User can click a puzzle to view a larger preview.

---

## Stage 5 — Puzzle Editing

If the user dislikes Puzzle #37:

**Regenerate**

The system generates a replacement without changing the other puzzles.

The replacement must:

- be valid
- be unique
- match the theme
- occupy the same position.

---

## Stage 6 — Book Organization

User can drag and drop puzzles.

Example:

Puzzle #80 → Position #3.

The application automatically updates:

- puzzle numbers
- book order
- solution order
- PDF order.

No regeneration is required.

---

## Stage 7 — Export

User clicks:

**Export Book**

System performs final validation.

If valid:

Generate:

- Interior PDF
- Optional cover/export package

If errors exist:

Show actionable errors before export.

---

## Stage 8 — Post-Export

User can:

- download/export the book
- return to the project
- edit puzzles
- regenerate puzzles
- reorder puzzles
- create another book
- duplicate the current book.

---

# 5. Core Product Principles

### Principle 1 — Simple Inputs

The primary creation workflow requires only:

1. Title
2. Puzzle Count
3. Theme

### Principle 2 — Automatic Quality Control

Users should not manually verify every generated puzzle.

### Principle 3 — Individual Control

A user should never need to regenerate an entire book because of one bad puzzle.

### Principle 4 — Persistent Ordering

Puzzle order is controlled by the user.

### Principle 5 — Solutions Must Always Match

Solutions automatically follow the current puzzle order.

### Principle 6 — Requested Count Means Valid Count

If the user requests 100 puzzles, the completed book must contain 100 valid puzzles.

---

# 6. P0 Feature Specifications

## 6.1 Book Title Input

**Priority:** P0

**Description:**

Allows the user to enter the title of the puzzle book.

**User Story:**

As a user, I want to enter my own book title so that I can create a personalized puzzle book.

**Acceptance Criteria:**

- [ ] Title field is displayed during book creation.
- [ ] Title is required.
- [ ] Title is saved with the book.
- [ ] Title can be edited later.
- [ ] Title appears in book metadata.
- [ ] Title appears in the generated book where applicable.

**UI Requirements:**

Simple text input with clear character guidance.

**Technical Notes:**

Validate length and sanitize user input.

---

# 6.2 Puzzle Count Input

**Priority:** P0

**Description:**

Allows the user to specify the desired number of puzzles.

**User Story:**

As a user, I want to choose how many puzzles to generate so that I can control the size of my book.

**Acceptance Criteria:**

- [ ] User can enter a custom number.
- [ ] System validates the value.
- [ ] System respects plan limits.
- [ ] Final completed book contains the requested number of valid puzzles.
- [ ] Failed puzzle attempts do not reduce the requested final count.

**UI Requirements:**

Number input with recommended presets such as:

10 / 25 / 50 / 100 / 200.

---

# 6.3 Theme Selection

**Priority:** P0

**Description:**

Allows users to select or enter a puzzle theme.

**User Story:**

As a user, I want to choose a theme so that my puzzles contain relevant content.

**Acceptance Criteria:**

- [ ] Popular themes are displayed.
- [ ] User can search themes.
- [ ] User can enter a custom theme.
- [ ] Selected theme is stored.
- [ ] Generated puzzle content is relevant to the theme.

**Examples:**

Animals
Space
Business
Travel
Sports
Nature
Food
History.

---

# 6.4 Book Generation

**Priority:** P0

**Description:**

Generates the requested number of valid themed puzzles.

**User Story:**

As a user, I want the application to generate my complete puzzle book automatically so that I do not have to create puzzles manually.

**Acceptance Criteria:**

- [ ] Generation starts after valid inputs are submitted.
- [ ] Generation runs as a background job.
- [ ] Puzzle candidates are generated.
- [ ] Every puzzle is validated.
- [ ] Invalid puzzles are rejected.
- [ ] Failed puzzles are automatically regenerated.
- [ ] Generation completes only after the requested valid count is reached.
- [ ] User receives a completion/error status.

---

# 6.5 Progress Tracking

**Priority:** P0

**Description:**

Displays generation progress.

**User Story:**

As a user, I want to see generation progress so that I know what the application is doing.

**Acceptance Criteria:**

- [ ] Progress screen is displayed during generation.
- [ ] Requested count is shown.
- [ ] Generated count is shown.
- [ ] Valid count is shown.
- [ ] Failed/rejected count is shown.
- [ ] Final count is shown.
- [ ] Errors are displayed clearly.

---

# 6.6 Puzzle List View

**Priority:** P0

**Description:**

Displays all puzzles in the current book.

**User Story:**

As a user, I want to see all puzzles in one place so that I can review and organize my book.

**Acceptance Criteria:**

- [ ] All puzzles are displayed.
- [ ] Puzzle numbers are visible.
- [ ] Puzzle previews/thumbnails are visible.
- [ ] Regenerate action is available.
- [ ] Puzzle order is visible.
- [ ] List supports large books efficiently.

---

# 6.7 Puzzle Preview

**Priority:** P0

**Description:**

Allows users to inspect an individual puzzle.

**User Story:**

As a user, I want to preview a puzzle before exporting so that I can identify puzzles I don't like.

**Acceptance Criteria:**

- [ ] User can open an individual puzzle.
- [ ] Full puzzle is displayed.
- [ ] Puzzle number is displayed.
- [ ] Solution can be previewed.
- [ ] Validation status is displayed.
- [ ] User can regenerate the puzzle.

---

# 6.8 Individual Regeneration

**Priority:** P0

**Description:**

Allows users to replace a single puzzle.

**User Story:**

As a user, I want to regenerate only one puzzle so that I can replace an unwanted puzzle without rebuilding the entire book.

**Acceptance Criteria:**

- [ ] Every puzzle has a Regenerate action.
- [ ] Only the selected puzzle is replaced.
- [ ] Position remains unchanged.
- [ ] Puzzle number remains unchanged.
- [ ] Replacement is validated.
- [ ] Replacement is checked for duplicates.
- [ ] Replacement matches the selected theme.
- [ ] Other puzzles remain unchanged.
- [ ] User sees generation status.
- [ ] Previous version can be supported by the data model.

---

# 6.9 Drag-and-Drop Reordering

**Priority:** P0

**Description:**

Allows users to change puzzle order.

**User Story:**

As a user, I want to reorder puzzles by dragging them so that I can control the structure of my book.

**Acceptance Criteria:**

- [ ] Puzzles can be dragged.
- [ ] Puzzles can be dropped into another position.
- [ ] New order is persisted.
- [ ] No puzzle is duplicated or lost.
- [ ] Reordering does not regenerate puzzles.
- [ ] Solution order updates automatically.

---

# 6.10 Automatic Numbering

**Priority:** P0

**Description:**

Puzzle numbers are based on their current position.

**User Story:**

As a user, I want puzzle numbers to update automatically so that I don't have to renumber the book manually.

**Acceptance Criteria:**

- [ ] First puzzle is #1.
- [ ] Numbers are sequential.
- [ ] Reordering updates numbers.
- [ ] Deleted puzzles do not create numbering gaps.
- [ ] Export uses the current numbering.

---

# 6.11 Automatic Solutions

**Priority:** P0

**Description:**

Every puzzle receives a verified solution.

**User Story:**

As a user, I want solutions generated automatically so that I don't have to create answer keys manually.

**Acceptance Criteria:**

- [ ] Every final puzzle has a solution.
- [ ] Solution is generated from the actual puzzle.
- [ ] Solution is validated.
- [ ] Solutions follow puzzle order.
- [ ] Solution numbering matches puzzle numbering.
- [ ] Regenerated puzzles receive new solutions.

---

# 6.12 PDF Export

**Priority:** P0

**Description:**

Generates a professional PDF containing the completed puzzle book.

**User Story:**

As a KDP publisher, I want to export my completed puzzle book as a professional PDF so that I can publish or print it.

**Acceptance Criteria:**

- [ ] PDF contains all puzzles.
- [ ] Puzzle order matches the editor.
- [ ] Puzzle numbering is correct.
- [ ] Solutions are included.
- [ ] No missing pages.
- [ ] No invalid/empty puzzle pages.
- [ ] PDF dimensions match selected format.
- [ ] Fonts and graphics are properly rendered.

---

# 6.13 KDP Preflight

**Priority:** P0

**Description:**

Checks the generated book before export.

**User Story:**

As a KDP publisher, I want the application to check my book before export so that I can identify formatting problems before uploading it.

**Acceptance Criteria:**

- [ ] Page dimensions are checked.
- [ ] Page count is checked.
- [ ] Margins are checked.
- [ ] Bleed settings are checked where applicable.
- [ ] Images are checked.
- [ ] Fonts are checked.
- [ ] Missing solutions are detected.
- [ ] Duplicate puzzles are detected.
- [ ] Numbering is checked.
- [ ] Errors prevent final export where appropriate.
- [ ] Warnings are clearly separated from errors.

---

# 7. P1 Feature Specifications

## Add Puzzle

Allows the user to generate an additional puzzle without recreating the book.

## Delete Puzzle

Allows the user to remove a puzzle and optionally generate a replacement.

## Bulk Regeneration

Allows users to select multiple puzzles and regenerate them.

## Regeneration History

Stores previous versions of regenerated puzzles.

## Undo/Redo

Allows users to reverse organization and editing operations.

## Templates

Provides reusable book interior designs.

## Cover Generator

Generates and edits a professional book cover.

---

# 8. User Stories

### Book Creation

> As a user, I want to enter a title, puzzle count, and theme so that I can generate a puzzle book without complicated configuration.

### Generation

> As a user, I want the system to automatically generate and validate puzzles so that I don't have to manually check them.

### Regeneration

> As a user, I want to regenerate one puzzle so that I can replace it without affecting the rest of my book.

### Reordering

> As a user, I want to drag puzzles into a different order so that I can control the book structure.

### Numbering

> As a user, I want puzzle numbers to update automatically after reordering so that I don't need to manually renumber them.

### Solutions

> As a user, I want solutions to automatically follow the puzzle order so that the answer section is always correct.

### Export

> As a KDP publisher, I want a validated PDF so that I can use it for publishing.

---

# 9. Success Metrics

The following are the primary MVP metrics.

| Metric                               | Initial Target |
| ------------------------------------ | -------------: |
| Time to first generated book         |    < 5 minutes |
| Generation completion rate           |          > 95% |
| Puzzle validation success rate       |          > 95% |
| Solution accuracy                    |           100% |
| Duplicate puzzles in final books     |             0% |
| Export success rate                  |          > 98% |
| Users who generate a second book     |          > 25% |
| Users who export at least one book   |          > 30% |
| Individual regeneration success rate |          > 98% |
| Reordering operation success rate    |          > 99% |

These should initially be treated as product targets rather than guaranteed market benchmarks.

---

# 10. Quality Metrics

Critical quality requirements:

### Puzzle validity

Target: **100% of final puzzles valid**

### Solution correctness

Target: **100%**

### Duplicate rate

Target: **0% in final output**

### Export errors

Target: **<2%**

### Data loss during reordering/regeneration

Target: **0%**

---

# 11. Business Metrics

After launch, track:

- Free-to-paid conversion
- Monthly recurring revenue
- Annual recurring revenue
- Customer acquisition cost
- Customer lifetime value
- Monthly churn
- Average books/user
- Average exports/user
- AI cost/book
- Infrastructure cost/book.

Initial business targets should be established after collecting real usage data rather than assuming conversion rates before launch.

---

# 12. Feature Tiers

## P0 — MVP

### Creation

- Title input
- Puzzle count
- Theme selection
- Word Search generation

### Generation

- Automatic validation
- Duplicate detection
- Failed-puzzle automatic regeneration
- Progress tracking

### Editing

- Puzzle list
- Puzzle preview
- Individual regeneration
- Drag-and-drop reordering
- Automatic numbering

### Solutions

- Automatic solution generation
- Solution synchronization

### Publishing

- Book preview
- PDF export
- KDP preflight

---

## P1 — Post-MVP

- Add puzzle
- Delete puzzle
- Delete + replacement
- Bulk regeneration
- Regeneration history
- Undo/redo
- Multiple templates
- Cover generator
- Multiple languages
- Advanced book customization

---

## P2 — Future

- Sudoku
- Maze
- Crossword
- Cryptogram
- Nonogram
- Additional puzzle engines
- AI metadata
- Niche research
- Series management
- Team accounts
- SaaS billing
- Template marketplace
- Additional publishing marketplaces.

---

# 13. Technical Requirements

## Frontend

Use:

- Next.js
- TypeScript
- Tailwind CSS
- Component-based architecture
- Responsive design

Required frontend capabilities:

- Drag-and-drop
- Real-time/polling generation progress
- Puzzle previews
- Book preview
- Autosave
- Undo/redo architecture
- Loading states
- Error states
- Responsive layouts.

---

## Backend

Required services:

### Puzzle Generation Engine

Responsible for deterministic puzzle creation.

### Validation Engine

Responsible for verifying puzzles and solutions.

### Duplicate Detection

Responsible for preventing repeated puzzles.

### Book Management

Responsible for:

- books
- puzzles
- ordering
- versions.

### PDF Engine

Responsible for final document generation.

### Export Service

Responsible for preparing downloadable files.

### Authentication

Responsible for users and authorization.

---

# 14. Database

Use PostgreSQL with Prisma.

Core entities:

- User
- Book
- BookPuzzle
- Puzzle
- PuzzleVersion
- PuzzleSolution
- Theme
- WordList
- Word
- GenerationJob
- GenerationAttempt
- PuzzleValidation
- BookVersion
- Export
- Template.

Important design decision:

**Puzzle order must belong to the BookPuzzle relationship rather than the Puzzle itself.**

This allows the same puzzle architecture to support reordering without changing the puzzle's identity.

---

# 15. Background Jobs

Puzzle generation must use background processing.

Do not generate large books inside a single HTTP request.

Generation job responsibilities:

1. Receive book configuration.
2. Generate candidates.
3. Validate candidates.
4. Reject failures.
5. Regenerate failures.
6. Detect duplicates.
7. Continue until requested valid count is reached.
8. Update progress.
9. Mark job complete.

---

# 16. PDF Requirements

The PDF system must support:

- configurable trim sizes
- margins
- bleed
- page numbering
- puzzle pages
- solution pages
- embedded fonts
- high-resolution graphics
- correct page order.

KDP-specific configuration should be stored as configurable rules rather than hardcoded throughout the application.

---

# 17. Non-Functional Requirements

## Performance

- Normal UI interactions should feel immediate.
- Reordering should update quickly.
- Puzzle previews should load quickly.
- Large generation jobs must run asynchronously.

## Reliability

- Generation jobs must be retryable.
- Failed jobs must not corrupt books.
- Regeneration must be atomic.
- Reordering must be transactional.

## Security

- Users can only access their own books.
- API keys must never be exposed to the client.
- Uploaded files must be validated.
- All server APIs must validate authorization.

## Scalability

Architecture should support:

- 10 puzzles
- 100 puzzles
- 500 puzzles
- eventually 1,000+ puzzles.

## Data Integrity

The system must guarantee:

- no missing puzzles
- no duplicated puzzle positions
- no mismatched solutions
- no corrupted book state.

---

# 18. Constraints & Assumptions

### Constraints

1. MVP will initially support Word Search only.
2. The primary book creation flow contains only three required inputs.
3. Mathematical puzzle generation must be deterministic rather than relying on AI.
4. Large generation jobs require asynchronous processing.
5. KDP requirements may change and must therefore be configurable.
6. PDF generation must be server-side and validated before export.

### Assumptions

1. Users primarily want physical puzzle books.
2. KDP publishers are an important initial customer segment.
3. Users value speed and simplicity.
4. Users want control over individual puzzles after generation.
5. Puzzle quality is more important than maximum generation speed.
6. The product will initially focus on themed Word Search books.

---

# 19. Open Questions

The following decisions should be finalized before implementation of the relevant features:

1. Which exact puzzle type will launch first?
   **Recommendation: Word Search.**

2. Which KDP trim sizes should be supported in MVP?
   **Recommendation: start with 8.5 × 11 and add others later.**

3. Should users be required to create accounts before generation?
   **Recommendation: allow a limited trial/sample before requiring full commitment.**

4. Should cover generation be part of MVP?
   **Recommendation: no; P1.**

5. Should AI be required for the MVP?
   **Recommendation: no. Use deterministic generation first. AI can assist with themes/word lists later.**

6. Should difficulty be configurable in the first creation screen?
   **Recommendation: no. Use intelligent defaults and add advanced settings later.**

7. Should the MVP support multiple languages?
   **Recommendation: English first; multilingual support in P1.**

8. What subscription limits should be used?
   **Recommendation: determine after estimating infrastructure costs and observing beta usage.**

---

# 20. MVP Definition of Done

The MVP is complete when a user can:

- [ ] Create an account.
- [ ] Enter a book title.
- [ ] Select the number of puzzles.
- [ ] Select or enter a theme.
- [ ] Generate a complete Word Search book.
- [ ] See generation progress.
- [ ] Receive the requested number of valid puzzles.
- [ ] Review all puzzles.
- [ ] Preview individual puzzles.
- [ ] Regenerate an individual puzzle.
- [ ] Confirm the replacement is valid and unique.
- [ ] Drag and reorder puzzles.
- [ ] See automatic numbering update.
- [ ] See solutions update with puzzle order.
- [ ] Preview the complete book.
- [ ] Run KDP preflight.
- [ ] Fix blocking errors.
- [ ] Export the final PDF.
- [ ] Reopen and continue editing the project.
- [ ] Create another book.

---

# 21. Product Success Definition

The MVP should prove three things:

### 1. Users can create books quickly

Target:

**First book generated in under 5 minutes.**

### 2. Users trust the generated puzzles

Target:

**100% of final puzzles are valid and have correct solutions.**

### 3. Users find the editing workflow useful

Track:

- regeneration usage
- reordering usage
- export rate
- repeat-book creation.

The product should ultimately deliver:

> **Simple input → Intelligent generation → Verified puzzles → Easy editing → Professional export.**
