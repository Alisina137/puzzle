# Puzzle Book Generator

A professional puzzle book creation and KDP publishing platform that generates themed word search puzzle books with smart difficulty configuration, quality validation, and KDP-ready exports.

## Features

### Core Features
- Smart Book Creation — Configure books with title, theme, puzzle count, target audience, and difficulty level
- Intelligent Difficulty Engine — Auto-recommend and validate puzzle settings based on audience and difficulty
- Background Generation — Asynchronous puzzle generation with BullMQ and Redis
- Theme Management — Create, edit, duplicate, and organize themes with custom word lists
- Quality Validation — Automatic quality scoring with actionable recommendations

### Book Management
- Book Dashboard — View statistics, book status, and recent books
- Puzzle Reordering — Drag-and-drop puzzle reordering
- Puzzle Regeneration — Regenerate individual puzzles
- Puzzle Deletion — Remove individual puzzles
- Book Preview — Full book preview with solutions toggle

### Difficulty & Quality
- Difficulty Scoring — Each puzzle scored 0-100 with labels (Easy, Medium, Hard, Expert)
- Auto-Regeneration — Automatically regenerates puzzles that don't meet target difficulty
- Quality Dashboard — Comprehensive quality metrics and recommendations
- One-Click Fixes — Apply quality recommendations with one click

### KDP Publishing
- KDP Configuration — Trim sizes, margins, bleed, large print mode
- KDP Preflight — Validate books against KDP requirements
- KDP-Ready PDF — Export print-ready PDFs

### Export Options
- PDF Export — Professional PDF generation
- DOCX Export — Editable Word document export
- Solutions Export — Export solutions separately (PDF/TXT)

## Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, Radix UI
- Backend: Next.js API Routes, Prisma ORM
- Database: PostgreSQL (Neon)
- Queue: BullMQ, Redis (Upstash)
- Authentication: NextAuth.js
- PDF Generation: PDFKit
- DOCX Generation: Docx library
- Testing: Vitest, Testing Library
- Deployment: Vercel

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash recommended)

### Installation

1. Clone the repository:
   git clone https://github.com/Alisina137/puzzle.git
   cd puzzle

2. Install dependencies:
   npm install

3. Setup environment variables:
   cp .env.example .env
   Edit .env with your credentials

4. Run database migrations:
   npx prisma db push
   npx prisma db seed

5. Start the development server:
   npm run dev

6. Start the worker (in a separate terminal):
   npm run worker

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| NEXTAUTH_SECRET | Auth.js secret key | Yes |
| NEXTAUTH_URL | Application URL (http://localhost:3000) | Yes |
| UPSTASH_REDIS_REST_URL | Upstash Redis REST URL | Yes |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis REST Token | Yes |
| REDIS_URL | Redis connection string | Yes |
| NEXT_PUBLIC_APP_URL | Public app URL | No |

## Development Commands

| Command | Description |
|---------|-------------|
| npm run dev | Start development server |
| npm run worker | Start BullMQ worker |
| npm run dev:all | Start both server and worker |
| npm run build | Build for production |
| npm run lint | Run ESLint |
| npm run type-check | Run TypeScript type checking |
| npm run db:push | Push schema to database |
| npm run db:seed | Seed database with defaults |
| npm run db:studio | Open Prisma Studio |

## License

MIT
