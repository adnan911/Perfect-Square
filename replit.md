# Draw the Perfect Square

## Overview

A casual, skill-based web game where players attempt to draw a perfect square using mouse or touch input. The system analyzes the drawing using geometry-based algorithms and provides a score based on closure, angles, side equality, and straightness. Features a leaderboard to track high scores.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state and data fetching
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Animations**: Framer Motion for smooth transitions and score animations
- **Canvas**: HTML5 Canvas API for drawing interaction

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints defined in shared routes file with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL (required via DATABASE_URL environment variable)
- **Schema**: Drizzle schema definitions in `shared/schema.ts`
- **Tables**: 
  - `users` - User accounts with username/password
  - `scores` - Game scores with metrics (closure, angles, sides, straightness)

### Key Design Patterns
- **Shared Types**: Schema and route definitions shared between client and server via `@shared/*` path alias
- **Type-Safe API**: Zod schemas for request/response validation
- **Storage Abstraction**: `IStorage` interface for database operations enabling future flexibility

### Game Logic
- Geometry-based square detection algorithm in `client/src/lib/game-logic.ts`
- Evaluates drawings based on: corner detection, side validation, angle validation, closure check
- Uses vector mathematics and normalization for accurate scoring

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `/migrations` directory

### Third-Party Services
- **Google Fonts**: Custom fonts (Architects Daughter, DM Sans, Fira Code)

### Key NPM Packages
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `@tanstack/react-query`: Data fetching and caching
- `framer-motion`: Animation library
- `canvas-confetti`: Celebration effects for high scores
- `wouter`: Client-side routing
- `zod`: Runtime type validation
- `express`: HTTP server framework