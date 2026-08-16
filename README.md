# Puzzle Book Generator

A web application that generates themed puzzle books with minimal configuration.

## Features

- ?? Generate themed word search puzzle books
- ?? Regenerate individual puzzles
- ?? Drag-and-drop puzzle reordering
- ?? Auto-numbering and solutions
- ?? KDP-ready PDF export

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Neon)
- **Queue:** Redis (Upstash)
- **Authentication:** NextAuth.js

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Docker (optional, for local PostgreSQL/Redis)

### Installation

1. Clone the repository:
   \\\ash
   git clone https://github.com/YOUR_USERNAME/puzzle-book-generator.git
   cd puzzle-book-generator
   \\\

2. Install dependencies:
   \\\ash
   npm install
   \\\

3. Setup environment variables:
   \\\ash
   cp .env.example .env
   # Edit .env with your credentials
   \\\

4. Run migrations:
   \\\ash
   npx prisma db push
   \\\

5. Start development server:
   \\\ash
   npm run dev
   \\\

## Project Structure

\\\
puzzle-book-generator/
??? src/
?   ??? app/          # Next.js App Router
?   ??? components/   # React components
?   ??? lib/          # Utilities (prisma, auth)
?   ??? modules/      # Feature modules
??? prisma/           # Database schema
??? docs/             # Documentation
??? storage/          # File storage
\\\

## Development Phases

- ? Phase 1: Research & Planning
- ? Phase 2: Core Infrastructure
- ? Phase 3: Puzzle Engine
- ? Phase 4: Book Creation
- ? Phase 5: Book Editor
- ? Phase 6: Export & Publishing
- ? Phase 7: Polish & Launch

## License

MIT

## Author

Your Name