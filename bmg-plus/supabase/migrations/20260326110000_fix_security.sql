-- ============================================================================
-- Security Fix Migration
-- P0: Fix handle_new_user to never trust client role, close audit_log insert
-- ============================================================================

-- Fix 1: Replace handle_new_user to NEVER trust raw_user_meta_data.role
-- First user becomes coordinador (bootstrap). All subsequent users become agente.
-- Only a coordinador can promote users via the admin panel (UPDATE on profiles).
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  has_coord BOOLEAN;
  assigned_role user_role;
BEGIN
  -- Check if any coordinador exists in the system
  SELECT EXISTS(SELECT 1 FROM profiles WHERE role = 'coordinador') INTO has_coord;

  -- First user ever = coordinador (bootstrap). All others = agente.
  IF NOT has_coord THEN
    assigned_role := 'coordinador';
  ELSE
    assigned_role := 'agente';
  END IF;

  INSERT INTO profiles (id, organization_id, full_name, role)
  VALUES (
    NEW.id,
    (SELECT id FROM organizations LIMIT 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    assigned_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Close audit_log INSERT to only service role / trigger context
-- The old policy was WITH CHECK (TRUE), allowing any authenticated user to
-- insert arbitrary audit records.
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT
  WITH CHECK (
    -- Only allow inserts from the audit trigger function (SECURITY DEFINER context)
    -- or service_role. Regular authenticated users cannot insert directly.
    current_setting('role') = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );
