# SwiftNest Property Management Platform

## Overview

SwiftNest is a full-stack property management web application designed for individuals and organizations to manage real estate portfolios. The platform enables users to track properties, manage units, and monitor occupancy. Its purpose is to provide an efficient workflow for property managers, builders, and real estate companies, contributing to better management of assets and optimized operational efficiency.

## User Preferences

Preferred communication style: Simple, everyday language.

## Test Credentials

Default admin/test account for all testing:
- Email: parthvekaria123@gmail.com
- Password: 123456789

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
    -   **Permission-Aware Dashboard:** Dynamic widget system with role-based defaults:
        -   Widget Registry (`client/src/lib/widget-registry.ts`): Defines 10 widget types with required permissions
        -   Widgets: property_overview, financial_summary, rent_collection, pending_expenses, maintenance_overview, compliance_alerts, quick_actions, recent_activity, occupancy_chart, tenant_summary
        -   Permission Filtering: Widgets only display if user has ALL required permissions
        -   Default Layouts: Role-specific widget configurations for SUPER_ADMIN, PROPERTY_MANAGER, ACCOUNTANT, MAINTENANCE_SUPERVISOR, COMPLIANCE_OFFICER, VIEWER
        -   Dashboard Endpoints: `/api/dashboard/layout`, `/api/dashboard/summary`, `/api/dashboard/pending-tasks`
    -   Form layouts with section headers and responsive grids (2-column on desktop, stacked on mobile).
    -   Responsive data tables with horizontal scroll and column hiding on smaller screens.
    -   Accessibility: aria-hidden on decorative icons, aria-labels on toggles, role attributes on landmarks.
    -   **Module Crosslinks:** Comprehensive navigation between related entities:
        -   Property ↔ Tenant: Property detail shows units with tenant links; tenant detail links to property
        -   Lease ↔ Property: Lease detail links to associated property
        -   Unit → Lease: Property detail unit dropdown includes "View Lease" option
        -   Tenant → Active Leases: Tenant detail shows all active leases with links
        -   Owner → Properties: Owner cards have "View Properties" button that filters properties by owner
        -   Dashboard tasks: All pending tasks (maintenance issues, overdue invoices, compliance alerts) have clickable links to their respective detail pages

### Backend

-   **Framework:** Express.js with TypeScript on Node.js, RESTful API.
-   **Authentication:** Session-based with Passport.js (Local Strategy), Scrypt for password hashing, PostgreSQL session store.
-   **Authorization:** Comprehensive Role-Based Access Control (RBAC) system with:
    -   **Roles:** Super Admin, Property Manager, Accountant, Maintenance Supervisor, Compliance Officer, Viewer
    -   **Permissions:** 43 granular permissions across 9 modules (property, unit, tenant, lease, payment, maintenance, accounting, compliance, report)
    -   **Property Scoping:** Role assignments can be global (all properties) or scoped to specific properties
    -   **RBAC Module:** `server/rbac.ts` provides middleware and helper functions for permission checking
    -   **Admin UI:** `/admin` page for super admins to create users and assign roles
    -   **Access Precedence:** Super Admin > Owner > Property-scoped RBAC > Global RBAC > Legacy Collaborator
    -   **Storage Integration:** `canUserAccessProperty`, `getAccessiblePropertyIds`, and `getPropertiesByUserId` enforce RBAC permissions with isDeleted filtering
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
    -   **Inventory Management:** Tree-based inventory tracking system for property items and warehouse stock:
        -   **Inventory Categories:** Hierarchical tree structure with parentId for organizing items (Keys, Remotes, Appliances, etc.)
        -   **Warehouse Locations:** Track multiple storage locations with address and active status
        -   **Inventory Items:** 10 item types (KEY, REMOTE, ACCESS_CARD, APPLIANCE, FURNITURE, FIXTURE, TOOL, CONSUMABLE, ELECTRONIC, OTHER) with status tracking (AVAILABLE, ASSIGNED, DAMAGED, LOST, RETIRED)
        -   **Inventory Movements:** Full audit trail for issue/return/transfer operations with condition tracking and damage notes
        -   **Item Assignment:** Items can be assigned to properties, units, or tenants with timestamp tracking
        -   **API Endpoints:** `/api/inventory/categories`, `/api/inventory/warehouses`, `/api/inventory/items`, `/api/inventory/items/:id/issue`, `/api/inventory/items/:id/return`
        -   **Frontend:** `/inventory` page with tabs for Items, Categories (tree view), and Warehouses
        -   **Permission:** Uses `maintenance.manage_materials` permission for CRUD operations
    -   **Tenant Onboarding Workflow (Phase 2):**
        -   **Onboarding Process:** Staged workflow for new tenant move-ins with full audit trail
        -   **Workflow Stages:** CONTRACT_REVIEW → DEPOSIT_COLLECTION → INSPECTION → HANDOVER → MOVE_IN → COMPLETED
        -   **Status Tracking:** NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED with timestamps at each stage
        -   **Condition Checklist:** Room-by-room inspection with condition ratings (EXCELLENT, GOOD, FAIR, POOR, DAMAGED)
        -   **Room Types:** LIVING_ROOM, BEDROOM, KITCHEN, BATHROOM, DINING_ROOM, BALCONY, GARAGE, STORAGE, COMMON_AREA, EXTERIOR, OTHER
        -   **Photo Attachments:** Support for photos on checklist items and handover items
        -   **Inventory Integration:** Handover items link to inventory system for tracking keys, remotes, appliances handed to tenants
        -   **Database Tables:** onboarding_processes, condition_checklist_items, handover_items
        -   **API Endpoints:** `/api/onboarding`, `/api/onboarding/:id`, `/api/onboarding/:id/stage`, `/api/onboarding/:id/checklist`, `/api/onboarding/:id/handover`, `/api/tenants/:tenantId/onboarding`
        -   **Frontend:** Tenant detail page (`/tenants/:id`) with tabbed UI:
            -   Overview tab: Contact info, KYC verification, active leases, documents
            -   Onboarding tab: Visual stage stepper with 5 stages, start/complete stage buttons, process cards
            -   **Onboarding Detail Dialog:** Click "View Details" to access:
                -   Inspection Checklist tab: Add/delete room condition items with ratings
                -   Handover Items tab: Link inventory items (keys, remotes, appliances) to tenant
        -   **Permission:** Uses `tenant.manage` permission for CRUD operations
    -   **Multi-Currency Support (Phase 1 - Foundation):**
        -   **Supported Currencies:** 30 world currencies including USD, EUR, GBP, INR, AED, SCR, CAD, AUD, SGD, CHF, JPY, CNY, ZAR, NZD, HKD, SAR, QAR, KWD, BHD, OMR, MYR, THB, IDR, PHP, MXN, BRL, RUB, KRW, TRY, PKR
        -   **Exchange Rates Table:** `exchange_rates` table with baseCurrency, quoteCurrency, rate (decimal 18,8), effectiveDate, source tracking, and CRUD API endpoints
        -   **Exchange Rates Page:** Admin-only management page at `/exchange-rates` with full CRUD operations for currency exchange rates
        -   **Property Base Currency:** Each property has a `currencyCode` field (default USD) that sets the base currency for all transactions
        -   **Currency Utility:** `client/src/lib/currency.ts` provides `formatCurrency()` and `formatCurrencyCompact()` helpers with proper symbol/decimal handling
        -   **Financial Pages:** All 8 financial pages (expenses, rent-collection, leases, lease-detail, accounting, assets, loans, reports) use centralized currency formatting
        -   **Expenses Page:** Currency selector with property-based defaults and table display with currency codes
        -   **Rent Collection Page:** Property currency support for invoices, payments, and lease rent display
        -   **Accounting Page:** Loan amounts display with proper currency codes from loan.currency field
        -   **Dashboard Widgets:** All financial amounts use formatCurrency for consistent display
        -   **Property Form:** Currency selector in property creation/edit form with 30 currency options
        -   **Phase 2 Roadmap:** Dual-amount tracking, exchange rate snapshots at transaction time, currency selectors in all transaction forms
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