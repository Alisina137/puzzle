# Product Requirements Document — Puzzle Book Generator

## 1. Executive Summary

The Puzzle Book Generator is a web application that allows users to create themed puzzle books with minimal configuration.

The MVP focuses on **Word Search puzzle books** and provides a simple workflow:

**Title → Puzzle Count → Theme → Generate → Review → Regenerate → Reorder → Export**

The system automatically generates, validates, and organizes puzzles while allowing users to replace individual puzzles and manually control their order.

## 2. Product Vision

> For KDP publishers, hobbyists, teachers, and puzzle creators who want to produce themed puzzle books quickly without manually creating and checking every puzzle, Puzzle Book Generator is a puzzle-book creation platform that automatically generates, validates, organizes, and exports professional puzzle books. Unlike complicated publishing/design tools, it provides a simple three-input workflow while giving users precise control through individual puzzle regeneration, drag-and-drop reordering, synchronized numbering, and automatic solutions.

## 3. Core Product Principles

### Principle 1 — Simple Inputs
The primary creation workflow requires only: Title, Puzzle Count, Theme

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

## 4. P0 Feature Specifications

### 4.1 Book Title Input
**Priority:** P0
**User Story:** As a user, I want to enter my own book title so that I can create a personalized puzzle book.
**Acceptance Criteria:**
- [ ] Title field is displayed during book creation
- [ ] Title is required
- [ ] Title is saved with the book
- [ ] Title can be edited later

### 4.2 Puzzle Count Input
**Priority:** P0
**User Story:** As a user, I want to choose how many puzzles to generate so that I can control the size of my book.
**Acceptance Criteria:**
- [ ] User can enter a custom number
- [ ] System validates the value
- [ ] System respects plan limits
- [ ] Final completed book contains the requested number of valid puzzles

### 4.3 Theme Selection
**Priority:** P0
**User Story:** As a user, I want to choose a theme so that my puzzles contain relevant content.
**Acceptance Criteria:**
- [ ] Popular themes are displayed
- [ ] User can search themes
- [ ] User can enter a custom theme
- [ ] Generated puzzle content is relevant to the theme

### 4.4 Book Generation
**Priority:** P0
**User Story:** As a user, I want the application to generate my complete puzzle book automatically.
**Acceptance Criteria:**
- [ ] Generation starts after valid inputs are submitted
- [ ] Generation runs as a background job
- [ ] Puzzle candidates are generated
- [ ] Every puzzle is validated
- [ ] Invalid puzzles are rejected
- [ ] Failed puzzles are automatically regenerated
- [ ] Generation completes only after the requested valid count is reached

### 4.5 Individual Regeneration
**Priority:** P0
**User Story:** As a user, I want to regenerate only one puzzle so that I can replace an unwanted puzzle without rebuilding the entire book.
**Acceptance Criteria:**
- [ ] Every puzzle has a Regenerate action
- [ ] Only the selected puzzle is replaced
- [ ] Position remains unchanged
- [ ] Puzzle number remains unchanged
- [ ] Replacement is validated
- [ ] Replacement is checked for duplicates

### 4.6 Drag-and-Drop Reordering
**Priority:** P0
**User Story:** As a user, I want to reorder puzzles by dragging them so that I can control the structure of my book.
**Acceptance Criteria:**
- [ ] Puzzles can be dragged
- [ ] Puzzles can be dropped into another position
- [ ] New order is persisted
- [ ] No puzzle is duplicated or lost

### 4.7 Automatic Numbering
**Priority:** P0
**User Story:** As a user, I want puzzle numbers to update automatically so that I don't have to renumber the book manually.
**Acceptance Criteria:**
- [ ] First puzzle is #1
- [ ] Numbers are sequential
- [ ] Reordering updates numbers

### 4.8 Automatic Solutions
**Priority:** P0
**User Story:** As a user, I want solutions generated automatically so that I don't have to create answer keys manually.
**Acceptance Criteria:**
- [ ] Every final puzzle has a solution
- [ ] Solutions follow puzzle order
- [ ] Solution numbering matches puzzle numbering

### 4.9 PDF Export
**Priority:** P0
**User Story:** As a KDP publisher, I want to export my completed puzzle book as a professional PDF.
**Acceptance Criteria:**
- [ ] PDF contains all puzzles
- [ ] Puzzle order matches the editor
- [ ] Puzzle numbering is correct
- [ ] Solutions are included

### 4.10 KDP Preflight
**Priority:** P0
**Acceptance Criteria:**
- [ ] Page dimensions are checked
- [ ] Page count is checked
- [ ] Margins are checked
- [ ] Missing solutions are detected
- [ ] Duplicate puzzles are detected

## 5. Success Metrics

| Metric | Initial Target |
|--------|---------------:|
| Time to first generated book | < 5 minutes |
| Generation completion rate | > 95% |
| Puzzle validation success rate | > 95% |
| Solution accuracy | 100% |
| Duplicate puzzles in final books | 0% |
| Export success rate | > 98% |

## 6. MVP Definition of Done

The MVP is complete when a user can:
- [ ] Create an account
- [ ] Enter a book title, puzzle count, and theme
- [ ] Generate a complete Word Search book
- [ ] See generation progress
- [ ] Receive the requested number of valid puzzles
- [ ] Review all puzzles
- [ ] Regenerate an individual puzzle
- [ ] Drag and reorder puzzles
- [ ] See automatic numbering update
- [ ] See solutions update with puzzle order
- [ ] Preview the complete book
- [ ] Run KDP preflight
- [ ] Export the final PDF
