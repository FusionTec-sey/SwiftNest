# SwiftNest Property Management Platform

## Overview

SwiftNest is a full-stack property management web application designed for individuals and organizations to manage real estate portfolios. The platform enables users to track properties, manage units within properties, and monitor occupancy status. Built with a modern tech stack emphasizing type safety and developer experience, the application provides an efficient workflow for property managers, builders, and real estate companies.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR
- Wouter for lightweight client-side routing
- Single-page application (SPA) architecture with protected routes

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management
- Optimistic updates and automatic cache invalidation
- No global client state manager - server state is the source of truth
- Form state managed locally with React Hook Form

**UI Component System**
- shadcn/ui component library (Radix UI primitives)
- Tailwind CSS for utility-first styling with custom design system
- "New York" style variant with neutral color scheme
- Custom CSS variables for theme consistency
- Support for light/dark themes with localStorage persistence

**Design Principles**
- Inspired by real estate platforms (Zillow, Stripe)
- Utility-focused with minimal decoration
- Clear information hierarchy for business users
- Responsive grid layouts (mobile-first approach)
- Inter font family for professional appearance

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- RESTful API design pattern
- Session-based authentication with Passport.js
- PostgreSQL session store for production reliability

**Authentication & Authorization**
- Passport.js with Local Strategy for email/password authentication
- Scrypt-based password hashing with salts
- Session cookies (secure in production, HttpOnly)
- User context attached to requests via middleware
- Owner-based authorization (users can only access their own properties)

**Database Layer**
- Drizzle ORM for type-safe database operations
- PostgreSQL as the primary database
- Schema-first approach with TypeScript types generated from Drizzle schema
- Soft deletes for properties (isDeleted flag)
- Cascading deletes for referential integrity

**Database Schema Design**
- **Users Table**: Stores authentication credentials and account metadata (individual vs organization)
- **Properties Table**: Property details with foreign key to owner user, supports images array and soft delete
- **Units Table**: Sub-properties within a property (apartments, offices, etc.)
- **Property Collaborators Table**: Enables property sharing with role-based permissions (VIEWER/EDITOR)
- **Property Nodes Table**: Hierarchical tree structure for organizing property components (buildings, floors, flats, rooms, etc.)
  - Uses adjacency list pattern with parentId for tree relationships
  - sortOrder field maintains sibling ordering
  - nodeType enum: BUILDING, FLOOR, FLAT, VILLA, ROOM, BED, SECTION, PLOT, CUSTOM
  - metadata JSONB field for flexible node-specific data
- Enums for type safety: account_type, property_type, unit_status, collaborator_role, node_type
- Indexed columns for performance: email, ownerUserId, city, propertyId, userId, parentId

**Advanced Features**
- Soft delete: Properties use isDeleted flag for trash/restore functionality
- Property images: Stored as JSON array, uploaded via multer to /uploads/properties
- Property sharing: Invite users by email with VIEWER or EDITOR roles
- Occupancy analytics: Dashboard shows vacant/occupied counts and occupancy rate percentages
- Property Maintenance Management: Full issue tracking, task management, team management, materials inventory, and recurring schedules

**Maintenance Module (8 tables)**
- **maintenance_team_members**: Property maintenance staff with roles and contact info
- **maintenance_member_skills**: Junction table for team member skills (PLUMBING, ELECTRICAL, etc.)
- **maintenance_materials**: Inventory tracking with quantity, unit, cost, reorder threshold
- **maintenance_issues**: Issue reporting with severity (LOW/MEDIUM/HIGH/URGENT), status workflow
- **maintenance_tasks**: Task management with priority, status, assignment, estimated cost/duration
- **maintenance_task_activity**: Activity log for task status changes and updates
- **maintenance_task_materials**: Junction table for materials used in tasks
- **maintenance_schedules**: Recurring maintenance schedules with frequency (DAILY/WEEKLY/MONTHLY/etc.)

**Data Validation**
- Zod schemas for runtime validation
- Drizzle-Zod integration for automatic schema generation from database schema
- Validation at API boundary (request body parsing)
- Type sharing between client and server via shared schema file

**Project Structure**
- Monorepo structure with client/server/shared directories
- Shared schema types ensure client-server contract
- Path aliases for clean imports (@, @shared, @assets)
- Separate build processes for client (Vite) and server (esbuild)

### External Dependencies

**Database**
- PostgreSQL (required, configured via DATABASE_URL environment variable)
- Connection pooling with node-postgres (pg)
- Session store: connect-pg-simple for PostgreSQL-backed sessions

**UI Component Libraries**
- Radix UI primitives for accessible, unstyled components
- Embla Carousel for image carousels
- Lucide React for consistent iconography
- Class Variance Authority for component variant management

**Form Handling**
- React Hook Form for form state management
- Hookform Resolvers for Zod schema integration
- Client-side validation with server-side verification

**Development Tools**
- Replit-specific plugins for development environment
- Runtime error overlay for debugging
- Dev banner and cartographer for Replit integration
- TypeScript compiler for type checking (not for building)

**Build & Deployment**
- esbuild for server bundling (external dependencies excluded except allowlist)
- Vite for client bundling with code splitting
- Production build outputs to dist/ directory
- Static file serving with Express in production

**Notable Architectural Decisions**
- No JWT tokens - session-based auth chosen for simplicity and built-in CSRF protection
- No global state management library - server state via React Query is sufficient
- Drizzle ORM over Prisma - lighter weight, better TypeScript integration
- Soft deletes for data retention and audit trails
- Owner-based multi-tenancy (data isolation at application level)

## Standard Test Data

**Test User Credentials**
- Email: parthvekaria123@gmail.com
- Password: 123456789
- User ID: 1

**Test Data Summary (for User ID 1)**
- 3 Owners (1 company: SwiftNest Holdings Ltd, 2 individuals: John Smith, Marie Claire)
- 7 Properties (various types: APARTMENT, VILLA, OFFICE, SHOP, WAREHOUSE, LAND)
  - Property IDs: 3, 11, 12, 13, 14, 15, 16
  - Oceanview Apartments (11), Palm Villa Estate (12), Downtown Office Building (13), Market Square Shops (14), Industrial Warehouse (15), Hillside Development Land (16)
- 6 Tenants (4 individual, 2 company)
  - Sarah Johnson (2), Robert Brown (3), TechStart Ltd (4), Island Retail Co (5), Emma Wilson (6)
- 6 Leases (4 ACTIVE, 1 DRAFT, 1 EXPIRED)
- 14 Utility Meters (ELECTRICITY, WATER, INTERNET) with OWNER and TENANT assignments
  - Meters with assignment history: IDs 12, 14, 15, 17, 20
- 9 Utility Bills (PAID, PENDING, OVERDUE, PARTIALLY_PAID, FORWARDED statuses)
- 5 Meter Assignment History records

**Key Property IDs for Testing**
- Property 3: Original test property (Parthiv Lalji Vekaria)
- Property 11: Oceanview Apartments - has 2 meters assigned to owner
- Property 12: Palm Villa Estate - has 3 meters (2 tenant-assigned, 1 owner-assigned)
- Property 13: Downtown Office Building - has 3 meters for company tenant
- Property 14: Market Square Shops - retail property with active lease
- Property 15: Industrial Warehouse - owner-managed
- Property 16: Hillside Development Land - land for development