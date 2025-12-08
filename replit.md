# SwiftNest Property Management Platform

## Overview

SwiftNest is a full-stack property management web application designed for individuals and organizations to manage real estate portfolios. The platform enables users to track properties, manage units, and monitor occupancy. Its purpose is to provide an efficient workflow for property managers, builders, and real estate companies, contributing to better management of assets and optimized operational efficiency.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

-   **Framework:** React 18 with TypeScript.
-   **Build System:** Vite for fast HMR.
-   **Routing:** Wouter for client-side routing.
-   **State Management:** TanStack Query for server state; local state with React Hook Form.
-   **UI:** shadcn/ui (Radix UI primitives) with Tailwind CSS, "New York" style, and light/dark theme support.
-   **Design:** Utility-focused, responsive grid layouts, inspired by platforms like Zillow and Stripe.
-   **Layout Components:**
    -   `AppLayout`: Wrapper component with sidebar, header (with breadcrumbs), and main content area.
    -   `AppSidebar`: Collapsible navigation sidebar with grouped menu items (Overview, People, Operations, Finance, System).
-   **UI/UX Features:**
    -   Responsive sidebar navigation that collapses to icon-only mode.
    -   Dashboard with alerts (overdue rent, expiring leases), quick actions, and financial summary cards.
    -   Form layouts with section headers and responsive grids (2-column on desktop, stacked on mobile).
    -   Responsive data tables with horizontal scroll and column hiding on smaller screens.
    -   Accessibility: aria-hidden on decorative icons, aria-labels on toggles, role attributes on landmarks.

### Backend

-   **Framework:** Express.js with TypeScript on Node.js, RESTful API.
-   **Authentication:** Session-based with Passport.js (Local Strategy), Scrypt for password hashing, PostgreSQL session store.
-   **Authorization:** Centralized Collaborator Access Pattern for role-based property access (OWNER, EDITOR, VIEWER), team management with roles (ADMIN, ACCOUNTANT, MAINTENANCE_MANAGER, MAINTENANCE_STAFF, VIEWER).
-   **Database:** PostgreSQL with Drizzle ORM for type-safe operations.
-   **Schema Design:**
    -   **Multi-entity Ownership:** `Owners` table allows a single user to manage properties under multiple legal entities (Individual, Company, Trust).
    -   **Hierarchical Properties:** `Property Nodes` table for organizing property components (buildings, floors, rooms) using an adjacency list model.
    -   **Soft Deletes:** `isDeleted` flag for properties.
    -   **Enums:** Extensive use of enums for type safety across various entities.
-   **Modules:**
    -   **Maintenance:** Comprehensive issue tracking, task management, team management, materials inventory, and recurring schedules across 8 tables.
    -   **Document Management:** Centralized storage for various document types with shareable links and module-specific authorization.
    -   **Compliance Management:** Tracks licenses, permits, certificates, insurance, and legal documents with expiry dates and automated reminders. Supports 11 document types (Business License, Building Permit, Fire Safety Certificate, Health Permit, Occupancy Certificate, Insurance Policy, GST Registration, Environmental Clearance, Property Tax Receipt, Rental License, Other). Computes status as ACTIVE, EXPIRING_SOON, or EXPIRED based on expiry date and reminder lead days. Dashboard integration shows alerts for expired and expiring documents.
    -   **Accounting (Double-Entry):** Chart of Accounts, Ledger Entries, Ledger Lines for automated and manual journal entries, supporting rent collection, utility payments, loan payments, and financial reporting.
    -   **Rent Collection:** Dashboard metrics, automated invoice generation (PDF), payment recording, and overdue tracking.
    -   **User Settings:** Profile and security management with robust validation.
-   **Data Validation:** Zod schemas for runtime validation, integrated with Drizzle.
-   **Project Structure:** Monorepo (`client`, `server`, `shared`) with path aliases.

### Architectural Decisions

-   Session-based authentication (no JWTs) for simplicity and CSRF protection.
-   No global state management library; React Query handles server state effectively.
-   Drizzle ORM for lightweight, type-safe database interaction.
-   Soft deletes for data retention.
-   Owner-based multi-tenancy for data isolation.

## External Dependencies

-   **Database:** PostgreSQL (`pg`, `connect-pg-simple`).
-   **UI Components:** Radix UI, Embla Carousel, Lucide React, Class Variance Authority.
-   **Form Handling:** React Hook Form, Hookform Resolvers.
-   **PDF Generation:** `pdfkit`.
-   **File Uploads:** `multer`.
-   **Development:** Replit-specific plugins, TypeScript.
-   **Build:** Vite (client), esbuild (server).