# e-निरीक्षण - Employee Management System

## Overview

e-निरीक्षण is a comprehensive government productivity and performance evaluation platform built for the Brahmaputra Board under the e-Office framework. The system manages employee performance through KPIs (Key Performance Indicators), APARs (Annual Performance Appraisal Reports), DPRs (Daily Progress Reports), and project management. It supports both Field and HQ (Headquarters) employees with role-based access control and AI-powered features for document generation and analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 15 with App Router and TypeScript
- Server-side rendering and client-side navigation
- App Router pattern for file-based routing
- React 19 for UI components
- TypeScript for type safety

**Styling & UI**:
- Tailwind CSS 4 for utility-first styling
- Custom design system with predefined styles (buttons, cards, badges, inputs)
- Responsive design with mobile-first approach
- Light theme implementation with CSS custom properties
- Lucide React for iconography

**State Management**:
- React Context API for global state (Auth, Toast)
- Custom hooks for authentication (`useAuth`), theme (`useTheme`), and notifications (`useToast`)
- Local state management with React hooks

**Key Features**:
- Role-based dashboards (Admin vs Employee views)
- Real-time toast notifications system
- Modal components for overlays and dialogs
- Chart visualization using Recharts library
- AI workspace for document enhancement

### Backend Architecture

**API Structure**: Next.js API Routes (Route Handlers)
- RESTful API design with `/api/*` endpoints
- Middleware-based authentication using JWT
- Route protection with `authenticate()` and `requireAdmin()` wrappers
- Organized by feature domains (auth, kpi, apar, dpr, projects, users, mail, notifications)

**Authentication & Authorization**:
- JWT-based authentication with bcryptjs for password hashing
- Token stored in localStorage on client
- Session management with 7-day token expiration
- Role-based access control (admin/employee)
- Employer type differentiation (Field/HQ)

**Business Logic Layers**:
- KPI calculation engine with separate formulas for Field and HQ employees
- APAR analysis with mock scoring algorithms
- DPR submission and tracking
- Project and task management with Kanban-style workflows

### Data Storage

**Database**: MongoDB with Mongoose ODM
- Connection pooling and caching for performance
- Schema definitions with TypeScript interfaces
- Populated references for related documents

**Data Models**:
- **User**: Stores employee/admin information with role and employer type
- **KPI**: Performance indicators with weightage, targets, and scores
- **APAR**: Annual appraisals with self-assessment and reviewer feedback
- **DPR**: Daily progress reports linked to projects
- **Project**: Project management with tasks and assignments
- **Mail**: Email composition and sending history
- **Notification**: System notifications for users

**Key Design Decisions**:
- Soft delete pattern for users and projects (archived flag)
- Status enums for workflow tracking (draft → submitted → reviewed → finalized)
- Embedded subdocuments for task management within projects
- Population strategy for user references to avoid N+1 queries

### External Dependencies

**AI Services**:
- **Google Gemini API**: Used for AI-powered content generation
  - DPR summary generation (gemini-2.0-flash-exp model)
  - APAR draft creation (gemini-2.5-flash-preview model)
  - Email enhancement and professional writing
  - Configured via `GEMINI_API_KEY` environment variable

**Database**:
- **MongoDB**: Primary data store
  - Configured via `MONGO_URI` environment variable
  - Supports both local and cloud deployments (MongoDB Atlas)

**Authentication**:
- **JWT (jsonwebtoken)**: Token generation and verification
  - Secret key configured via `SESSION_SECRET` environment variable
  - 7-day token expiration policy

**Third-Party Libraries**:
- **bcryptjs**: Password hashing and verification
- **Recharts**: Data visualization and charts
- **react-hot-toast**: Toast notification system (wrapped in custom provider)
- **lucide-react**: Icon library

**Development Configuration**:
- CORS headers configured for local development (ports 3000, 5000)
- Server actions allowed for specific origins
- Cache control headers for API routes
- PostCSS with Tailwind and Autoprefixer

**Key Architectural Patterns**:
- Middleware composition for authentication/authorization
- Provider pattern for global state (Auth, Toast)
- Custom hook abstraction for reusable logic
- API route organization by domain/feature
- Environment-based configuration management
