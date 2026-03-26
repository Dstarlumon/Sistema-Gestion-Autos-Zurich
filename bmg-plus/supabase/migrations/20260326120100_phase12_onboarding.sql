-- ============================================================================
-- Phase 12: Organization Onboarding — Database Migration
-- BMG+ CRM — Nullable org_id, plan/tier columns, updated trigger,
--             seed data cleanup, onboarding RLS policies
-- ============================================================================


-- ============================================================================
-- PART 1: Make profiles.organization_id nullable
-- Allows new users to exist without an org during onboarding flow
-- ============================================================================

ALTER TABLE profiles ALTER COLUMN organization_id DROP NOT NULL;

-- Partial index for users that haven't joined an org yet
CREATE INDEX IF NOT EXISTS idx_profiles_no_org ON profiles(id) WHERE organization_id IS NULL;


-- ============================================================================
-- PART 2: Add plan/tier and industry to organizations (future monetization)
-- plan values: 'starter' (free, 1 campaign), 'pro' (5 campaigns), 'enterprise' (unlimited)
-- industry values: 'seguros', 'telecomunicaciones', 'financiero', 'salud', 'otro'
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'starter';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry VARCHAR(50);


-- ============================================================================
-- PART 3: Update handle_new_user trigger
-- No longer assigns a hardcoded org; new users get organization_id = NULL.
-- First user becomes coordinador (bootstrap), all subsequent become agente.
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  has_coord BOOLEAN;
  assigned_role user_role;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'coordinador') INTO has_coord;

  IF NOT has_coord THEN
    assigned_role := 'coordinador';
  ELSE
    assigned_role := 'agente';
  END IF;

  INSERT INTO public.profiles (id, organization_id, full_name, role)
  VALUES (
    NEW.id,
    NULL,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    assigned_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER FUNCTION handle_new_user() OWNER TO postgres;


-- ============================================================================
-- PART 4: Remove hardcoded seed organization and all linked data
-- We're in test mode, safe to delete everything.
-- Order respects FK constraints: children first, then parents.
-- ============================================================================

-- Delete gestiones (references leads, campaigns, tipificacion_tree)
DELETE FROM gestiones WHERE organization_id IN (
  SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
);

-- Delete sales (references leads, campaigns)
DELETE FROM sales WHERE organization_id IN (
  SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
);

-- Delete renewals (references leads, campaigns)
DELETE FROM renewals WHERE organization_id IN (
  SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
);

-- Delete leads (references campaigns, campaign_bases)
DELETE FROM leads WHERE organization_id IN (
  SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
);

-- Delete tipificacion_tree (references organizations)
DELETE FROM tipificacion_tree WHERE organization_id IN (
  SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
);

-- Delete campaign_bases (references campaigns via ON DELETE CASCADE, but explicit is safer)
DELETE FROM campaign_bases WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE organization_id IN (
    SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
  )
);

-- Delete campaign_agents (references campaigns via ON DELETE CASCADE)
DELETE FROM campaign_agents WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE organization_id IN (
    SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
  )
);

-- Delete campaigns (references organizations)
DELETE FROM campaigns WHERE organization_id IN (
  SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
);

-- Delete alerts linked to seed org (alerts.organization_id FK)
DELETE FROM alerts WHERE organization_id IN (
  SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
);

-- NULL out profiles.organization_id for users linked to seed org
-- (profiles FK references organizations; Part 1 already made the column nullable)
UPDATE profiles SET organization_id = NULL
WHERE organization_id IN (
  SELECT id FROM organizations WHERE name = 'Zurich BPO Colombia'
);

-- Finally delete the seed organization itself
DELETE FROM organizations WHERE name = 'Zurich BPO Colombia';


-- ============================================================================
-- PART 5: Update RLS policies for nullable org_id (onboarding flow)
-- get_user_org() already returns NULL gracefully (SELECT...WHERE), no change needed.
-- ============================================================================

-- Allow coordinadores without org to create organizations
DROP POLICY IF EXISTS "organizations_insert_onboarding" ON organizations;
CREATE POLICY "organizations_insert_onboarding" ON organizations FOR INSERT
  WITH CHECK (get_user_role() = 'coordinador');

-- Allow users to set their own org_id one-time (during onboarding)
DROP POLICY IF EXISTS "profiles_update_onboarding" ON profiles;
CREATE POLICY "profiles_update_onboarding" ON profiles FOR UPDATE
  USING (id = auth.uid() AND organization_id IS NULL)
  WITH CHECK (id = auth.uid() AND organization_id IS NOT NULL);

-- Allow users without org to see their own profile
DROP POLICY IF EXISTS "profiles_select_self_no_org" ON profiles;
CREATE POLICY "profiles_select_self_no_org" ON profiles FOR SELECT
  USING (id = auth.uid());

-- Allow campaigns INSERT for coordinadores (needed during onboarding seed)
DROP POLICY IF EXISTS "campaigns_insert_onboarding" ON campaigns;
CREATE POLICY "campaigns_insert_onboarding" ON campaigns FOR INSERT
  WITH CHECK (get_user_role() = 'coordinador');

-- Allow tipificacion_tree INSERT for coordinadores (needed during onboarding seed)
DROP POLICY IF EXISTS "tipificacion_insert_onboarding" ON tipificacion_tree;
CREATE POLICY "tipificacion_insert_onboarding" ON tipificacion_tree FOR INSERT
  WITH CHECK (get_user_role() = 'coordinador');

-- Allow campaign_bases INSERT for coordinadores
DROP POLICY IF EXISTS "campaign_bases_insert_onboarding" ON campaign_bases;
CREATE POLICY "campaign_bases_insert_onboarding" ON campaign_bases FOR INSERT
  WITH CHECK (get_user_role() = 'coordinador');
