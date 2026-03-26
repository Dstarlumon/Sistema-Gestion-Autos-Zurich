-- ============================================================================
-- Migration: Fix Remaining DB Issues (Audit Findings)
-- BMG+ CRM — Recursive CTE views, organizations UNIQUE, profiles RLS,
--             duplicate seed cleanup
-- ============================================================================


-- ============================================================================
-- FIX 1: Recursive helper function for N-level tipificacion root lookup
-- High — Previous views only resolved 3 levels with hardcoded JOINs.
-- This function walks the tree upward from any node to find the root ancestor.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tipificacion_root(tip_id UUID)
RETURNS TABLE(root_id UUID, root_name TEXT) AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, name, parent_id, level
    FROM tipificacion_tree WHERE id = tip_id
    UNION ALL
    SELECT t.id, t.name, t.parent_id, t.level
    FROM tipificacion_tree t
    JOIN ancestors a ON t.id = a.parent_id
  )
  SELECT id, name FROM ancestors WHERE parent_id IS NULL LIMIT 1;
$$ LANGUAGE sql STABLE;


-- ============================================================================
-- FIX 1a: Rebuild lead_results_by_weekday using recursive root lookup
-- Preserves existing column names for type compatibility
-- ============================================================================

DROP VIEW IF EXISTS lead_results_by_weekday;
CREATE VIEW lead_results_by_weekday AS
SELECT
  l.campaign_id,
  l.organization_id,
  EXTRACT(DOW FROM l.created_at)::INTEGER AS day_of_week,
  (get_tipificacion_root(g.tipificacion_id)).root_name AS root_category,
  COUNT(*) AS total
FROM gestiones g
JOIN leads l ON l.id = g.lead_id
GROUP BY l.campaign_id, l.organization_id,
         EXTRACT(DOW FROM l.created_at)::INTEGER,
         (get_tipificacion_root(g.tipificacion_id)).root_name;


-- ============================================================================
-- FIX 1b: Rebuild lead_results_by_hour using recursive root lookup
-- Preserves existing column names for type compatibility
-- ============================================================================

DROP VIEW IF EXISTS lead_results_by_hour;
CREATE VIEW lead_results_by_hour AS
SELECT
  g.campaign_id,
  l.organization_id,
  EXTRACT(HOUR FROM g.created_at)::INTEGER AS hour_of_day,
  (get_tipificacion_root(g.tipificacion_id)).root_name AS root_category,
  COUNT(*) AS total
FROM gestiones g
JOIN leads l ON l.id = g.lead_id
GROUP BY g.campaign_id, l.organization_id,
         EXTRACT(HOUR FROM g.created_at)::INTEGER,
         (get_tipificacion_root(g.tipificacion_id)).root_name;


-- ============================================================================
-- FIX 1c: Rebuild no_contact_recovery using recursive root lookup
-- Preserves existing column names for type compatibility
-- ============================================================================

DROP VIEW IF EXISTS no_contact_recovery;
CREATE VIEW no_contact_recovery AS
WITH gestion_with_root AS (
  SELECT
    g.id,
    g.lead_id,
    g.campaign_id,
    g.attempt_number,
    g.created_at,
    (get_tipificacion_root(g.tipificacion_id)).root_name AS root_category
  FROM gestiones g
),
leads_with_no_contact AS (
  SELECT DISTINCT gwr.lead_id
  FROM gestion_with_root gwr
  WHERE gwr.root_category = 'NO CONTACTO'
),
first_no_contact AS (
  SELECT
    gwr.lead_id,
    MIN(gwr.attempt_number) AS first_no_contact_attempt
  FROM gestion_with_root gwr
  WHERE gwr.root_category = 'NO CONTACTO'
  GROUP BY gwr.lead_id
),
recovery_attempt AS (
  SELECT
    gwr.lead_id,
    MIN(gwr.attempt_number) AS recovery_at_attempt,
    MIN(gwr.root_category) AS recovery_category
  FROM gestion_with_root gwr
  JOIN first_no_contact fnc ON fnc.lead_id = gwr.lead_id
  WHERE gwr.root_category != 'NO CONTACTO'
    AND gwr.attempt_number > fnc.first_no_contact_attempt
  GROUP BY gwr.lead_id
)
SELECT
  lnc.lead_id,
  l.campaign_id,
  l.organization_id,
  l.agent_id,
  (SELECT COUNT(*) FROM gestion_with_root gwr WHERE gwr.lead_id = lnc.lead_id)
    AS total_attempts,
  fnc.first_no_contact_attempt,
  CASE WHEN ra.recovery_at_attempt IS NOT NULL THEN TRUE ELSE FALSE END
    AS was_recovered,
  ra.recovery_at_attempt,
  ra.recovery_category
FROM leads_with_no_contact lnc
JOIN leads l ON l.id = lnc.lead_id
JOIN first_no_contact fnc ON fnc.lead_id = lnc.lead_id
LEFT JOIN recovery_attempt ra ON ra.lead_id = lnc.lead_id;


-- ============================================================================
-- FIX 1d: Rebuild lead_contact_attempts view
-- Preserves existing column names for type compatibility
-- ============================================================================

DROP VIEW IF EXISTS lead_contact_attempts;
CREATE VIEW lead_contact_attempts AS
SELECT
  l.id AS lead_id,
  l.campaign_id,
  l.agent_id,
  l.organization_id,
  l.nombre,
  l.telefono,
  l.status,
  COUNT(g.id) AS total_attempts,
  MAX(g.created_at) AS last_attempt_at,
  MIN(g.created_at) AS first_attempt_at,
  CASE
    WHEN COUNT(g.id) > 1 THEN
      EXTRACT(EPOCH FROM (MAX(g.created_at) - MIN(g.created_at)))
      / GREATEST(COUNT(g.id) - 1, 1)
      / 86400.0
    ELSE 0
  END AS avg_days_between_attempts,
  (
    SELECT g2.retry_scheduled_at
    FROM gestiones g2
    WHERE g2.lead_id = l.id
      AND g2.retry_scheduled_at IS NOT NULL
      AND g2.retry_scheduled_at > NOW()
    ORDER BY g2.retry_scheduled_at ASC
    LIMIT 1
  ) AS next_scheduled_retry
FROM leads l
LEFT JOIN gestiones g ON g.lead_id = l.id
GROUP BY l.id, l.campaign_id, l.agent_id, l.organization_id,
         l.nombre, l.telefono, l.status;


-- ============================================================================
-- FIX 2: Organizations UNIQUE constraint on name
-- High — Prevents duplicate organization names
-- ============================================================================

ALTER TABLE organizations ADD CONSTRAINT organizations_name_unique UNIQUE (name);


-- ============================================================================
-- FIX 3: Profiles RLS — agents should see campaign peers
-- High — Agents could only see themselves; now they can also see
-- other agents assigned to the same campaigns (needed for team views)
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente' THEN
      -- Agents can see themselves AND other agents in their campaigns
      id = auth.uid() OR id IN (
        SELECT ca2.agent_id FROM campaign_agents ca1
        JOIN campaign_agents ca2 ON ca1.campaign_id = ca2.campaign_id
        WHERE ca1.agent_id = auth.uid()
      )
    WHEN 'supervisor' THEN organization_id = get_user_org()
    ELSE organization_id = get_user_org()
  END
);
