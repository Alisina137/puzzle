Technical Architecture Design

1. Document Overview

1.1 Purpose

This document defines the implementation-ready technical architecture for the Puzzle Book Generator application. It translates the product requirements into a practical system design that supports the MVP while remaining extensible for future puzzle types and publishing features.

1.2 MVP Scope

The MVP focuses on generating high-quality Word Search puzzle books.

Users can:

Enter a book title

Select the number of puzzles

Select a theme

Generate a complete puzzle book

Review generated puzzles

Regenerate an individual puzzle

Reorder puzzles using drag and drop

Automatically renumber puzzles after reordering

Preview puzzles and solutions

Run KDP-oriented preflight checks

Export a professionally formatted PDF

Future puzzle types such as Sudoku, Maze, Crossword, Cryptogram, and Nonogram are outside the MVP but the architecture must allow them to be added without redesigning the core book workflow.

2. Architecture Principles

The system follows these principles:

Modular monolith first: keep the application simple to develop and deploy while maintaining clear domain boundaries.

Deterministic puzzle generation: puzzle generation and validation are algorithmic and must not depend on an AI model for correctness.

Validation before persistence: a puzzle must pass validation before becoming an accepted book puzzle.

Immutable puzzle versions: regeneration creates a new version rather than destroying historical data.

Book-owned ordering: puzzle order belongs to the BookPuzzle relationship, not to the generic puzzle entity.

Server-side generation and export: CPU-intensive generation, validation, and PDF creation remain on the server/worker side.

Database integrity: important invariants are enforced by both application logic and database constraints.

Extensibility: future puzzle engines plug into the same book, generation, validation, and export architecture.

Progressive infrastructure: use only the infrastructure required for the current product stage and add services when justified.

3. High-Level System Architecture

                           ┌─────────────────────┐
                           │       Browser       │
                           │ Next.js React UI    │
                           └──────────┬──────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │    Next.js App      │
                           │ UI + Route Handlers │
                           │ Server Components   │
                           └──────────┬──────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
             ┌────────────┐   ┌─────────────┐   ┌──────────────┐
             │ Book Module│   │ Puzzle      │   │ Export Module│
             │            │   │ Module      │   │              │
             └─────┬──────┘   └──────┬──────┘   └──────┬───────┘
                   │                 │                 │
                   │                 ▼                 │
                   │        ┌────────────────┐         │
                   │        │ Generation     │         │
                   │        │ Engine         │         │
                   │        └───────┬────────┘         │
                   │                │                  │
                   │                ▼                  │
                   │        ┌────────────────┐         │
                   │        │ Validation     │         │
                   │        │ + Duplicate    │         │
                   │        │ Detection      │         │
                   │        └───────┬────────┘         │
                   │                │                  │
                   └────────────────┼──────────────────┘
                                    │
                  ┌─────────────────┼──────────────────┐
                  │                 │                  │
                  ▼                 ▼                  ▼
          ┌─────────────┐   ┌─────────────┐    ┌──────────────┐
          │ PostgreSQL  │   │ Redis/Queue  │    │ File Storage │
          │ + Prisma    │   │ + BullMQ     │    │ PDF exports  │
          └─────────────┘   └──────┬──────┘    └──────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │ Persistent      │
                           │ Worker Service  │
                           └─────────────────┘

The application is a modular monolith. The modules are separated logically in the codebase but are deployed as one main application. Background workers are separated from the web process because puzzle generation and PDF generation can be long-running operations.

4. Recommended Technology Stack

Layer

Technology

Purpose

Frontend

Next.js + TypeScript

Application UI and server-side application framework

UI

Tailwind CSS + component system

Responsive interface

State

Zustand

Local/editor state where needed

Server data

TanStack Query where appropriate

Client-side server state and caching

Forms

React Hook Form + Zod

Form handling and validation

Drag & Drop

dnd-kit

Puzzle reordering

Backend

Next.js Route Handlers / server modules

Application API and business logic

Database

PostgreSQL

Persistent relational data

ORM

Prisma

Database access and migrations

Queue

Redis + BullMQ

Background generation/export jobs

Puzzle engine

TypeScript

Deterministic Word Search generation

Validation

TypeScript

Puzzle correctness and quality validation

PDF

Server-side PDF generation library

Book export

Authentication

Current supported Auth.js-compatible setup

User authentication/session management

Testing

Vitest + Testing Library + Playwright

Unit, integration, and E2E testing

Local infrastructure

Docker Compose

PostgreSQL and Redis

Production web

Vercel or equivalent

Next.js application

Production worker

Persistent worker environment

BullMQ generation/export worker

File storage

Object storage in production

Generated PDF files

Technology versions should use current stable releases compatible with the project at implementation time rather than locking the architecture to outdated major versions.

5. Application Modules

5.1 Authentication Module

Responsibilities:

Registration/login

Session management

Protected routes

User identity

Authorization checks

The authentication implementation should use the currently supported Auth.js/Next.js-compatible approach at implementation time.

5.2 User Module

Responsibilities:

User profile

User-owned books

Usage limits

Future subscription information

5.3 Book Module

Responsibilities:

Create books

Update book metadata

Retrieve books

Manage book status

Manage book-puzzle relationships

Reorder puzzles

Delete/archive books

5.4 Puzzle Module

Responsibilities:

Represent puzzles

Store puzzle data

Manage puzzle versions

Retrieve puzzle previews

Manage puzzle status

5.5 Generation Module

Responsibilities:

Generate Word Search puzzles

Select words from themes

Place words in grids

Apply generation constraints

Retry failed generation

Produce generation metadata

5.6 Validation Module

Responsibilities:

Validate grid structure

Validate every target word

Validate recorded word locations

Validate solution data

Calculate quality score

Reject invalid puzzles

5.7 Duplicate Detection Module

Responsibilities:

Generate puzzle fingerprints

Detect exact duplicates

Detect overly similar puzzles

Prevent duplicate puzzles from entering a book

5.8 Theme Module

Responsibilities:

Manage predefined themes

Manage theme word lists

Support custom themes

Normalize and validate words

5.9 Export Module

Responsibilities:

Build book pages

Render puzzle pages

Render solution pages

Apply templates

Generate PDF

Store export metadata

Provide export/download information

5.10 KDP Preflight Module

Responsibilities:

Validate page dimensions

Validate margins

Validate page count

Validate required export settings

Detect obvious formatting problems

Produce a human-readable preflight report

The preflight system provides technical checks; it does not guarantee acceptance by Amazon KDP.

6. Puzzle Generation Architecture

The Word Search engine is deterministic and independent of the UI.

Generation Request
       │
       ▼
Theme + Configuration
       │
       ▼
Word Selection
       │
       ▼
Grid Initialization
       │
       ▼
Word Placement
       │
       ▼
Fill Remaining Cells
       │
       ▼
Validation
       │
       ├── Invalid ──► Retry
       │
       ▼
Duplicate Detection
       │
       ├── Duplicate ─► Retry
       │
       ▼
Quality Scoring
       │
       ▼
Create PuzzleVersion
       │
       ▼
Attach to BookPuzzle

The generator should have a configurable maximum number of attempts. A failed attempt must not be exposed to the user as a completed puzzle.

7. Word Search Generation Rules

The MVP generator should support:

Configurable grid size

Configurable word count

Horizontal placement

Vertical placement

Diagonal placement

Forward and reverse directions where enabled

Controlled intersections

Theme-specific word selection

Configurable difficulty

Every generated puzzle must contain all intended words and all recorded coordinates must be correct.

The generator must never rely on an LLM to decide whether a puzzle is valid.

8. Validation Pipeline

Every puzzle passes through validation before being accepted.

Validation stages

Schema validation

Grid dimension validation

Word list validation

Word placement validation

Solution validation

Duplicate detection

Quality scoring

Minimum quality requirements

Every requested word exists in the grid

Every stored placement is correct

No placement falls outside the grid

Grid contains only valid characters

Solution locations match the puzzle

Puzzle meets configured word-count requirements

Puzzle does not violate duplicate/similarity rules

Invalid puzzles are discarded and regenerated.

9. Duplicate Detection

Each puzzle receives a deterministic fingerprint based on relevant puzzle characteristics.

The duplicate system should support:

Exact duplicate detection

High-similarity detection

Book-level duplicate prevention

The initial implementation should prioritize correctness and predictable performance. More advanced similarity algorithms can be introduced later if required.

10. Background Job Architecture

Long-running operations use BullMQ with Redis.

Generation job flow

User creates book
       │
       ▼
Create Book
       │
       ▼
Create GenerationJob
       │
       ▼
Add job to Redis/BullMQ
       │
       ▼
Persistent Worker
       │
       ├── Generate puzzle
       ├── Validate
       ├── Detect duplicate
       ├── Save version
       └── Update progress
       │
       ▼
Book becomes READY

Job requirements

Unique job identifiers

Retry policy

Maximum attempts

Failure handling

Progress updates

Idempotent processing where practical

Recoverable failures

Logging

A persistent worker environment should be used for BullMQ workers rather than Vercel serverless functions.

11. Book Generation Data Flow

User
 │
 │ Title + Count + Theme
 ▼
Create Book
 │
 ▼
Queue Generation Job
 │
 ▼
Worker
 │
 ├── Select words
 ├── Generate puzzle
 ├── Validate
 ├── Check duplicate
 ├── Create PuzzleVersion
 └── Create/Update BookPuzzle
 │
 ▼
Progress updates
 │
 ▼
All puzzles complete
 │
 ▼
Book READY

The user interface should display meaningful progress, including:

Current progress

Number completed

Number remaining

Failed/retried attempts where appropriate

Completion state

Error state

12. Individual Puzzle Regeneration

Regeneration is performed at the individual BookPuzzle level.

User clicks Regenerate
        │
        ▼
Create regeneration job
        │
        ▼
Generate replacement
        │
        ▼
Validate
        │
        ▼
Duplicate check
        │
        ▼
Create new PuzzleVersion
        │
        ▼
Update BookPuzzle.currentVersion
        │
        ▼
Refresh puzzle preview

The previous version is preserved as history.

The puzzle's position in the book does not change during regeneration.

13. Reordering Architecture

Ordering belongs to BookPuzzle.

Book
 ├── BookPuzzle position 0
 ├── BookPuzzle position 1
 ├── BookPuzzle position 2
 └── ...

When a user reorders puzzles:

The UI performs optimistic reordering where appropriate.

The client sends the new order to the server.

The server validates ownership and the requested puzzle set.

The server updates positions in a database transaction.

Display numbers are recalculated from position.

The editor receives the confirmed order.

displayNumber should not become a second independent source of truth. Position is authoritative.

14. Database Architecture

PostgreSQL is the primary persistent database.

Core entities:

User
 │
 └── Book
      │
      ├── BookPuzzle ── Puzzle
      │                  │
      │                  └── PuzzleVersion
      │
      ├── GenerationJob
      │      └── GenerationAttempt
      │
      └── Export

Theme
 │
 └── ThemeWord

Additional relationships and exact constraints are defined in:

docs/10-data-architecture.md

The database must enforce critical integrity rules such as unique puzzle positions within a book.

15. Puzzle Versioning

A puzzle is treated as a logical entity with immutable versions.

Puzzle
 │
 ├── Version 1
 ├── Version 2
 └── Version 3

When a user regenerates a puzzle:

The old version remains available in history.

A new version is generated.

The new version becomes the active version for the book.

The book position remains unchanged.

This architecture supports future undo/history features without redesigning the puzzle model.

16. API Architecture

The application uses server-side route handlers/modules organized by domain.

Book APIs

POST   /api/books
GET    /api/books
GET    /api/books/:bookId
PATCH  /api/books/:bookId
DELETE /api/books/:bookId

Puzzle APIs

GET    /api/books/:bookId/puzzles
GET    /api/books/:bookId/puzzles/:puzzleId
POST   /api/books/:bookId/puzzles/:puzzleId/regenerate

Ordering API

PATCH /api/books/:bookId/puzzles/reorder

Generation APIs

POST /api/books/:bookId/generate
GET  /api/books/:bookId/generation

Theme APIs

GET /api/themes
GET /api/themes/:themeId

Export APIs

POST /api/books/:bookId/export
GET  /api/books/:bookId/exports
GET  /api/exports/:exportId

Preflight API

POST /api/books/:bookId/preflight

Every protected endpoint must verify that the authenticated user owns or has authorized access to the requested resource.

17. API Design Rules

All APIs should:

Validate input with Zod or equivalent schemas

Authenticate protected requests

Authorize resource ownership

Return consistent error structures

Use appropriate HTTP status codes

Avoid exposing internal implementation details

Log unexpected server errors

Support idempotency where background operations require it

Example error:

{
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "The requested book could not be found."
  }
}

18. Frontend Architecture

The frontend uses Next.js App Router.

Recommended structure:

src/
├── app/
│   ├── (marketing)/
│   ├── auth/
│   ├── dashboard/
│   ├── books/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── books/
│   ├── puzzles/
│   ├── editor/
│   └── export/
│
├── features/
│   ├── auth/
│   ├── books/
│   ├── puzzles/
│   ├── generation/
│   ├── themes/
│   └── exports/
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── validation/
│   └── utils.ts
│
└── server/
    ├── books/
    ├── puzzles/
    ├── generation/
    └── exports/

Domain logic should not be scattered throughout React components.

19. State Management

Use server state and client/editor state appropriately.

Server state

Examples:

Books

Puzzle records

Generation status

Export status

Use server components or TanStack Query where client-side synchronization is required.

Client state

Examples:

Selected puzzle

Editor selection

Drag state

Preview state

Temporary UI state

Zustand should only be introduced where local/global client state genuinely benefits from it.

The database remains the source of truth for persistent book state.

20. PDF and Export Architecture

PDF generation runs server-side.

Book
 │
 ▼
Preflight
 │
 ├── Failed ──► Report errors
 │
 ▼
Build document
 │
 ├── Front matter
 ├── Puzzle pages
 ├── Answer/solution pages
 └── Optional end matter
 │
 ▼
Generate PDF
 │
 ▼
Validate generated file
 │
 ▼
Store export
 │
 ▼
Return export status

The export system should be template-driven so future templates can be added without rewriting the entire PDF engine.

The first version should prioritize:

Correct page dimensions

Reliable margins

Consistent typography

Clear puzzle grids

Readable word lists

Correct solution pages

Predictable page numbering

Print-friendly output

21. KDP Preflight Architecture

The preflight system should check technical requirements relevant to the selected export configuration.

Checks include:

Page dimensions

Margins

Page count

Blank/invalid pages

Puzzle/solution consistency

Required document settings

Output file integrity

The system should return:

PASS
WARNING
ERROR

with actionable messages.

KDP requirements can change, so the preflight rules should be implemented as configurable validation rules rather than hard-coded throughout the export system.

22. File Storage

Development

Generated files may use local storage:

./storage/

Production

Use object storage for generated PDFs and other persistent files.

The application should store metadata in PostgreSQL and the actual binary file in object storage.

Example:

Export
 ├── id
 ├── bookId
 ├── status
 ├── fileName
 ├── storageKey
 ├── createdAt
 └── completedAt

Do not store large PDF binaries directly inside PostgreSQL.

23. Infrastructure

Development

Developer Machine
│
├── Next.js
├── PostgreSQL (Docker)
└── Redis (Docker)

Production

                     ┌──────────────┐
                     │    Users     │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Web Hosting  │
                     │ Next.js App  │
                     └──────┬───────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        PostgreSQL       Redis         Object Storage
             ▲              ▲
             │              │
             └──────┬───────┘
                    │
             ┌──────▼───────┐
             │ Worker       │
             │ Generation  │
             │ + Export    │
             └──────────────┘

The exact production providers may be selected during deployment. The important architectural requirement is that the web application and persistent worker can scale independently.

24. Security Architecture

Security requirements include:

Secure authentication/session handling

Passwords must never be stored in plaintext

Environment secrets must not be committed to Git

Authorization checks on every protected resource

Input validation

Output escaping where necessary

Protection against unauthorized book access

Rate limiting for expensive generation/export operations

Secure file access

Secure production database credentials

HTTPS in production

Appropriate security headers

A user must never be able to access another user's books, puzzles, exports, or generation jobs.

25. Performance Requirements

Target MVP performance:

Normal dashboard/API interactions: generally under 500 ms where practical

Reordering: server confirmation generally under 1 second under normal conditions

Individual regeneration: target under 3 seconds for normal successful generation

PDF export: target under 30 seconds for a 100-puzzle book under normal conditions

Performance targets are goals rather than guarantees and should be validated with real measurements.

Large puzzle lists should use pagination or virtualization where appropriate.

26. Reliability Requirements

The system must handle:

Generation failures

Duplicate generation

Worker restarts

Temporary Redis failures

Database errors

PDF generation failures

User refresh during generation

Browser disconnection during generation

Background jobs must be retryable.

A failed job must leave the book in a recoverable state rather than corrupting its puzzle ordering or versions.

27. Observability

The MVP should provide sufficient logging to diagnose:

Generation failures

Validation failures

Duplicate detections

Job failures

Export failures

Database errors

Unexpected API errors

Important events should include:

User/book identifier where safe

Job identifier

Operation type

Duration

Error code

Retry count

Sensitive information must not be logged.

28. Testing Architecture

Unit tests

Test:

Word placement

Grid generation

Validation

Duplicate detection

Solution generation

Numbering logic

Preflight rules

Integration tests

Test:

Database operations

Book generation pipeline

Regeneration

Reordering transactions

Export creation

End-to-End tests

Test the primary user flow:

Create account
→ Create book
→ Generate
→ Review
→ Regenerate
→ Reorder
→ Preview
→ Preflight
→ Export

The puzzle engine should have a particularly strong automated test suite because puzzle correctness is a core product requirement.

29. Deployment Strategy

Development

npm install
docker compose up -d
npx prisma migrate dev
npm run dev

Production

The deployment should include:

Build application

Apply production database migrations

Deploy web application

Deploy persistent worker

Configure Redis

Configure object storage

Configure environment secrets

Run smoke tests

Monitor logs and worker health

Database migrations must be applied before application code that depends on new schema changes.

30. CI/CD

The CI pipeline should run:

Install dependencies
      ↓
Lint
      ↓
Type check
      ↓
Unit tests
      ↓
Integration tests
      ↓
Build
      ↓
E2E tests where configured
      ↓
Deploy

Pull requests should not be merged when required checks fail.

31. Technical Decisions and Rationale

Next.js

Selected because it provides:

React-based UI

App Router

Server Components

Route Handlers

Strong TypeScript support

Straightforward deployment

PostgreSQL

Selected because:

The core data is relational

Strong constraints are required

Transactions are important

JSONB supports puzzle-specific structures

It scales beyond MVP requirements

Prisma

Selected because:

Strong TypeScript integration

Migration support

Clear relational modeling

Productive development workflow

Redis + BullMQ

Selected because:

Generation can be CPU-intensive

PDF generation can be long-running

Jobs need retry support

Progress and failure handling are easier with a queue

Modular Monolith

Selected because:

Faster development

Easier local development

Lower infrastructure complexity

Clear module boundaries

Easy future extraction if a component genuinely needs independent scaling

Deterministic Puzzle Engine

Selected because:

Puzzle correctness must be guaranteed

Validation must be reproducible

Costs are predictable

Generation does not depend on external AI availability

The engine can be extensively tested

32. Scalability Strategy

The MVP should be designed to support at least:

100+ books per user

1,000+ puzzles in a book where plan limits allow

Multiple concurrent generation jobs

Multiple concurrent users

Scaling strategy:

Optimize database queries

Add appropriate indexes

Move expensive work to workers

Add Redis caching where justified

Scale worker processes

Scale web application independently

Introduce more specialized services only when actual load requires them

The architecture should not introduce microservices prematurely.

33. Future Puzzle Type Architecture

Future puzzle types should implement a common conceptual interface:

interface PuzzleEngine {
  generate(config: PuzzleGenerationConfig): Promise<PuzzleResult>;
  validate(puzzle: PuzzleResult): ValidationResult;
  generateSolution(puzzle: PuzzleResult): SolutionResult;
  fingerprint(puzzle: PuzzleResult): string;
}

Future engines may include:

WordSearchEngine
SudokuEngine
MazeEngine
CrosswordEngine
CryptogramEngine
NonogramEngine

The Book, GenerationJob, Export, and user workflows should remain largely independent of the specific puzzle type.

34. Core Domain Flow

The complete MVP architecture can be summarized as:

User
 │
 ▼
Book Creation
 │
 ├── Title
 ├── Puzzle Count
 └── Theme
 │
 ▼
Generation Job
 │
 ▼
Word Search Engine
 │
 ▼
Validation
 │
 ▼
Duplicate Detection
 │
 ├── Failed/Duplicate ──► Regenerate
 │
 ▼
Puzzle Version
 │
 ▼
BookPuzzle
 │
 ▼
Book Editor
 │
 ├── Preview
 ├── Regenerate
 └── Reorder
 │
 ▼
KDP Preflight
 │
 ▼
PDF Export
 │
 ▼
Stored Export

35. Architecture Acceptance Criteria

The architecture is considered ready for implementation when:

The MVP architecture is clearly defined

The modular boundaries are documented

The Word Search generation pipeline is defined

Validation and duplicate detection are included

Regeneration/versioning is defined

Book ordering is defined

Database responsibilities are defined

API boundaries are defined

Background job processing is defined

PDF/export architecture is defined

KDP preflight responsibilities are defined

Development and production infrastructure are defined

Security requirements are defined

Testing strategy is defined

Future puzzle types can be added without redesigning the core book workflow

36. Related Documents

docs/08-product-requirements.md — Product Requirements

docs/10-data-architecture.md — Database and Data Architecture

docs/20-development-roadmap.md — Development Roadmap

docs/21-development-environment.md — Development Environment Setup

37. Final Architecture Decision

The Puzzle Book Generator will be implemented as a Next.js modular monolith with PostgreSQL/Prisma for persistent data and Redis/BullMQ for background generation and export jobs.

The MVP will focus on a deterministic, highly validated Word Search generation engine and a simple book workflow centered around the user's three primary inputs:

Title

Puzzle count

Theme

The core differentiators are:

Individual puzzle regeneration

Drag-and-drop puzzle reordering

Automatic numbering

Synchronized solutions

Automatic validation and retry

Duplicate prevention

Professional PDF export

KDP-oriented preflight checks

The architecture intentionally avoids premature microservices and unnecessary infrastructure while preserving clean module boundaries for future expansion.