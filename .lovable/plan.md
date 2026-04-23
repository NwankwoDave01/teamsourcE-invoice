
# Multi-Tenant E-Invoicing SaaS — App Shell

Build a polished, desktop-first SaaS shell for a Nigerian e-invoicing platform with two distinct workspaces: **Tenant (Company)** and **Super Admin**. UI-only with mock data, no backend.

## Design Direction
- **Style**: Enterprise finance/compliance — clean, premium, professional. Not playful.
- **Theme**: Light theme with a refined deep indigo/slate primary, subtle neutral surfaces, and semantic status colors (green = validated, amber = in review, red = rejected, blue = submitted).
- **Typography**: Inter, tight headings, comfortable table density.
- **Components**: shadcn cards, tables, badges, filters, drawers, modals — consistent across screens.
- **Layout**: Collapsible left sidebar (icon-mini mode) + persistent top bar with workspace switcher, global search, notifications, and user menu.

## Routing Structure
- `/` → redirects to `/app/dashboard`
- **Tenant workspace** (`/app/*`) wrapped in `TenantLayout`:
  - `/app/dashboard` — KPIs, invoice status funnel, recent activity
  - `/app/customers` — customer list with filters
  - `/app/products` — products/services catalog
  - `/app/invoices` — invoice list with status pipeline filters
  - `/app/invoices/new` — Create Invoice (multi-step form layout)
  - `/app/invoices/:id` — Invoice Details with workflow timeline (Draft → … → Confirmed)
  - `/app/reports` — charts and summary tables
  - `/app/team` — users + roles (Company Admin, Finance Officer, Staff)
  - `/app/settings` — company profile, branding, tax config tabs
  - `/app/audit-logs` — searchable activity log
- **Super Admin workspace** (`/admin/*`) wrapped in `AdminLayout` with distinct accent color:
  - `/admin/overview` — platform KPIs
  - `/admin/companies` — tenants table
  - `/admin/users` — global user directory
  - `/admin/invoice-traffic` — submission volume + status mix
  - `/admin/integration-health` — NRS/FIRS connector status panels
  - `/admin/system-logs` — system-level logs
  - `/admin/settings` — platform settings
- A workspace switcher in the top bar lets you jump between Tenant and Super Admin areas.

## Shared Shell Components
- `TenantLayout` / `AdminLayout` — sidebar + top bar wrappers
- `AppSidebar` — grouped nav, active route highlight, collapsible to icon mode, always-visible trigger in header
- `TopBar` — workspace/company switcher, global search, notifications bell, help, avatar menu
- `PageHeader` — title, breadcrumbs, primary action button
- `StatusBadge` — covers all 8 invoice workflow states
- `DataTable` — reusable with filters, pagination, row actions
- `EmptyState`, `StatCard`, `KpiTile` for dashboards

## Mock Data
- 3 sample companies, ~20 customers, ~15 products, ~40 invoices spread across all workflow states, ~10 team members, ~50 audit log entries, platform-level metrics for the admin side.
- Centralized in `src/mock/` so all pages render realistic, consistent content.

## Out of Scope (this phase)
- Auth, real APIs, NRS/FIRS integration, persistence, payments, file uploads.

Result: a navigable, visually polished shell where every listed route renders a credible placeholder page ready for future feature work.
