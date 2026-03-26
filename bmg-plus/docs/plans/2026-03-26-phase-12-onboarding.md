# BMG+ CRM — Phase 12: Organization Onboarding

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded "Zurich BPO Colombia" organization with a dynamic onboarding flow where the first coordinator creates their organization upon first login.

**Architecture:** The signup trigger creates a profile WITHOUT organization_id (nullable). On first login, the app layout detects `organization_id IS NULL` and redirects to `/onboarding`. After completing onboarding, the coordinator's profile is linked to the new organization.

**Current behavior:** `handle_new_user()` trigger does `SELECT id FROM organizations LIMIT 1` — requires a pre-seeded org.
**Target behavior:** Trigger creates profile with `organization_id = NULL`. Onboarding page creates the org and links the user.

---

## Phase Summary

| Task | Name | Depends On |
|------|------|------------|
| 12.1 | Migration — profiles.organization_id nullable | - |
| 12.2 | Migration — Update handle_new_user trigger | 12.1 |
| 12.3 | Migration — Remove hardcoded org from seed | 12.2 |
| 12.4 | Create /onboarding page | 12.1 |
| 12.5 | Update app layout — redirect to onboarding | 12.4 |
| 12.6 | Server action — create organization | 12.4 |
| 12.7 | Update RLS policies for nullable org_id | 12.1 |
| 12.8 | Team creation flow (post-onboarding) | 12.6 |

---

## Task 12.1: Migration — Make profiles.organization_id nullable

**Files:**
- Create: `supabase/migrations/20260326120100_onboarding_nullable_org.sql`

```sql
-- Allow profiles to exist without an organization (during onboarding)
ALTER TABLE profiles ALTER COLUMN organization_id DROP NOT NULL;

-- Add index for finding profiles without org (onboarding check)
CREATE INDEX IF NOT EXISTS idx_profiles_no_org
  ON profiles(id) WHERE organization_id IS NULL;
```

**Why:** Currently `organization_id UUID NOT NULL` blocks profile creation without an org. Making it nullable allows the signup trigger to create a profile first, then link the org during onboarding.

---

## Task 12.2: Migration — Update handle_new_user trigger

**Files:**
- Create: `supabase/migrations/20260326120200_onboarding_trigger.sql`

```sql
-- Replace trigger to NOT require an existing organization
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  has_coord BOOLEAN;
  assigned_role user_role;
BEGIN
  -- Check if any coordinador exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'coordinador') INTO has_coord;

  -- First user = coordinador, all subsequent = agente
  IF NOT has_coord THEN
    assigned_role := 'coordinador';
  ELSE
    assigned_role := 'agente';
  END IF;

  -- Create profile WITHOUT organization (will be set during onboarding)
  -- For non-first users (agentes), they inherit org from the coordinator who invites them
  INSERT INTO public.profiles (id, organization_id, full_name, role)
  VALUES (
    NEW.id,
    NULL,  -- No org yet — set during onboarding or team invite
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    assigned_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER FUNCTION handle_new_user() OWNER TO postgres;
```

**Important:** The `SET search_path = public` and `OWNER TO postgres` are required — without them, Supabase Auth cannot execute the trigger (discovered during production debugging).

---

## Task 12.3: Migration — Remove hardcoded org from seed

**Files:**
- Create: `supabase/migrations/20260326120300_onboarding_cleanup_seed.sql`

```sql
-- The hardcoded "Zurich BPO Colombia" organization is no longer needed
-- Organizations are now created dynamically during onboarding
-- NOTE: Only remove if the current org has no linked profiles
-- If profiles already reference it, keep it and let the existing users continue

-- For fresh deployments, the seed org is unnecessary
-- For existing deployments, this is a no-op (the org stays if referenced)
DELETE FROM organizations
WHERE name = 'Zurich BPO Colombia'
AND id NOT IN (SELECT DISTINCT organization_id FROM profiles WHERE organization_id IS NOT NULL);
```

**Why:** Seed orgs were a bootstrap mechanism. With onboarding, they're unnecessary for new deployments. Existing deployments with linked profiles are unaffected.

---

## Task 12.4: Create /onboarding page

**Files:**
- Create: `src/app/(app)/onboarding/page.tsx`

**Design:**
- Full-screen page (no sidebar, no header — clean onboarding experience)
- Stepper: Step 1 of 2 "Crear Organización" → Step 2 of 2 "Configurar"
- Step 1: Organization name (required), logo upload (optional via Supabase Storage)
- Step 2: Config — timezone (default America/Bogota), currency (default COP), SLA hours (default 24), max pause minutes (default 60), daily goal (default 30)
- Submit calls server action → creates org → links profile → redirects to /dashboard
- Design follows "Digital Architect" system — glassmorphic card, gradient CTA button

**UX flow:**
```
/register → confirm email → /login → /dashboard
                                        ↓ (if org_id IS NULL)
                                    /onboarding
                                        ↓ (Step 1: org name + logo)
                                        ↓ (Step 2: config)
                                    /dashboard ✓
```

**Form fields (Step 1):**
- `name` — Organization name (text, required, min 2 chars)
- `logo` — Logo file upload (optional, max 2MB, jpg/png/svg)

**Form fields (Step 2):**
- `timezone` — Select dropdown (default: America/Bogota)
- `currency` — Select dropdown (default: COP)
- `sla_hours` — Number input (default: 24)
- `max_pause_minutes` — Number input (default: 60)
- `daily_goal` — Number input (default: 30)

**Validation:** Zod schema for both steps.

---

## Task 12.5: Update app layout — redirect to onboarding

**Files:**
- Modify: `src/app/(app)/layout.tsx`

**Current logic:**
```typescript
if (!user) redirect('/login')
if (!profile) redirect('/login')
return <AppShell>{children}</AppShell>
```

**New logic:**
```typescript
if (!user) redirect('/login')
if (!profile) redirect('/login')

// Check if user needs onboarding (no organization linked)
if (!profile.organization_id) {
  // Allow access to /onboarding page itself
  // For other pages, redirect to onboarding
  const isOnboardingPage = /* check current path */
  if (!isOnboardingPage) redirect('/onboarding')
}

return <AppShell>{children}</AppShell>
```

**Note:** The onboarding page should NOT render inside the AppShell (no sidebar/header). Either:
- Option A: Move onboarding to a separate route group `(onboarding)/onboarding/page.tsx`
- Option B: Conditionally render AppShell vs. bare layout based on `profile.organization_id`

**Recommended: Option A** — separate route group with its own minimal layout.

---

## Task 12.6: Server action — create organization

**Files:**
- Create: `src/app/(app)/onboarding/actions.ts`

```typescript
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface OnboardingData {
  name: string
  logo_url?: string
  config: {
    timezone: string
    currency: string
    sla_hours: number
    max_pause_minutes: number
    daily_goal: number
  }
}

export async function createOrganization(data: OnboardingData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.name,
      logo_url: data.logo_url || null,
      config: data.config,
    })
    .select('id')
    .single()

  if (orgError || !org) throw new Error('Failed to create organization')

  // 2. Link user profile to organization
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ organization_id: org.id })
    .eq('id', user.id)

  if (profileError) throw new Error('Failed to link profile to organization')

  // 3. Create default campaigns for the organization
  const defaultCampaigns = [
    { name: 'Autos', slug: 'autos', color: '#3b82f6', icon: '🚗' },
    { name: 'Hogar', slug: 'hogar', color: '#059669', icon: '🏠' },
  ]

  await supabase
    .from('campaigns')
    .insert(defaultCampaigns.map(c => ({ ...c, organization_id: org.id })))

  // 4. Create default tipificacion tree
  // ... (insert root categories: NO APTO, NO CONTACTO, CONTACTADO-NO COTIZA, POSITIVO)

  redirect('/dashboard')
}
```

**Why server action:** Atomic org creation + profile linking + seed data in one server-side call. Cannot be done client-side without exposing service role key.

---

## Task 12.7: Update RLS policies for nullable org_id

**Files:**
- Create: `supabase/migrations/20260326120400_onboarding_rls.sql`

**Changes needed:**
- `get_user_org()` helper function must handle NULL gracefully (return NULL instead of failing)
- Profiles SELECT policy must allow users to see their own profile even without org_id
- Organizations INSERT policy must allow coordinadores without org to create one (onboarding)
- Profiles UPDATE policy must allow users to set their own organization_id (one-time, during onboarding)

```sql
-- Update get_user_org to handle NULL
CREATE OR REPLACE FUNCTION get_user_org() RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Allow coordinadores to create organizations (onboarding)
CREATE POLICY "organizations_insert_onboarding" ON organizations FOR INSERT
  WITH CHECK (
    get_user_role() = 'coordinador'
  );

-- Allow users to update their own org_id (one-time during onboarding)
-- This is separate from the general profiles_update policy
CREATE POLICY "profiles_update_onboarding" ON profiles FOR UPDATE
  USING (id = auth.uid() AND organization_id IS NULL)
  WITH CHECK (id = auth.uid() AND organization_id IS NOT NULL);
```

---

## Task 12.8: Team creation flow (post-onboarding)

**Context:** After the coordinator creates their organization, they need to add team members. This already works via `/admin/usuarios` — the server action `createUserAction` uses `admin.auth.admin.createUser()`.

**What changes:**
- When a coordinador creates a new user from admin, the new user's profile should automatically inherit the coordinator's `organization_id`
- The new user skips onboarding because they already have an org

**Files:**
- Modify: `src/app/(app)/admin/usuarios/actions.ts`

Add to the user creation server action:
```typescript
// After creating the user via admin API, update their profile with the coordinator's org
const { data: coordProfile } = await supabase
  .from('profiles')
  .select('organization_id')
  .eq('id', coordinatorUserId)
  .single()

await adminClient
  .from('profiles')
  .update({ organization_id: coordProfile.organization_id })
  .eq('id', newUserId)
```

**Flow for team members:**
```
Coordinator creates user in /admin/usuarios
  → Supabase Auth creates user
  → Trigger creates profile (org_id = NULL)
  → Server action immediately sets org_id from coordinator's org
  → New user logs in → has org → skips onboarding → goes to /dashboard
```

---

## Dependency Graph

```
Task 12.1 (nullable org_id)
    │
    ├── Task 12.2 (trigger update)
    │       │
    │       └── Task 12.3 (remove seed org)
    │
    ├── Task 12.4 (onboarding page)
    │       │
    │       ├── Task 12.5 (layout redirect)
    │       │
    │       └── Task 12.6 (server action)
    │
    ├── Task 12.7 (RLS policies)
    │
    └── Task 12.8 (team creation flow)
```

**Tasks 12.4 + 12.5 + 12.6 can be developed in parallel after 12.1 + 12.2.**
**Task 12.8 can be done independently after 12.1.**

---

## Testing Checklist

- [ ] New user signup → profile created with `organization_id = NULL`
- [ ] First login → redirected to `/onboarding`
- [ ] Onboarding Step 1 → org name + optional logo
- [ ] Onboarding Step 2 → config fields with defaults
- [ ] Submit → org created, profile linked, redirect to /dashboard
- [ ] Second login → goes directly to /dashboard (org exists)
- [ ] Coordinator creates team member → member gets coordinator's org_id
- [ ] Team member logs in → skips onboarding, goes to /dashboard
- [ ] All existing users with org_id continue working normally
- [ ] RLS policies enforce org boundaries correctly
