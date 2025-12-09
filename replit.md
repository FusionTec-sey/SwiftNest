# SwiftNest Property Management Platform

## Overview

SwiftNest is a full-stack property management web application designed for individuals and organizations to manage real estate portfolios. The platform enables users to track properties, manage units, and monitor occupancy. Its purpose is to provide an efficient workflow for property managers, builders, and real estate companies, contributing to better management of assets and optimized operational efficiency.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

-   **Design:** Utility-focused, responsive grid layouts, inspired by platforms like Zillow and Stripe, using shadcn/ui (Radix UI primitives) with Tailwind CSS, "New York" style, and light/dark theme support.
-   **Layouts:** `AppLayout` for overall structure, `AppSidebar` for collapsible navigation, and a mobile-only quick action bar for common tasks.
-   **Dashboard:** Permission-aware dynamic widget system (`client/src/lib/widget-registry.ts`) with role-based default layouts and filtering based on user permissions.
-   **Accessibility:** Implemented with `aria-hidden`, `aria-labels`, and role attributes.
-   **Module Crosslinks:** Comprehensive navigation between related entities (e.g., Property ↔ Tenant, Lease ↔ Property).

### Technical Implementations

-   **Frontend:** React 18 with TypeScript, Vite for bundling, Wouter for routing, and TanStack Query for server state management.
-   **Backend:** Express.js with TypeScript on Node.js, providing a RESTful API.
-   **Authentication:** Session-based with Passport.js (Local Strategy) and Scrypt for password hashing.
-   **Authorization:** Comprehensive Role-Based Access Control (RBAC) system with granular permissions, property scoping, and an Admin UI for user and role management.
-   **Database:** PostgreSQL with Drizzle ORM for type-safe operations.
-   **Schema Design:** Multi-entity ownership, hierarchical property nodes using an adjacency list model, and soft deletes. Extensive use of enums for type safety.
-   **Key Modules:**
    -   **Maintenance:** Issue tracking, task management, materials inventory.
    -   **Document Management:** Centralized storage, shareable links, module-specific authorization, and compliance tracking with expiry reminders.
    -   **Accounting:** Double-entry system with Chart of Accounts, Ledger Entries for automated and manual transactions.
    -   **Rent Collection:** Dashboard metrics, automated PDF invoice generation, payment recording, and overdue tracking.
    -   **Inventory Management:** Tree-based tracking system for items, categories, and warehouse locations with movement audit trails.
    -   **Tenant Onboarding Workflow:** Staged process for new tenant move-ins, including condition checklists with photo attachments, digital signatures, integration with maintenance for damage reporting, and inventory handover.
    -   **Tenant Outboarding Workflow:** Complete move-out process with 5 stages (Notice Received, Exit Inspection, Inventory Return, Deposit Settlement, Final Checkout). Features exit condition checklist comparing against move-in records, automated deposit deduction tracking with itemized reasons (damage, cleaning, unpaid rent, etc.), refund calculation, and lease status updates upon completion.
    -   **Multi-Currency Support (Foundation):** Support for 30 world currencies, `exchange_rates` table, property-specific base currencies, and consistent currency formatting across financial pages.
    -   **Automation Features:** Integration between maintenance and expenses, onboarding auto-advance, lease renewal reminders, rent invoice auto-generation, and late fee calculation.
-   **Data Validation:** Zod schemas for runtime validation.
-   **Project Structure:** Monorepo (`client`, `server`, `shared`) with path aliases.

### System Design Choices

-   Session-based authentication for simplicity and CSRF protection.
-   No global state management library; React Query handles server state.
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