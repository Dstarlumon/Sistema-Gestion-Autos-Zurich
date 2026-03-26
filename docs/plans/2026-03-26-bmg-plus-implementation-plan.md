# BMG+ CRM Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the BMG+ BPO management platform from HTML prototypes into a production Next.js 16 + Supabase application with 11 modules, realtime features, and Vitxi call center integration.

**Architecture:** Next.js 16 App Router with React Server Components, Supabase (PostgreSQL + Auth + Realtime + Edge Functions) as backend, Zustand for minimal global state, TanStack Query for server state. Design system follows "Digital Architect" philosophy from Stitch references.

**Tech Stack:** Next.js 16.2, React 19.2, TypeScript 6.0, Tailwind CSS 4.2, shadcn/ui 4.1, Motion 12.38, Nivo 0.99, Recharts 3.8, Zustand 5.0, TanStack Query 5.95, React Hook Form 7.72, Zod 4.3, Supabase JS 2.100, Three.js 0.183, Lottie React 2.4

**Design references:**
- Architecture: `docs/plans/2026-03-26-bmg-plus-architecture-design.md`
- Design system: `Ref diseno/stitch/bmg_nexus/DESIGN.md`
- Screen refs: `Ref diseno/stitch/*/screen.png`

---

## Phase Summary

| Phase | Name | Tasks | Depends On |
|-------|------|-------|------------|
| 1 | Project Scaffold & Infrastructure | 8 | - |
| 2 | Database Schema & Security | 11 | Phase 1 |
| 3 | Authentication & App Shell | 10 | Phase 1, Phase 2 (partial) |
| 4 | Shared Component Library | 12 | Phase 3 |
| 5 | Gestion Module (Central) | 9 | Phase 4 |
| 6 | Ventas & Calidad Modules | 8 | Phase 5 |
| 7 | Dashboard & Realtime | 7 | Phase 5 |
| 8 | Secondary Modules | 10 | Phases 5-7 |
| 9 | Admin Module & Cron Jobs | 7 | Phase 4 |
| 10 | Visual Polish & Animations | 9 | Phase 3+ |
| 11 | UX Enhancements & Final Polish | 7 | Phase 10 |
| **Total** | | **98** | |

---

## Phase 1: Project Scaffold & Infrastructure

### Task 1.1: Initialize Next.js 16 Project

**Files:**
- Create: `bmg-plus/` (project root)
- Create: `bmg-plus/package.json`
- Create: `bmg-plus/tsconfig.json`
- Create: `bmg-plus/next.config.ts`

**Step 1: Create project**
```bash
npx create-next-app@latest bmg-plus --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd bmg-plus
```

**Step 2: Verify it runs**
```bash
npm run dev
# Expected: Next.js 16.x running at http://localhost:3000
```

**Step 3: Commit**
```bash
git init && git add -A && git commit -m "chore: initialize Next.js 16 project"
```

---

### Task 1.2: Install Core Dependencies

**Files:**
- Modify: `bmg-plus/package.json`

**Step 1: Install all dependencies**
```bash
# UI & Styling
npx shadcn@latest init
npm install @radix-ui/react-icons

# State & Data
npm install zustand @tanstack/react-query @supabase/supabase-js @supabase/ssr

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# Charts
npm install @nivo/core @nivo/funnel @nivo/pie @nivo/bar @nivo/line @nivo/heatmap @nivo/sunburst recharts

# Animations
npm install motion lottie-react

# 3D (login/landing only)
npm install three @react-three/fiber @react-three/drei

# Utilities
npm install date-fns exceljs
```

**Step 2: Verify build**
```bash
npm run build
# Expected: Build succeeds with no errors
```

**Step 3: Commit**
```bash
git add -A && git commit -m "chore: install core dependencies"
```

---

### Task 1.3: Configure Project Structure

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/stores/.gitkeep`
- Create: `src/hooks/.gitkeep`
- Create: `src/types/.gitkeep`
- Create: `src/lib/queries/.gitkeep`
- Create: `src/lib/validations/.gitkeep`
- Create: `src/lib/utils/format.ts`
- Create: `src/lib/utils/constants.ts`
- Create: `.env.local`
- Create: `.env.example`

**Step 1: Create directory structure**
```bash
mkdir -p src/{stores,hooks,types}
mkdir -p src/lib/{supabase,queries,validations,utils}
mkdir -p src/components/{ui,layout,charts,forms,tables,three,lottie,shared}
mkdir -p public/{lotties,models,images}
mkdir -p supabase/{migrations,functions}
mkdir -p tests/{e2e,unit}
```

**Step 2: Create .env.example**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITXI_API_URL=https://your-vitxi-instance.com/api
VITXI_API_KEY=your-vitxi-api-key
VITXI_WEBHOOK_SECRET=your-webhook-secret
```

**Step 3: Create Supabase client utilities**

`src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

`src/lib/supabase/admin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

**Step 4: Create utility files**

`src/lib/utils/constants.ts`:
```typescript
export const ROLES = ['coordinador', 'supervisor', 'agente'] as const
export type Role = typeof ROLES[number]

export const AGENT_STATUSES = ['disponible', 'en_llamada', 'pausa', 'offline'] as const
export type AgentStatus = typeof AGENT_STATUSES[number]

export const LEAD_STATUSES = ['nuevo', 'contactado', 'cotizado', 'en_proceso', 'venta', 'no_apto', 'cerrado'] as const
export type LeadStatus = typeof LEAD_STATUSES[number]

export const CANALES = ['telefono', 'whatsapp', 'email', 'chatbot'] as const
export type Canal = typeof CANALES[number]

export const CAMPAIGN_COLORS: Record<string, string> = {
  autos: '#3b82f6',
  hogar: '#059669',
  hogar_renov: '#0d9488',
  arrendamiento: '#7c3aed',
  pymes: '#d97706',
  directv: '#dc2626',
  inbound: '#0284c7',
}
```

`src/lib/utils/format.ts`:
```typescript
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
```

**Step 5: Commit**
```bash
git add -A && git commit -m "chore: set up project structure and Supabase clients"
```

---

### Task 1.4: Configure Design System Tokens

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

**Step 1: Set up design system CSS variables**

Based on `Ref diseno/stitch/bmg_nexus/DESIGN.md`, configure the surface hierarchy, typography, and ambient shadows as Tailwind theme extensions and CSS custom properties.

Key tokens to implement:
- Surface hierarchy: `surface`, `surface-container-low`, `surface-container`, `surface-container-highest`
- Primary palette: `primary` (#00288e), `primary-container` (#1e40af)
- Semantic colors: success, warning, danger, info
- Campaign accent colors
- Typography scale: display, headline, title, body, label (all using Inter)
- Shadow system: ambient shadows (6% opacity), ghost borders (15% opacity)
- Font feature: `tabular-nums` for all numeric data

**Step 2: Install Inter font**
```bash
npm install @fontsource-variable/inter
```

**Step 3: Commit**
```bash
git add -A && git commit -m "chore: configure design system tokens from Digital Architect spec"
```

---

### Task 1.5: Set Up Supabase Project

**Files:**
- Create: `supabase/config.toml`

**Step 1: Initialize Supabase locally**
```bash
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
```

**Step 2: Verify connection**
```bash
npx supabase db remote commit
```

**Step 3: Commit**
```bash
git add -A && git commit -m "chore: initialize Supabase project"
```

---

### Task 1.6: Set Up Testing Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/unit/setup.ts`

**Step 1: Install test dependencies**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test
```

**Step 2: Configure Vitest**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

**Step 3: Commit**
```bash
git add -A && git commit -m "chore: set up Vitest and Playwright"
```

---

### Task 1.7: Create App Route Groups

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx` (placeholder)
- Create: `src/app/(auth)/register/page.tsx` (placeholder)
- Create: `src/app/(app)/layout.tsx` (placeholder)
- Create: `src/app/(app)/dashboard/page.tsx` (placeholder)
- Create: `src/app/(landing)/layout.tsx` (placeholder)
- Create: `src/app/(landing)/page.tsx` (placeholder)
- Modify: `src/app/page.tsx` (redirect to /login)

**Step 1: Create route group shells**

Each layout is a placeholder that will be filled in Phase 3. The auth group will have the Three.js background, the app group will have sidebar+header, the landing group will have its own hero layout.

`src/app/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function Home() { redirect('/login') }
```

**Step 2: Verify routing works**
```bash
npm run dev
# Navigate to /login, /dashboard, / — all should render placeholder pages
```

**Step 3: Commit**
```bash
git add -A && git commit -m "chore: create route groups (auth, app, landing)"
```

---

### Task 1.8: Configure Vercel Deployment

**Files:**
- Create: `vercel.json` (if needed)

**Step 1: Link Vercel project**
```bash
npx vercel link
```

**Step 2: Set environment variables in Vercel dashboard**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITXI_API_URL`, `VITXI_API_KEY`, `VITXI_WEBHOOK_SECRET`

**Step 3: Deploy preview**
```bash
npx vercel
# Expected: Preview deployment succeeds
```

**Step 4: Commit**
```bash
git add -A && git commit -m "chore: configure Vercel deployment"
```

---

## Phase 2: Database Schema & Security

### Task 2.1: Migration — Organizations

**Files:**
- Create: `supabase/migrations/001_create_organizations.sql`

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  config JSONB DEFAULT '{"timezone":"America/Bogota","currency":"COP","max_pause_minutes":60,"sla_hours":24,"daily_goal":30}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO organizations (name) VALUES ('Zurich BPO Colombia');
```

```bash
npx supabase db push
git add -A && git commit -m "db: create organizations table"
```

---

### Task 2.2: Migration — Profiles

**Files:**
- Create: `supabase/migrations/002_create_profiles.sql`

```sql
CREATE TYPE user_role AS ENUM ('coordinador', 'supervisor', 'agente');
CREATE TYPE agent_status AS ENUM ('disponible', 'en_llamada', 'pausa', 'offline');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'agente',
  status agent_status NOT NULL DEFAULT 'offline',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Auto-create profile on signup via trigger
CREATE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, organization_id, full_name, role)
  VALUES (
    NEW.id,
    (SELECT id FROM organizations LIMIT 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'agente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

```bash
npx supabase db push
git add -A && git commit -m "db: create profiles table with auth trigger"
```

---

### Task 2.3: Migration — Campaigns

**Files:**
- Create: `supabase/migrations/003_create_campaigns.sql`

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(10) DEFAULT '📋',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE campaign_agents (
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (campaign_id, agent_id)
);

CREATE TABLE campaign_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX idx_campaign_agents_agent ON campaign_agents(agent_id);
```

```bash
npx supabase db push
git add -A && git commit -m "db: create campaigns, campaign_agents, campaign_bases"
```

---

### Task 2.4: Migration — Tipificaciones

**Files:**
- Create: `supabase/migrations/004_create_tipificaciones.sql`

```sql
CREATE TABLE tipificacion_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES tipificacion_tree(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
  sort_order SMALLINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tipificacion_parent ON tipificacion_tree(parent_id);
CREATE INDEX idx_tipificacion_org ON tipificacion_tree(organization_id);
CREATE INDEX idx_tipificacion_campaign ON tipificacion_tree(campaign_id);
```

```bash
npx supabase db push
git add -A && git commit -m "db: create tipificacion_tree (recursive)"
```

---

### Task 2.5: Migration — Leads

**Files:**
- Create: `supabase/migrations/005_create_leads.sql`

```sql
CREATE TYPE lead_source AS ENUM ('inbound','chatbot','pauta','referido','organico','renovacion','otro');
CREATE TYPE lead_status AS ENUM ('nuevo','contactado','cotizado','en_proceso','venta','no_apto','cerrado');

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  agent_id UUID REFERENCES profiles(id),
  base_id UUID REFERENCES campaign_bases(id),
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  documento VARCHAR(50),
  correo VARCHAR(255),
  ciudad VARCHAR(100),
  placa VARCHAR(20),
  source lead_source DEFAULT 'otro',
  status lead_status DEFAULT 'nuevo',
  created_at TIMESTAMPTZ NOT NULL,         -- Real lead creation date (set by coord)
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),    -- System upload timestamp
  uploaded_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_agent ON leads(agent_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_telefono ON leads(telefono);
CREATE INDEX idx_leads_documento ON leads(documento);
CREATE INDEX idx_leads_created ON leads(created_at);

-- Full-text search
ALTER TABLE leads ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('spanish', COALESCE(nombre,'') || ' ' || COALESCE(telefono,'') || ' ' || COALESCE(documento,'') || ' ' || COALESCE(correo,''))
  ) STORED;
CREATE INDEX idx_leads_search ON leads USING GIN(search_vector);
```

```bash
npx supabase db push
git add -A && git commit -m "db: create leads table with full-text search"
```

---

### Task 2.6: Migration — Gestiones

**Files:**
- Create: `supabase/migrations/006_create_gestiones.sql`

```sql
CREATE TYPE gestion_canal AS ENUM ('telefono','whatsapp','email','chatbot');

CREATE TABLE gestiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  tipificacion_id UUID NOT NULL REFERENCES tipificacion_tree(id),
  canal gestion_canal NOT NULL,
  medio VARCHAR(100),
  cotizacion BOOLEAN DEFAULT FALSE,
  num_cotizacion VARCHAR(50),
  valor_poliza NUMERIC(15,2),
  observacion TEXT,
  attempt_number INTEGER,
  retry_scheduled_at TIMESTAMPTZ,
  retry_notified BOOLEAN DEFAULT FALSE,
  next_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gestiones_lead ON gestiones(lead_id);
CREATE INDEX idx_gestiones_agent ON gestiones(agent_id);
CREATE INDEX idx_gestiones_campaign ON gestiones(campaign_id);
CREATE INDEX idx_gestiones_retry ON gestiones(retry_scheduled_at) WHERE retry_scheduled_at IS NOT NULL AND retry_notified = FALSE;

-- Auto-calculate attempt_number
CREATE FUNCTION set_attempt_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.attempt_number := (
    SELECT COALESCE(MAX(attempt_number), 0) + 1
    FROM gestiones WHERE lead_id = NEW.lead_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_gestion_insert
  BEFORE INSERT ON gestiones
  FOR EACH ROW EXECUTE FUNCTION set_attempt_number();
```

```bash
npx supabase db push
git add -A && git commit -m "db: create gestiones table with attempt counter trigger"
```

---

### Task 2.7: Migration — Sales

**Files:**
- Create: `supabase/migrations/007_create_sales.sql`

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  gestion_id UUID REFERENCES gestiones(id),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  nombre_cliente VARCHAR(255) NOT NULL,
  documento VARCHAR(50),
  telefono VARCHAR(50),
  correo VARCHAR(255),
  placa VARCHAR(20),
  ciudad VARCHAR(100),
  valor_prima NUMERIC(15,2) NOT NULL,
  num_poliza VARCHAR(50),
  tipo_seguro VARCHAR(100),
  canal VARCHAR(50),
  fuente VARCHAR(100),
  medio_pago VARCHAR(100),
  fecha_emision DATE,
  fecha_cotizacion DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_agent ON sales(agent_id);
CREATE INDEX idx_sales_campaign ON sales(campaign_id);
CREATE INDEX idx_sales_lead ON sales(lead_id);
```

```bash
npx supabase db push
git add -A && git commit -m "db: create sales table"
```

---

### Task 2.8: Migration — Renewals

**Files:**
- Create: `supabase/migrations/008_create_renewals.sql`

```sql
CREATE TYPE renewal_status AS ENUM ('si','no','en_proceso');

CREATE TABLE renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  documento VARCHAR(50),
  num_poliza_original VARCHAR(50),
  fecha_vencimiento DATE,
  placa VARCHAR(20),
  valor_actual NUMERIC(15,2),
  valor_renovacion NUMERIC(15,2),
  se_renovo renewal_status DEFAULT 'en_proceso',
  razon_no_renovacion TEXT,
  medio VARCHAR(100),
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_renewals_agent ON renewals(agent_id);
CREATE INDEX idx_renewals_campaign ON renewals(campaign_id);
```

```bash
npx supabase db push
git add -A && git commit -m "db: create renewals table"
```

---

### Task 2.9: Migration — Calls, Extensions, Pauses

**Files:**
- Create: `supabase/migrations/009_create_calls_pauses.sql`

```sql
CREATE TYPE call_direction AS ENUM ('inbound','outbound');
CREATE TYPE call_status AS ENUM ('ringing','active','completed','missed');
CREATE TYPE pause_type AS ENUM ('almuerzo','break','bano','capacitacion','retroalimentacion','otro');

CREATE TABLE vitxi_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  extension VARCHAR(20) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES profiles(id),
  external_call_id VARCHAR(255),
  phone_number VARCHAR(50),
  direction call_direction NOT NULL,
  status call_status NOT NULL DEFAULT 'ringing',
  duration_seconds INTEGER,
  recording_url TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE agent_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  pause_type pause_type NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
      ELSE NULL
    END
  ) STORED
);

CREATE INDEX idx_calls_agent ON calls(agent_id);
CREATE INDEX idx_calls_status ON calls(status) WHERE status = 'active';
CREATE INDEX idx_pauses_agent ON agent_pauses(agent_id);
CREATE INDEX idx_pauses_active ON agent_pauses(agent_id) WHERE ended_at IS NULL;
```

```bash
npx supabase db push
git add -A && git commit -m "db: create calls, vitxi_extensions, agent_pauses"
```

---

### Task 2.10: Migration — WhatsApp, Audit, Alerts, Notifications

**Files:**
- Create: `supabase/migrations/010_create_audit_alerts_messages.sql`

```sql
-- WhatsApp (prepared for Callbell)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  agent_id UUID REFERENCES profiles(id),
  external_id VARCHAR(255),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'open',
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(20),
  external_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TYPE alert_severity AS ENUM ('alta','media','informativa');

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  severity alert_severity NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) NOT NULL,
  related_agent_id UUID REFERENCES profiles(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50),
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_alerts_org ON alerts(organization_id, is_read);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
```

```bash
npx supabase db push
git add -A && git commit -m "db: create audit_log, alerts, notifications, conversations, messages"
```

---

### Task 2.11: Migration — RLS Policies, Triggers, Views, Seed Data

**Files:**
- Create: `supabase/migrations/011_rls_policies_triggers_views.sql`
- Create: `supabase/seed.sql`

This is the largest migration. Implements:

1. **Helper functions**: `get_user_role()`, `get_user_org()`
2. **RLS policies** on ALL tables following the role matrix from the design doc
3. **Audit trigger** on leads, gestiones, sales, renewals
4. **Pause abuse alert trigger** (> 90 min)
5. **Views**: `lead_contact_attempts`, `lead_results_by_weekday`, `lead_results_by_hour`, `no_contact_recovery`
6. **Enable RLS** on all tables
7. **Enable Realtime** on profiles, calls, notifications, alerts, gestiones, sales

`supabase/seed.sql`:
- Default organization (if not exists)
- Default campaigns: Autos, Hogar, Hogar Renov, Arrendamiento, Pymes, DirecTV, Inbound/Chatbot
- Default bases per campaign
- Full tipificacion tree from index.html (NO APTO, NO CONTACTO, CONTACTADO-NO COTIZA, POSITIVO with all sub-levels)

```bash
npx supabase db push
npx supabase db seed
git add -A && git commit -m "db: add RLS policies, audit triggers, analytics views, seed data"
```

---

## Phase 3: Authentication & App Shell

### Task 3.1 — 3.10

This phase builds:
- Supabase Auth email/password config
- `src/middleware.ts` with session check + role-based route protection
- Login page (`(auth)/login/page.tsx`) with React Hook Form + Zod
- Register page (`(auth)/register/page.tsx`) for first coordinator
- Auth Zustand store + `useAuth` hook
- `(app)/layout.tsx` that fetches profile and injects context
- Sidebar component (collapsible, role-based nav, campaign switcher)
- Header component (breadcrumbs, search trigger, notification bell, user menu, clock)
- `RoleGuard` component
- Auto-generated `database.types.ts` via `npx supabase gen types typescript`

Key reference: `Ref diseno/stitch/login_inmersivo_bmg/screen.png` for login layout.

---

## Phase 4: Shared Component Library

### Task 4.1 — 4.12

This phase builds all reusable components:
- shadcn/ui base components (Button, Input, Select, Dialog, Table, Tabs, Badge, Skeleton, Sheet, Command, DropdownMenu, Tooltip)
- `PageHeader`, `StatusBadge`, `ConfirmDialog`
- `KpiCard` with animated number counting (Motion)
- `DataTable` with server-side pagination, sorting, filtering
- Column definitions pattern per entity
- `TableFilters` (campaign, date range, agent, status)
- `TipificacionCascade` (3-level recursive select)
- All Zod validation schemas
- All TanStack Query hooks scaffold
- Utility functions (formatters, constants)

Key reference: `Ref diseno/stitch/gesti_n_de_leads_inteligente/screen.png` for table design, `DESIGN.md` for no-line rule and surface hierarchy.

---

## Phase 5: Gestion Module (Central)

### Task 5.1 — 5.9

The most critical phase. Builds:
- `/gestion` page with DataTable, filters, overdue retry alerts, attempt count badges
- `/gestion/[id]` lead detail card (all fields, created_at vs uploaded_at display)
- Timeline component (reverse-chronological gestiones)
- Gestion form (inline on detail page) with tipificacion cascade
- Conditional section: NO CONTACTO → retry scheduling
- Conditional section: VENTA → sale fields inline (AnimatePresence expand)
- Conditional section: EN PROCESO → cotizacion + next contact
- Base upload feature (Excel/CSV parse, preview, duplicate detection)
- Server action for gestion submission (creates gestion + conditionally creates sale + updates lead status)

Key reference: `Ref diseno/stitch/formulario_de_gesti_n_avanzada/screen.png` — split layout with timeline left, form right, selectable result cards.

---

## Phase 6: Ventas & Calidad Modules

### Task 6.1 — 6.8

- `/ventas` KPI cards + filterable table + charts (sales by agent, cumulative prima, by campaign)
- `/ventas` export functionality
- `/calidad` conversion funnel (Nivo Funnel)
- `/calidad` tipificacion sunburst (Nivo Sunburst) with drill-down
- `/calidad` heatmaps by day-of-week and hour-of-day (Nivo Heatmap)
- `/calidad` no-contact recovery analysis + quality by source + weekly trend + SLA response time

---

## Phase 7: Dashboard & Realtime

### Task 7.1 — 7.7

- `/dashboard` page with role-aware KPIs, funnel, ranking, trend
- Zustand realtime store
- Supabase Realtime channels: agent-status, dashboard-updates, notifications, alerts
- `useRealtime` hook with subscribe/unsubscribe lifecycle

Key reference: `Ref diseno/stitch/dashboard_vivo_bmg/screen.png` for layout.

---

## Phase 8: Secondary Modules

### Task 8.1 — 8.10

- `/llamadas` — Vitxi live calls, recordings player, spy/whisper
- `/api/webhooks/vitxi` Route Handler
- Vitxi API server-side calls
- `/whatsapp` — Callbell UI with empty state
- `/pausas` — agent status grid (realtime), pause timer
- Realtime channel: active-calls
- `/auditoria` — alert feed, agent scorecard, audit log
- `/reportes` — report builder with filters + server-side export
- `/api/export` Route Handler

---

## Phase 9: Admin Module & Cron Jobs

### Task 9.1 — 9.7

- `/admin/usuarios` — user CRUD with Supabase Auth invites
- `/admin/campanas` — campaign CRUD with agent assignment
- `/admin/tipificaciones` — visual tree editor with drag-and-drop
- `/admin` org config editor
- pg_cron: 5-min (retry notifications, inactive detection)
- pg_cron: hourly (quality scores, SLA breach)
- pg_cron: daily (scorecard, summary, cleanup)

---

## Phase 10: Visual Polish & Animations

### Task 10.1 — 10.9

- Three.js login scene (particles, orbs, mouse parallax) — lazy-loaded
- Three.js landing hero
- Lottie animations (loading, success, empty-state, error, celebration, bell)
- Motion page transitions
- Motion table animations (stagger, flash, crossfade)
- Motion timeline animations
- Motion form conditional section expand/collapse
- Sidebar active indicator layout animation
- Skeleton loaders for all data-fetching states

---

## Phase 11: UX Enhancements & Final Polish

### Task 11.1 — 11.7

- Command palette (Ctrl+K) with shadcn/ui Command
- Keyboard shortcuts system
- Dark mode toggle
- Responsive breakpoints (tablet collapsed sidebar, mobile drawer)
- First-use onboarding tour
- Optimistic updates for mutations
- Final e2e test suite (Playwright: auth, gestion CRUD, sale creation, role access, export)

---

## Dependency Graph

```
Phase 1 (Scaffold)
    │
    ├── Phase 2 (Database) ──┐
    │                        ├── Phase 3 (Auth + Shell)
    │────────────────────────┘         │
    │                                  │
    │                          Phase 4 (Components)
    │                                  │
    │                          Phase 5 (Gestion) ★ CRITICAL PATH
    │                           │      │      │
    │                     Phase 6  Phase 7  Phase 8 (can parallel)
    │                     (Ventas  (Dash+   (Secondary
    │                      Calidad) Real)    Modules)
    │                           │      │      │
    │                     Phase 9 (Admin + Cron) (can parallel)
    │                                  │
    │                          Phase 10 (Animations)
    │                                  │
    │                          Phase 11 (Polish)
    │
    └── Phase 10 Task 10.1-10.2 (Three.js) can start after Phase 3
```

## Parallelization Opportunities

- **Phases 6 + 7 + 8 + 9**: All depend on Phase 5 being complete, but are independent of each other. Can be built in parallel by separate agents/developers.
- **Phase 10 (Three.js scenes)**: Login/landing 3D has no data dependency — can start after Phase 3.
- **Phase 2 + 3**: Database migrations and auth setup can partially overlap.
