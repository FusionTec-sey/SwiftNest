# SwiftNest Property Management - Design Guidelines

## Design Approach

**Selected Approach:** Design System Foundation with Real Estate Platform Inspiration

This is a utility-focused business application requiring efficiency and clarity. Drawing from successful property management and real estate platforms (Zillow property cards, Stripe form patterns, Linear dashboard efficiency), combined with Material Design principles for data-dense interfaces.

**Core Principles:**
- Clarity over decoration: Every element serves a functional purpose
- Efficient workflows: Minimize clicks, optimize form completion
- Professional trust: Clean, reliable aesthetic for business users
- Data hierarchy: Clear visual distinction between primary and secondary information

---

## Typography

**Font Stack:**
- Primary: Inter (via Google Fonts CDN)
- Fallback: system-ui, -apple-system, sans-serif

**Hierarchy:**
- Page Titles: text-3xl font-semibold (30px)
- Section Headers: text-xl font-semibold (20px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base (16px)
- Supporting Text: text-sm text-gray-600 (14px)
- Labels: text-sm font-medium uppercase tracking-wide (12px)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4, p-6, p-8
- Section spacing: space-y-6, space-y-8
- Card gaps: gap-4, gap-6
- Page margins: px-4 md:px-8 lg:px-12

**Container Strategy:**
- Max width for content: max-w-7xl mx-auto
- Form containers: max-w-2xl mx-auto
- Dashboard full-width with inner constraints

**Grid Patterns:**
- Property cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Form layouts: Single column for mobile, smart 2-column for desktop (md:grid-cols-2)
- Dashboard metrics: grid-cols-2 md:grid-cols-4 gap-4

---

## Component Library

### Navigation & Header
- Fixed header with logo left, navigation center, user menu right
- Height: h-16
- Includes: Dashboard, Properties, Add Property links
- User menu dropdown: Name, Account Type badge, Logout

### Authentication Pages (Login/Register)
- Centered card layout: max-w-md mx-auto mt-20
- Clean white card on subtle background
- Logo centered above form
- Form fields with clear labels above inputs
- **Dynamic Registration:** Radio buttons for Individual/Organization, conditional fields appear with smooth transition
- Show organization fields (Organization Name, Type, GST) only when Organization selected
- Primary action button full-width
- Secondary action link below (e.g., "Already have an account? Login")

### Dashboard
- Welcome header with user name and account type badge
- Quick stats row: Total Properties, Vacant Units, Occupied Units (if units implemented)
- Property list as cards, NOT table for better visual appeal
- Each card shows: Property image placeholder, name, type, address snippet, unit count
- Empty state: Large icon, heading, "Add your first property" CTA

### Property Cards
- Image placeholder at top (aspect-ratio-video or 16:9)
- Content padding: p-6
- Property name: text-lg font-semibold
- Type badge: Small pill with background
- Address: text-sm text-gray-600, truncated
- Footer with action buttons: View Details, Edit, Delete (icon buttons)
- Hover: Subtle shadow lift, no dramatic effects

### Forms (Add/Edit Property)
- Two-column layout on desktop for better space usage
- Sections: Basic Info, Address Details, Optional Location
- Field groups with section headers
- All inputs: Border, padding p-3, rounded corners
- Labels: Above inputs, font-medium text-sm
- Dropdown for Property Type: APARTMENT, VILLA, PLOT, OFFICE, SHOP
- Address fields: Line 1, Line 2, City, State, Country, Pincode in logical flow
- Latitude/Longitude: Optional section, clearly marked
- Action buttons: Primary "Save Property", Secondary "Cancel" aligned right

### Property Details Page
- Hero section with large property image placeholder
- Breadcrumb navigation: Dashboard > Properties > [Property Name]
- Two-column layout: Left (property info), Right (quick actions, stats)
- Info cards: Address card, Details card, Units list (if implemented)
- Units as simple table or list items with status badges
- Edit/Delete buttons in header area

### Buttons & Actions
- Primary: Solid background, medium weight, px-6 py-3, rounded-lg
- Secondary: Border style, same padding
- Danger: For delete actions, distinct styling
- Icon buttons: Square, p-2, rounded for Edit/Delete in cards
- All buttons include hover states (subtle brightness change)

### Status Badges
- Account Type: INDIVIDUAL (blue), ORGANIZATION (purple)
- Property Type: Colored pills matching type
- Unit Status: VACANT (gray), OCCUPIED (green)
- Small, rounded-full, px-3 py-1, text-xs font-medium

### Empty States
- Icon (from icon library)
- Heading: text-xl font-semibold
- Description: text-gray-600
- Primary CTA button
- Center-aligned, max-w-md mx-auto

---

## Page Layouts

### Login/Register Pages
- Full viewport height centering
- Gradient or subtle pattern background
- White card: rounded-xl shadow-lg p-8
- Form width: max-w-md

### Dashboard
- Full-width header
- Container: max-w-7xl mx-auto px-4
- Stats grid at top
- Properties grid below
- Generous vertical spacing (space-y-8)

### Property Pages
- Standard page container
- Breadcrumbs at top
- Content area with appropriate max-width
- Sticky header on scroll (optional)

---

## Icons
**Library:** Heroicons (via CDN)
- Use outline style for most UI elements
- Solid style for badges and filled states
- Common icons: Home, Building, Map, User, Pencil, Trash, Plus

---

## Images
**Property Images:** Include image placeholders in all property cards and detail pages
- Card thumbnails: aspect-ratio-video, object-cover
- Detail page hero: h-96, w-full, object-cover
- Use subtle gradient overlays if text appears on images
- Placeholder pattern: Simple property/building illustration or gradient

---

## Animations
**Minimal & Purposeful:**
- Form field focus: Border color transition
- Card hover: Shadow transition (transition-shadow)
- Dropdown menus: Fade in (transition-opacity)
- Dynamic form fields: Smooth height transition when showing/hiding organization fields
- NO page transitions, NO scroll effects

---

## Responsive Behavior
- Mobile: Single column, full-width cards, stacked forms
- Tablet: 2-column grids, side-by-side form fields
- Desktop: 3-column property grid, optimized form layouts
- Breakpoints: Follow Tailwind defaults (sm: 640px, md: 768px, lg: 1024px)