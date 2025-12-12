# Event Management CMS - Design Guidelines

## Design Approach

**Selected Framework**: Design System Approach combining Linear's minimalist productivity aesthetics with Material Design's robust component structure

**Rationale**: This is a utility-focused, information-dense admin platform requiring efficiency, clarity, and consistency over visual flair. Standard UI patterns will maximize usability.

**Key Principles**:
- Clarity over decoration
- Efficiency in data entry and navigation
- Scannable information hierarchy
- Consistent patterns across modules

---

## Typography

**Font Family**: Inter (Google Fonts) for UI, JetBrains Mono for data/numbers

**Hierarchy**:
- Page Titles: text-3xl font-semibold (30px)
- Section Headers: text-xl font-semibold (20px)
- Card/Component Titles: text-lg font-medium (18px)
- Body Text: text-base font-normal (16px)
- Labels/Meta: text-sm font-medium (14px)
- Captions: text-xs (12px)

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8 for consistent rhythm
- Component padding: p-6
- Section margins: mb-8
- Card spacing: gap-4
- Form field gaps: space-y-4
- Tight groupings: gap-2

**Grid System**: 
- Main dashboard: 12-column grid
- Sidebar navigation: Fixed 256px width
- Content area: Fluid with max-w-7xl container

---

## Core Layout Structure

**Admin Dashboard Layout**:
- Fixed left sidebar (w-64) with primary navigation
- Top header bar with breadcrumbs, search, and user menu
- Main content area with module-specific views
- Right panel (collapsible) for contextual actions/filters

**Module Views**:
- List views: Data tables with sortable columns, filters, search
- Detail views: Two-column layout (main content + metadata sidebar)
- Form views: Single column, max-w-2xl, progressive disclosure for complex forms

---

## Component Library

**Navigation**:
- Sidebar: Icon + label navigation items, active state with subtle background
- Top bar: Breadcrumb navigation, global search, notification bell, user avatar dropdown
- Tabs: Underlined active state for module sub-sections

**Data Display**:
- Tables: Striped rows, hover states, sortable headers, sticky header on scroll
- Cards: Rounded borders (rounded-lg), subtle shadow, header with actions
- Stats widgets: Large number display with trend indicators
- Timeline: Vertical line with milestone markers for project tracking

**Forms**:
- Input fields: Bordered with focus ring, floating labels
- Select dropdowns: Custom styled with search capability for long lists
- Date pickers: Calendar overlay with range selection
- File uploads: Drag-and-drop zones with preview
- Rich text editor: Toolbar for email composition

**Buttons**:
- Primary: Solid background, medium weight
- Secondary: Outlined variant
- Ghost: Minimal, for table actions
- Icon buttons: For compact toolbars

**Overlays**:
- Modals: Centered with backdrop blur, max-w-2xl for forms
- Slide-overs: Right-aligned panel for quick edits
- Dropdowns: Subtle shadow, rounded corners
- Tooltips: Dark background, small text

**Status Indicators**:
- Badges: For registration status, payment status
- Progress bars: For budget tracking, event capacity
- Color-coded labels: For session types, priority levels

---

## Module-Specific Guidelines

**Attendee Registration**:
- Registration form: Multi-step wizard with progress indicator
- Attendee list: Filterable table with export capability
- Individual profile: Card-based layout with registration details, session selections

**Content Catalog**:
- Grid view of documents/resources with thumbnails
- Categorized with tag filtering
- Upload interface with bulk actions

**Agenda Builder**:
- Drag-and-drop schedule grid (days × time slots)
- Session cards with speaker, room, capacity
- Conflict detection with visual warnings

**Session Management**:
- Master list with quick filters (date, track, room)
- Detail view with speaker assignments, description, attendee count

**Speaker Management**:
- Card grid with photos, names, titles
- Profile view with bio, sessions, contact info

**Project Management**:
- Kanban board for deliverables
- Budget table with actual vs. planned, variance indicators
- Gantt-style timeline for milestones

**Marketing Tools**:
- Email composer with template selection, preview mode
- Social media calendar: Month grid with scheduled posts
- Analytics dashboard: Charts for email open rates, social engagement

---

## Images

**No large hero images** - This is a functional admin tool, not a marketing site

**Icon Usage**: Heroicons throughout for navigation, actions, and status indicators

**User-Generated Content**:
- Speaker headshots: Circular avatars (96px × 96px)
- Event branding: Logo upload area in project settings
- Social media previews: Thumbnail generation for posts

---

## Responsive Behavior

**Desktop-First**: Optimized for admin work on larger screens
- Tables collapse to stacked cards on mobile
- Sidebar becomes hamburger menu
- Multi-column forms stack to single column
- Dashboard widgets reflow to single column