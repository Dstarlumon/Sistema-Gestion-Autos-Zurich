# BMG+ CRM — Architecture & Design Document

**Date:** 2026-03-26
**Status:** Approved
**Author:** Claude + ipuerto

---

## 1. Project Vision

Rebuild the BMG+ BPO management platform from a monolithic HTML prototype into a production-grade application. The core philosophy is **"The Digital Architect"** — a high-performance decision engine with tonal layering, glassmorphic surfaces, and an interface that feels both authoritative and breathable.

### What exists today
- `bmg-plus-crm.html` — Main CRM with 11 views, 7 campaigns, roles, WhatsApp Callbell UI, Vitxi call center, auditing, reports, quality scoring. All data is hardcoded mock.
- `index.html` (Starlumon) — Separate project with real Google Sheets backend, campaign CRUD, user auth (SHA-256), form submission. Needs to be merged into bmg-plus.
- `Apps_Script_Sistema_Completo.js` — Google Apps Script Web App backend (being replaced).
- Stitch design references in `Ref diseno/stitch/` — 4 screen designs + DESIGN.md system specification.

### What we're building
A unified platform where:
- **Gestion is the central module** — ventas and calidad flow from it, not as separate registration modules.
- **All data is dynamic** from Supabase PostgreSQL with Row Level Security.
- **Realtime updates** via Supabase Realtime (agent status, dashboards, notifications).
- **Vitxi call center** integration is live (API available).
- **Callbell WhatsApp** is UI-ready, prepared for future API.

---

## 2. Tech Stack (Validated Versions — March 2026)

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | React | 19.2.4 |
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | 6.0.2 |
| Styling | Tailwind CSS | 4.2.2 |
| Components | shadcn/ui + Radix UI | 4.1.0 / 1.1.15 |
| Animations (app) | Motion (ex Framer Motion) | 12.38.0 |
| Micro-animations | Lottie React | 2.4.1 |
| 3D (login/landing) | Three.js + React Three Fiber | 0.183.2 / 9.5.0 |
| Charts (advanced) | Nivo | 0.99.0 |
| Charts (simple) | Recharts | 3.8.1 |
| State (global) | Zustand | 5.0.12 |
| State (server) | TanStack Query | 5.95.2 |
| Forms | React Hook Form + Zod | 7.72.0 / 4.3.6 |
| Auth + DB + Realtime | Supabase JS | 2.100.1 |
| Supabase SSR | @supabase/ssr | 0.9.0 |
| Deploy | Vercel | latest |

---

## 3. Data Model (Supabase PostgreSQL)

### Core Tables

#### Identity & Organization
```
profiles
├── id (uuid, FK → auth.users)
├── organization_id (FK → organizations)
├── full_name, phone, avatar_url
├── role (enum: coordinador | supervisor | agente)
├── status (enum: disponible | en_llamada | pausa | offline)
├── is_active (boolean)
└── created_at / updated_at

organizations
├── id, name, logo_url
└── config (jsonb — timezone, currency, max_pause, sla_hours, daily_goal)
```

#### Campaigns
```
campaigns
├── id, organization_id, name, slug (unique), color, icon, is_active

campaign_agents
├── campaign_id (FK), agent_id (FK), assigned_at

campaign_bases
├── id, campaign_id (FK), name, is_active
```

#### Tipificaciones (Recursive Tree)
```
tipificacion_tree
├── id, organization_id
├── campaign_id (FK, nullable → global if null)
├── parent_id (FK → self, null = root)
├── name, level (1-3), sort_order, is_active
```

#### Leads & Gestiones (Central Module)
```
leads
├── id, organization_id, campaign_id, agent_id, base_id
├── nombre, telefono, documento, correo, ciudad, placa
├── source (enum), status (enum: nuevo|contactado|cotizado|en_proceso|venta|no_apto|cerrado)
├── created_at          ← fecha REAL de creación del lead (puesta por coord al cargar base)
├── uploaded_at         ← fecha de carga en la plataforma (automática)
├── uploaded_by (FK)    ← quién cargó la base
├── updated_at
└── metadata (jsonb — campos extra por campaña)

gestiones
├── id, lead_id (FK), agent_id (FK), campaign_id (FK)
├── tipificacion_id (FK → tipificacion_tree)
├── canal (enum: telefono|whatsapp|email|chatbot)
├── medio, cotizacion (bool), num_cotizacion, valor_poliza
├── observacion (text)
├── attempt_number (int, auto-calculated)
├── retry_scheduled_at (timestamp — next contact for NO CONTACTO)
├── retry_notified (boolean)
├── next_contact_at (timestamp — for EN PROCESO follow-ups)
└── created_at
```

#### Sales (Created FROM gestiones when tipificacion = Venta)
```
sales
├── id, lead_id (FK), gestion_id (FK), agent_id (FK), campaign_id (FK)
├── nombre_cliente, documento, telefono, correo, placa, ciudad
├── valor_prima (numeric), num_poliza, tipo_seguro
├── canal, fuente, medio_pago
├── fecha_emision, fecha_cotizacion
└── created_at
```

#### Renewals
```
renewals
├── id, lead_id (FK), agent_id (FK), campaign_id (FK)
├── nombre, telefono, documento
├── num_poliza_original, fecha_vencimiento, placa
├── valor_actual, valor_renovacion
├── se_renovo (enum: si|no|en_proceso)
├── razon_no_renovacion, medio, observacion
└── created_at
```

#### Calls & Pauses
```
calls
├── id, agent_id (FK), external_call_id (Vitxi ID)
├── phone_number, direction (inbound|outbound)
├── status (ringing|active|completed|missed)
├── duration_seconds, recording_url
├── started_at, ended_at, metadata (jsonb)

vitxi_extensions
├── id, agent_id (FK), extension (unique), is_active

agent_pauses
├── id, agent_id (FK)
├── pause_type (enum: almuerzo|break|bano|capacitacion|retroalimentacion|otro)
├── started_at, ended_at (null = active)
```

#### WhatsApp (Prepared for Callbell API)
```
conversations
├── id, lead_id (FK nullable), agent_id (FK)
├── external_id (Callbell), contact_name, contact_phone
├── status (open|closed), unread_count, last_message_at

messages
├── id, conversation_id (FK)
├── direction (inbound|outbound), content, media_url, media_type
├── external_id, status (sent|delivered|read|failed)
└── created_at
```

#### Audit & Alerts
```
audit_log
├── id, user_id (FK), action, entity_type, entity_id
├── old_data (jsonb), new_data (jsonb), ip_address, created_at

alerts
├── id, organization_id, severity (alta|media|informativa)
├── title, message, type (sla_exceeded|pause_abuse|low_conversion|...)
├── related_agent_id (FK nullable), is_read, created_at

notifications
├── id, user_id (FK — recipient)
├── title, message, type, link (nullable), is_read, created_at
```

### Key Views
```sql
-- Contact attempt tracking per lead
CREATE VIEW lead_contact_attempts AS ...

-- Results by day of week (uses lead created_at)
CREATE VIEW lead_results_by_weekday AS ...

-- Results by hour of day (uses gestion created_at)
CREATE VIEW lead_results_by_hour AS ...

-- No-contact recovery analysis
CREATE VIEW no_contact_recovery AS ...
```

### Design Decisions
1. **organization_id everywhere** — Multi-tenant from day 1.
2. **Recursive tipificacion_tree** — Supports N levels, admin-configurable.
3. **leads separate from gestiones** — One lead, many interactions. Full timeline.
4. **created_at vs uploaded_at** — Lead creation date (set by coord when uploading base) vs system upload timestamp. Critical for accurate SLA and heatmap analytics.
5. **metadata (jsonb)** — Campaign-specific fields without schema changes.
6. **RLS on all tables** — Agente sees own data, supervisor sees campaign, coordinador sees all. Enforced at database level.

---

## 4. Project Structure

```
bmg-plus/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login/register with Three.js background
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (landing)/       # Public landing with Three.js hero
│   │   ├── (app)/           # Authenticated app with sidebar+header
│   │   │   ├── dashboard/
│   │   │   ├── gestion/     # Central module: list, /nuevo, /[id]
│   │   │   ├── ventas/      # View-only: KPIs + table + charts
│   │   │   ├── calidad/     # Analytics dashboard (funnel, heatmap, recovery)
│   │   │   ├── whatsapp/
│   │   │   ├── llamadas/
│   │   │   ├── auditoria/
│   │   │   ├── pausas/
│   │   │   ├── reportes/
│   │   │   └── admin/       # usuarios/, campanas/, tipificaciones/
│   │   └── api/
│   │       ├── webhooks/vitxi/
│   │       ├── webhooks/callbell/
│   │       └── export/
│   ├── components/
│   │   ├── ui/              # shadcn/ui generated
│   │   ├── layout/          # sidebar, header, user-menu, campaign-switcher
│   │   ├── charts/          # kpi-card, funnel, bar, pie, heatmap, trend
│   │   ├── forms/           # gestion-form, venta-form, tipificacion-cascade
│   │   ├── tables/          # data-table, columns/, table-filters
│   │   ├── three/           # login-scene, landing-hero, particles
│   │   ├── lottie/          # loading, success, empty-state, celebration
│   │   └── shared/          # page-header, status-badge, role-guard, confirm-dialog
│   ├── lib/
│   │   ├── supabase/        # client.ts, server.ts, middleware.ts, admin.ts
│   │   ├── queries/         # TanStack Query hooks per entity
│   │   ├── validations/     # Zod schemas per entity
│   │   └── utils/           # format, constants, export helpers
│   ├── stores/              # Zustand: auth, campaign, ui, realtime
│   ├── hooks/               # use-auth, use-role, use-realtime, use-campaign
│   └── types/               # database.types.ts (auto-generated), auth, api
├── supabase/
│   ├── migrations/          # 001-011 SQL migrations
│   ├── seed.sql
│   └── functions/           # Edge Functions: vitxi-webhook, generate-report
├── public/lotties/          # Lottie JSON files
└── tests/                   # Playwright (e2e) + Vitest (unit)
```

---

## 5. Authentication, Roles & Security

### Auth Flow
1. `middleware.ts` checks Supabase session cookie on every request
2. No session → redirect `/login`
3. Session valid → `(app)/layout.tsx` fetches profile (role, campaign)
4. Role doesn't allow route → redirect `/dashboard`

### Role Matrix

| Resource | Agente | Supervisor | Coordinador |
|----------|--------|------------|-------------|
| Dashboard | Own KPIs | Campaign KPIs | Global |
| Leads/Gestiones | Own | Campaign | All |
| Ventas (view) | Own | Campaign | All |
| Calidad analytics | - | View | View |
| WhatsApp | Own chats | Campaign | All |
| Llamadas | - | Monitor | All |
| Pausas | Own status | Campaign view | All |
| Auditoria | - | View alerts | All + config |
| Reportes | - | Campaign | All + export |
| Admin | - | - | Full CRUD |
| Delete records | - | - | Only coord |

### Security
- **Passwords**: Supabase Auth (bcrypt, not SHA-256)
- **Sessions**: httpOnly cookies with auto-refresh
- **RLS**: Database-level enforcement per role
- **Audit trail**: Automatic trigger on all critical tables
- **Automated alerts**: Triggers for SLA exceeded, pause abuse, low conversion
- **Rate limiting**: Supabase built-in, 5 attempts/min on auth endpoints

---

## 6. Module Design

### Module 2: Gestion (CENTRAL MODULE)

The main module. Agents never leave Gestion to register a sale or schedule a retry.

**`/gestion`** — Lead list with filters, badges, attempt counts, overdue retry alerts
**`/gestion/nuevo`** — Not used for individual entry (leads come from base upload)
**`/gestion/[id]`** — Lead detail page with:

- **Lead card**: name, phone, doc, email, city, plate, source, campaign, agent
  - Shows `created_at` (real lead date) vs `uploaded_at` (load date)
- **Timeline**: All gestiones in reverse chronological order
  - Each entry: attempt #, date/time, agent, tipificacion, canal, observation
  - Scheduled retries shown with countdown
- **New Gestion form** (inline, no navigation):
  - Tipificacion cascade (3 levels from DB)
  - Canal selection
  - Observation field
  - **Conditional sections based on tipificacion:**
    - NO CONTACTO → Schedule retry (date + time + notify option)
    - POSITIVO > Venta → Sale fields inline (prima, poliza, tipo, medio pago, etc.)
    - POSITIVO > En proceso → Cotizacion fields + next contact
    - CONTACTADO - NO COTIZA → Observation only, lead closed

**Base upload** (coord/supervisor only):
- Excel/CSV upload with mandatory "Fecha de creacion del lead" field
- Campaign assignment, agent assignment (specific or auto-rotate)
- Preview before confirm, duplicate detection by phone/document

### Module 3: Ventas (VIEW ONLY)

No registration form. Sales are created FROM gestion when tipificacion = Venta.
- KPI cards: total sales, total prima, average prima, conversion %, best agent
- Filterable table with link to source lead
- Charts: sales by agent, cumulative monthly prima, sales by campaign
- Export: Excel, PDF

### Module 4: Calidad de Leads (ANALYTICS DASHBOARD)

Answers: "Where are the leads going?" — Deep analysis based on tipificacion tree.

- **Conversion funnel** (Nivo): Leads loaded → Contacted → Quoted → In process → Sale
- **Tipificacion sunburst** (Nivo): Drill-down through all 3 levels
- **"Why don't they quote?"**: Breakdown of NO COTIZA sub-reasons
- **Heatmap by day of week** (Nivo): Uses `lead.created_at` — which days concentrate No Contact, No Sale, etc.
- **Heatmap by hour of day**: Which hours produce best/worst results
- **No-contact recovery**: How many were recovered on retry, at which attempt, average days between attempts
- **Quality by source**: % Apto, % Venta per lead source — identifies bad sources
- **Weekly trend**: % No Apto, % No Contact, % No Cotiza, % Venta over time
- **Response time (SLA)**: Time from `uploaded_at` to first gestion, per campaign and agent

### Other Modules
- **Dashboard** (`/dashboard`): Realtime KPIs, funnel, ranking, trend charts
- **WhatsApp** (`/whatsapp`): Callbell UI ready, DB schema ready, banner for API config
- **Llamadas** (`/llamadas`): Vitxi live calls, recordings, spy/whisper actions
- **Pausas** (`/pausas`): Agent status realtime, pause timer, abuse detection
- **Auditoria** (`/auditoria`): Alert feed, agent scorecard (calculated from real data), audit log
- **Reportes** (`/reportes`): Advanced reports with date range, multi-campaign, multi-agent filters. Export server-side.
- **Admin** (`/admin`): User CRUD, campaign CRUD, tipificacion tree editor, org config

---

## 7. External Integrations

### Vitxi/VitalPBX (Active)
- Webhook → `/api/webhooks/vitxi` → INSERT calls + UPDATE agent status
- API calls for spy/whisper via server-side Route Handlers (protects API keys)
- `vitxi_extensions` table maps PBX extensions to agent profiles

### Callbell/WhatsApp (Prepared)
- DB schema ready (conversations, messages tables)
- UI built with empty state when no API key configured
- Future: webhook → `/api/webhooks/callbell`, send via Edge Function

### Supabase Realtime (6 Channels)
1. `agent-status` — profiles.status changes → /pausas, sidebar
2. `active-calls` — calls table → /llamadas
3. `notifications` — filtered by user_id → header bell
4. `alerts` — new alerts → /auditoria
5. `dashboard-updates` — gestiones/sales inserts → /dashboard (debounced 5s)
6. `messages` — future Callbell → /whatsapp

### Cron Jobs (pg_cron)
- Every 5 min: Check overdue retries → notify agent; detect inactive agents → offline
- Every hour: Calculate quality scores; detect SLA breaches
- Daily 6am: Agent scorecard; daily summary for coordinator; cleanup old notifications

### Export (Server-side)
- `/api/export` Route Handler → query with role-based filters → generate Excel/PDF → streaming response

---

## 8. Design System — "The Digital Architect"

Based on Stitch references in `Ref diseno/stitch/` and `DESIGN.md`.

### Core Principles
1. **Tonal Layering** — No 1px borders for sectioning. Use surface hierarchy:
   - Base: `surface` (#faf8ff)
   - Sections: `surface-container-low` (#f2f3ff)
   - Content: `surface-container` (#eaedff)
   - Elevated: `surface-container-highest` (#dae2fd)

2. **Glassmorphism** — Floating elements (modals, dropdowns, tooltips):
   - `surface-variant` (#dae2fd) at 70% opacity
   - backdrop-blur: 12-20px
   - Gradient CTAs: primary (#00288e) → primary-container (#1e40af)

3. **Ambient Shadows** — No heavy drop shadows:
   - `0 20px 40px -12px` with `on-surface` (#131b2e) at 6% opacity

4. **Ghost Borders** — Only when needed for accessibility:
   - `outline-variant` (#c4c5d5) at 15% opacity

### Typography (Inter)
| Level | Weight | Size | Use |
|-------|--------|------|-----|
| Display | 800 | 2.75rem | Hero KPIs |
| Headline | 700 | 1.5rem | Section headers |
| Title | 600 | 1.125rem | Card titles |
| Body | 400 | 0.875rem | Data entries |
| Label | 500 | 0.6875rem | Form labels, metadata |

All numeric data uses `tabular-nums`.

### Animations
- **Login/Landing**: Three.js particle system (2000-3000 points, Perlin noise, mouse parallax, connection lines). Lazy-loaded via `next/dynamic`.
- **Page transitions**: Motion exit/enter (opacity + y: 6px, 0.15-0.2s)
- **KPI cards**: Stagger entrance (50ms delay) + animated number counting
- **Conditional form sections**: AnimatePresence height auto expand/shrink
- **Tables**: Stagger row entrance, flash green on new insert, crossfade on filter change
- **Timeline**: Stagger nodes from bottom, vertical line grows top-to-bottom
- **Sidebar active indicator**: Layout animation (slides between items)
- **Lottie**: loading, success (checkmark + confetti), empty-state, error, celebration (first sale), notification bell

### UX Improvements
- Collapsible sidebar (260px ↔ 64px, Ctrl+B)
- Command palette (Ctrl+K) — search leads, agents, views, actions
- Contextual breadcrumbs with campaign as first level
- Dark mode toggle (Tailwind v4 native)
- Skeleton loaders instead of spinners
- Optimistic updates via TanStack Query
- Keyboard shortcuts (Ctrl+N, Ctrl+D, Ctrl+K, Ctrl+B)
- First-use onboarding tour for coordinators
- Responsive: desktop sidebar, tablet collapsed, mobile drawer

### Campaign Colors
- Autos: #3b82f6 | Hogar: #059669 | Hogar Renov: #0d9488
- Arrendamiento: #7c3aed | Pymes: #d97706 | DirecTV: #dc2626 | Inbound: #0284c7

---

## 9. Reference Designs (Stitch)

Located in `Ref diseno/stitch/`:
- `login_inmersivo_bmg/` — Glassmorphic login card, dark background, "Digital Architect" branding
- `dashboard_vivo_bmg/` — Collapsed sidebar, KPI sparklines, area chart, donut distribution, activity feed
- `gesti_n_de_leads_inteligente/` — No-line table, campaign badges, empty state illustration
- `formulario_de_gesti_n_avanzada/` — Split layout: timeline left + form right, selectable result cards (Venta vs Reintento), conditional fields, lead KPIs at bottom
- `bmg_nexus/DESIGN.md` — Full design system specification

These are references with creative freedom to improve and extend.
