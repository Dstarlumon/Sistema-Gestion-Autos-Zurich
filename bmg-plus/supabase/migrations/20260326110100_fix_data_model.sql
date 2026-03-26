-- ============================================================================
-- Migration: Fix Critical Data Model Issues (Audit Findings)
-- BMG+ CRM — organization_id on core tables, pause duration, dynamic config,
--             updated_at triggers, RLS policy fixes, REPLICA IDENTITY
-- ============================================================================

-- ============================================================================
-- FIX 1: Add organization_id to sales, renewals, gestiones
-- Critical #7, #8, #9 — These tables lacked direct org scoping
-- ============================================================================

ALTER TABLE sales ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE renewals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE gestiones ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Backfill from campaigns (all rows have campaign_id → campaigns.organization_id)
UPDATE sales SET organization_id = c.organization_id
FROM campaigns c WHERE sales.campaign_id = c.id AND sales.organization_id IS NULL;

UPDATE renewals SET organization_id = c.organization_id
FROM campaigns c WHERE renewals.campaign_id = c.id AND renewals.organization_id IS NULL;

UPDATE gestiones SET organization_id = c.organization_id
FROM campaigns c WHERE gestiones.campaign_id = c.id AND gestiones.organization_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE sales ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE renewals ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE gestiones ALTER COLUMN organization_id SET NOT NULL;

-- Add indexes for org-scoped queries
CREATE INDEX IF NOT EXISTS idx_sales_org ON sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_renewals_org ON renewals(organization_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_org ON gestiones(organization_id);


-- ============================================================================
-- FIX 2: Add duration_seconds to agent_pauses via trigger
-- Critical #6 — No duration tracking on pauses
-- ============================================================================

ALTER TABLE agent_pauses ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

CREATE OR REPLACE FUNCTION compute_pause_duration() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compute_pause_duration_trigger ON agent_pauses;
CREATE TRIGGER compute_pause_duration_trigger
  BEFORE UPDATE ON agent_pauses
  FOR EACH ROW EXECUTE FUNCTION compute_pause_duration();


-- ============================================================================
-- FIX 3: Replace hardcoded pause abuse trigger with dynamic org config
-- High — was hardcoded to 5400s (90 min), now reads organizations.config
-- ============================================================================

CREATE OR REPLACE FUNCTION check_pause_abuse() RETURNS TRIGGER AS $$
DECLARE
  max_seconds INTEGER;
  agent_org UUID;
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.duration_seconds IS NOT NULL THEN
    -- Get the agent's organization
    SELECT p.organization_id INTO agent_org
    FROM profiles p WHERE p.id = NEW.agent_id;

    -- Read max_pause_minutes from org config (default 60 min)
    SELECT COALESCE((o.config->>'max_pause_minutes')::INTEGER, 60) * 60 INTO max_seconds
    FROM organizations o WHERE o.id = agent_org;

    IF NEW.duration_seconds > max_seconds THEN
      INSERT INTO alerts (organization_id, severity, title, message, type, related_agent_id)
      SELECT agent_org, 'alta',
             'Pausa excesiva detectada',
             p.full_name || ': pausa de ' || ROUND(NEW.duration_seconds / 60.0) || ' minutos (máximo: ' || (max_seconds/60) || ')',
             'pause_abuse', NEW.agent_id
      FROM profiles p WHERE p.id = NEW.agent_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS pause_abuse_check ON agent_pauses;
DROP TRIGGER IF EXISTS check_pause_abuse_trigger ON agent_pauses;
CREATE TRIGGER check_pause_abuse_trigger
  AFTER UPDATE ON agent_pauses
  FOR EACH ROW EXECUTE FUNCTION check_pause_abuse();


-- ============================================================================
-- FIX 4: Add updated_at auto-set triggers
-- High — updated_at columns existed but were never auto-updated
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_organizations ON organizations;
CREATE TRIGGER set_updated_at_organizations BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_leads ON leads;
CREATE TRIGGER set_updated_at_leads BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- FIX 5: Fix RLS policies for sales, renewals, gestiones
-- High — Old policies used subquery through campaigns; now use direct org_id
-- ============================================================================

-- ----- SALES -----
DROP POLICY IF EXISTS "sales_select" ON sales;
DROP POLICY IF EXISTS "sales_insert" ON sales;
DROP POLICY IF EXISTS "sales_update" ON sales;
DROP POLICY IF EXISTS "sales_delete" ON sales;

CREATE POLICY "sales_select" ON sales FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente' THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE organization_id = get_user_org()
  END
);
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (
  agent_id = auth.uid() OR get_user_role() IN ('coordinador','supervisor')
);
CREATE POLICY "sales_update" ON sales FOR UPDATE USING (get_user_role() = 'coordinador');
CREATE POLICY "sales_delete" ON sales FOR DELETE USING (get_user_role() = 'coordinador');

-- ----- RENEWALS -----
DROP POLICY IF EXISTS "renewals_select" ON renewals;
DROP POLICY IF EXISTS "renewals_insert" ON renewals;
DROP POLICY IF EXISTS "renewals_update" ON renewals;
DROP POLICY IF EXISTS "renewals_delete" ON renewals;

CREATE POLICY "renewals_select" ON renewals FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente' THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE organization_id = get_user_org()
  END
);
CREATE POLICY "renewals_insert" ON renewals FOR INSERT WITH CHECK (
  agent_id = auth.uid() OR get_user_role() IN ('coordinador','supervisor')
);
CREATE POLICY "renewals_update" ON renewals FOR UPDATE USING (get_user_role() = 'coordinador');
CREATE POLICY "renewals_delete" ON renewals FOR DELETE USING (get_user_role() = 'coordinador');

-- ----- GESTIONES -----
DROP POLICY IF EXISTS "gestiones_select" ON gestiones;
DROP POLICY IF EXISTS "gestiones_insert" ON gestiones;
DROP POLICY IF EXISTS "gestiones_update" ON gestiones;
DROP POLICY IF EXISTS "gestiones_delete" ON gestiones;

CREATE POLICY "gestiones_select" ON gestiones FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente' THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE organization_id = get_user_org()
  END
);
CREATE POLICY "gestiones_insert" ON gestiones FOR INSERT WITH CHECK (
  agent_id = auth.uid() OR get_user_role() IN ('coordinador','supervisor')
);
CREATE POLICY "gestiones_update" ON gestiones FOR UPDATE USING (get_user_role() = 'coordinador');
CREATE POLICY "gestiones_delete" ON gestiones FOR DELETE USING (get_user_role() = 'coordinador');


-- ============================================================================
-- FIX 6: Enable REPLICA IDENTITY FULL on realtime tables
-- High — Required for Supabase Realtime UPDATE/DELETE tracking
-- ============================================================================

ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE calls REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE alerts REPLICA IDENTITY FULL;
ALTER TABLE gestiones REPLICA IDENTITY FULL;
ALTER TABLE sales REPLICA IDENTITY FULL;
