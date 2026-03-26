-- ============================================================================
-- Migration 011: RLS Policies, Triggers, Views, and Realtime
-- BMG+ CRM — Row Level Security, Audit Triggers, Analytics Views, Realtime
-- ============================================================================

-- ============================================================================
-- A) HELPER FUNCTIONS
-- ============================================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's organization
CREATE OR REPLACE FUNCTION get_user_org() RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get campaigns the current user is assigned to
CREATE OR REPLACE FUNCTION get_user_campaigns() RETURNS SETOF UUID AS $$
  SELECT campaign_id FROM campaign_agents WHERE agent_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- B) ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organizations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_agents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_bases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipificacion_tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestiones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales             ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitxi_extensions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_pauses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- C) RLS POLICIES
-- ============================================================================

-- --------------------------------------------------------------------------
-- ORGANIZATIONS — everyone sees their own org
-- --------------------------------------------------------------------------
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (
  id = get_user_org()
);

CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (
  get_user_role() = 'coordinador' AND id = get_user_org()
);

-- --------------------------------------------------------------------------
-- PROFILES — role-based visibility
-- --------------------------------------------------------------------------
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN id = auth.uid()
    WHEN 'supervisor' THEN id = auth.uid()
                           OR id IN (
                             SELECT ca.agent_id FROM campaign_agents ca
                             WHERE ca.campaign_id IN (SELECT get_user_campaigns())
                           )
    ELSE organization_id = get_user_org()
  END
);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (
  id = auth.uid()
);

CREATE POLICY "profiles_update_coord" ON profiles FOR UPDATE USING (
  get_user_role() = 'coordinador' AND organization_id = get_user_org()
);

CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  get_user_role() = 'coordinador' AND organization_id = get_user_org()
);

-- --------------------------------------------------------------------------
-- CAMPAIGNS — all can select, only coordinador can modify
-- --------------------------------------------------------------------------
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN id IN (SELECT get_user_campaigns())
    WHEN 'supervisor' THEN id IN (SELECT get_user_campaigns())
    ELSE organization_id = get_user_org()
  END
);

CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT WITH CHECK (
  get_user_role() = 'coordinador' AND organization_id = get_user_org()
);

CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE USING (
  get_user_role() = 'coordinador' AND organization_id = get_user_org()
);

CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE USING (
  get_user_role() = 'coordinador' AND organization_id = get_user_org()
);

-- --------------------------------------------------------------------------
-- CAMPAIGN_AGENTS — join table, role-based
-- --------------------------------------------------------------------------
CREATE POLICY "campaign_agents_select" ON campaign_agents FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "campaign_agents_insert" ON campaign_agents FOR INSERT WITH CHECK (
  get_user_role() = 'coordinador'
  AND campaign_id IN (SELECT id FROM campaigns WHERE organization_id = get_user_org())
);

CREATE POLICY "campaign_agents_delete" ON campaign_agents FOR DELETE USING (
  get_user_role() = 'coordinador'
  AND campaign_id IN (SELECT id FROM campaigns WHERE organization_id = get_user_org())
);

-- --------------------------------------------------------------------------
-- CAMPAIGN_BASES — role-based
-- --------------------------------------------------------------------------
CREATE POLICY "campaign_bases_select" ON campaign_bases FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN campaign_id IN (SELECT get_user_campaigns())
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "campaign_bases_insert" ON campaign_bases FOR INSERT WITH CHECK (
  get_user_role() = 'coordinador'
  AND campaign_id IN (SELECT id FROM campaigns WHERE organization_id = get_user_org())
);

CREATE POLICY "campaign_bases_update" ON campaign_bases FOR UPDATE USING (
  get_user_role() = 'coordinador'
  AND campaign_id IN (SELECT id FROM campaigns WHERE organization_id = get_user_org())
);

CREATE POLICY "campaign_bases_delete" ON campaign_bases FOR DELETE USING (
  get_user_role() = 'coordinador'
  AND campaign_id IN (SELECT id FROM campaigns WHERE organization_id = get_user_org())
);

-- --------------------------------------------------------------------------
-- TIPIFICACION_TREE — all can select, only coordinador can modify
-- --------------------------------------------------------------------------
CREATE POLICY "tipificacion_select" ON tipificacion_tree FOR SELECT USING (
  organization_id = get_user_org()
);

CREATE POLICY "tipificacion_insert" ON tipificacion_tree FOR INSERT WITH CHECK (
  get_user_role() = 'coordinador' AND organization_id = get_user_org()
);

CREATE POLICY "tipificacion_update" ON tipificacion_tree FOR UPDATE USING (
  get_user_role() = 'coordinador' AND organization_id = get_user_org()
);

CREATE POLICY "tipificacion_delete" ON tipificacion_tree FOR DELETE USING (
  get_user_role() = 'coordinador' AND organization_id = get_user_org()
);

-- --------------------------------------------------------------------------
-- LEADS — full CRUD with role filter
-- --------------------------------------------------------------------------
CREATE POLICY "leads_select" ON leads FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE organization_id = get_user_org()
  END
);

CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid() AND organization_id = get_user_org()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
                           AND organization_id = get_user_org()
    ELSE organization_id = get_user_org()
  END
);

CREATE POLICY "leads_update" ON leads FOR UPDATE USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE organization_id = get_user_org()
  END
);

CREATE POLICY "leads_delete" ON leads FOR DELETE USING (
  get_user_role() = 'coordinador' AND organization_id = get_user_org()
);

-- --------------------------------------------------------------------------
-- GESTIONES — full CRUD with role filter
-- --------------------------------------------------------------------------
CREATE POLICY "gestiones_select" ON gestiones FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "gestiones_insert" ON gestiones FOR INSERT WITH CHECK (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "gestiones_update" ON gestiones FOR UPDATE USING (
  get_user_role() = 'coordinador'
  AND campaign_id IN (
    SELECT id FROM campaigns WHERE organization_id = get_user_org()
  )
);

CREATE POLICY "gestiones_delete" ON gestiones FOR DELETE USING (
  get_user_role() = 'coordinador'
  AND campaign_id IN (
    SELECT id FROM campaigns WHERE organization_id = get_user_org()
  )
);

-- --------------------------------------------------------------------------
-- SALES — full CRUD with role filter
-- --------------------------------------------------------------------------
CREATE POLICY "sales_select" ON sales FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "sales_update" ON sales FOR UPDATE USING (
  get_user_role() = 'coordinador'
  AND campaign_id IN (
    SELECT id FROM campaigns WHERE organization_id = get_user_org()
  )
);

CREATE POLICY "sales_delete" ON sales FOR DELETE USING (
  get_user_role() = 'coordinador'
  AND campaign_id IN (
    SELECT id FROM campaigns WHERE organization_id = get_user_org()
  )
);

-- --------------------------------------------------------------------------
-- RENEWALS — full CRUD with role filter
-- --------------------------------------------------------------------------
CREATE POLICY "renewals_select" ON renewals FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "renewals_insert" ON renewals FOR INSERT WITH CHECK (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN campaign_id IN (SELECT get_user_campaigns())
    ELSE campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "renewals_update" ON renewals FOR UPDATE USING (
  get_user_role() = 'coordinador'
  AND campaign_id IN (
    SELECT id FROM campaigns WHERE organization_id = get_user_org()
  )
);

CREATE POLICY "renewals_delete" ON renewals FOR DELETE USING (
  get_user_role() = 'coordinador'
  AND campaign_id IN (
    SELECT id FROM campaigns WHERE organization_id = get_user_org()
  )
);

-- --------------------------------------------------------------------------
-- VITXI_EXTENSIONS — agent sees own, supervisor sees campaign, coord sees all
-- --------------------------------------------------------------------------
CREATE POLICY "vitxi_extensions_select" ON vitxi_extensions FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN agent_id IN (
      SELECT ca.agent_id FROM campaign_agents ca
      WHERE ca.campaign_id IN (SELECT get_user_campaigns())
    )
    ELSE agent_id IN (
      SELECT id FROM profiles WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "vitxi_extensions_insert" ON vitxi_extensions FOR INSERT WITH CHECK (
  get_user_role() = 'coordinador'
);

CREATE POLICY "vitxi_extensions_update" ON vitxi_extensions FOR UPDATE USING (
  get_user_role() = 'coordinador'
);

CREATE POLICY "vitxi_extensions_delete" ON vitxi_extensions FOR DELETE USING (
  get_user_role() = 'coordinador'
);

-- --------------------------------------------------------------------------
-- CALLS — role-based
-- --------------------------------------------------------------------------
CREATE POLICY "calls_select" ON calls FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN agent_id IN (
      SELECT ca.agent_id FROM campaign_agents ca
      WHERE ca.campaign_id IN (SELECT get_user_campaigns())
    )
    ELSE agent_id IN (
      SELECT id FROM profiles WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "calls_insert" ON calls FOR INSERT WITH CHECK (
  -- Calls are typically inserted by webhooks (service role) or the agent themselves
  agent_id = auth.uid() OR get_user_role() = 'coordinador'
);

CREATE POLICY "calls_update" ON calls FOR UPDATE USING (
  agent_id = auth.uid() OR get_user_role() = 'coordinador'
);

-- --------------------------------------------------------------------------
-- AGENT_PAUSES — role-based
-- --------------------------------------------------------------------------
CREATE POLICY "agent_pauses_select" ON agent_pauses FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN agent_id IN (
      SELECT ca.agent_id FROM campaign_agents ca
      WHERE ca.campaign_id IN (SELECT get_user_campaigns())
    )
    ELSE agent_id IN (
      SELECT id FROM profiles WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "agent_pauses_insert" ON agent_pauses FOR INSERT WITH CHECK (
  agent_id = auth.uid()
);

CREATE POLICY "agent_pauses_update" ON agent_pauses FOR UPDATE USING (
  agent_id = auth.uid() OR get_user_role() IN ('supervisor', 'coordinador')
);

-- --------------------------------------------------------------------------
-- CONVERSATIONS — role-based (WhatsApp)
-- --------------------------------------------------------------------------
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN agent_id IN (
      SELECT ca.agent_id FROM campaign_agents ca
      WHERE ca.campaign_id IN (SELECT get_user_campaigns())
    )
    ELSE agent_id IN (
      SELECT id FROM profiles WHERE organization_id = get_user_org()
    )
  END
);

CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (
  agent_id = auth.uid() OR get_user_role() = 'coordinador'
);

CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (
  agent_id = auth.uid() OR get_user_role() = 'coordinador'
);

-- --------------------------------------------------------------------------
-- MESSAGES — through conversation ownership
-- --------------------------------------------------------------------------
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE CASE get_user_role()
      WHEN 'agente'     THEN c.agent_id = auth.uid()
      WHEN 'supervisor' THEN c.agent_id IN (
        SELECT ca.agent_id FROM campaign_agents ca
        WHERE ca.campaign_id IN (SELECT get_user_campaigns())
      )
      ELSE c.agent_id IN (
        SELECT p.id FROM profiles p WHERE p.organization_id = get_user_org()
      )
    END
  )
);

CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  conversation_id IN (
    SELECT c.id FROM conversations c WHERE c.agent_id = auth.uid()
  )
  OR get_user_role() = 'coordinador'
);

-- --------------------------------------------------------------------------
-- AUDIT_LOG — supervisor and coordinador only
-- --------------------------------------------------------------------------
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (
  get_user_role() IN ('supervisor', 'coordinador')
);

-- Inserts handled by trigger (SECURITY DEFINER), no user-facing insert policy needed
-- But we add one for completeness (service role or coord)
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (
  TRUE  -- Inserts are done by the SECURITY DEFINER audit trigger
);

-- --------------------------------------------------------------------------
-- ALERTS — supervisor and coordinador see org alerts
-- --------------------------------------------------------------------------
CREATE POLICY "alerts_select" ON alerts FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente'     THEN related_agent_id = auth.uid()
    WHEN 'supervisor' THEN organization_id = get_user_org()
    ELSE organization_id = get_user_org()
  END
);

CREATE POLICY "alerts_update" ON alerts FOR UPDATE USING (
  get_user_role() IN ('supervisor', 'coordinador')
  AND organization_id = get_user_org()
);

CREATE POLICY "alerts_insert" ON alerts FOR INSERT WITH CHECK (
  TRUE  -- Inserts are done by SECURITY DEFINER triggers
);

-- --------------------------------------------------------------------------
-- NOTIFICATIONS — user sees their own
-- --------------------------------------------------------------------------
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (
  user_id = auth.uid()
);

CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (
  TRUE  -- Inserts are done by system triggers or service role
);

CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (
  user_id = auth.uid()
);


-- ============================================================================
-- D) AUDIT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_leads
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_gestiones
  AFTER INSERT OR UPDATE OR DELETE ON gestiones
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_sales
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_renewals
  AFTER INSERT OR UPDATE OR DELETE ON renewals
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();


-- ============================================================================
-- E) PAUSE ABUSE ALERT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION pause_abuse_alert_fn() RETURNS TRIGGER AS $$
DECLARE
  pause_duration INTEGER;
  agent_org UUID;
BEGIN
  -- Only fire when a pause ends (ended_at transitions from NULL to a value)
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL) THEN
    pause_duration := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;

    IF pause_duration > 5400 THEN  -- 90 minutes = 5400 seconds
      SELECT organization_id INTO agent_org
      FROM profiles WHERE id = NEW.agent_id;

      INSERT INTO alerts (
        organization_id, severity, title, message, type, related_agent_id
      ) VALUES (
        agent_org,
        'alta',
        'Abuso de pausa detectado',
        format(
          'El agente ha tenido una pausa de tipo "%s" con duración de %s minutos (límite: 90 min)',
          NEW.pause_type::TEXT,
          ROUND(pause_duration / 60.0)
        ),
        'pause_abuse',
        NEW.agent_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER pause_abuse_check
  AFTER UPDATE ON agent_pauses
  FOR EACH ROW EXECUTE FUNCTION pause_abuse_alert_fn();


-- ============================================================================
-- F) ANALYTICS VIEWS
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. lead_contact_attempts — per lead contact attempt metrics
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW lead_contact_attempts AS
SELECT
  l.id                          AS lead_id,
  l.campaign_id,
  l.agent_id,
  l.organization_id,
  l.nombre,
  l.telefono,
  l.status,
  COUNT(g.id)                   AS total_attempts,
  MAX(g.created_at)             AS last_attempt_at,
  MIN(g.created_at)             AS first_attempt_at,
  CASE
    WHEN COUNT(g.id) > 1 THEN
      EXTRACT(EPOCH FROM (MAX(g.created_at) - MIN(g.created_at)))
      / GREATEST(COUNT(g.id) - 1, 1)
      / 86400.0
    ELSE 0
  END                           AS avg_days_between_attempts,
  (
    SELECT g2.retry_scheduled_at
    FROM gestiones g2
    WHERE g2.lead_id = l.id
      AND g2.retry_scheduled_at IS NOT NULL
      AND g2.retry_scheduled_at > NOW()
    ORDER BY g2.retry_scheduled_at ASC
    LIMIT 1
  )                             AS next_scheduled_retry
FROM leads l
LEFT JOIN gestiones g ON g.lead_id = l.id
GROUP BY l.id, l.campaign_id, l.agent_id, l.organization_id,
         l.nombre, l.telefono, l.status;

-- --------------------------------------------------------------------------
-- 2. lead_results_by_weekday — tipificacion root category counts by day of week
--    Uses lead.created_at for the day grouping
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW lead_results_by_weekday AS
WITH root_categories AS (
  -- Get the level-1 root for each tipificacion by walking up the tree
  SELECT
    t.id AS tipificacion_id,
    COALESCE(root.name, t.name) AS root_category
  FROM tipificacion_tree t
  LEFT JOIN tipificacion_tree root
    ON t.parent_id = root.id AND root.level = 1 AND t.level = 2
  WHERE t.level IN (1, 2)
  UNION ALL
  -- For level 3, walk up through level 2 to level 1
  SELECT
    t.id AS tipificacion_id,
    grandparent.name AS root_category
  FROM tipificacion_tree t
  JOIN tipificacion_tree parent ON t.parent_id = parent.id AND parent.level = 2
  JOIN tipificacion_tree grandparent ON parent.parent_id = grandparent.id AND grandparent.level = 1
  WHERE t.level = 3
)
SELECT
  l.campaign_id,
  l.organization_id,
  EXTRACT(DOW FROM l.created_at)::INTEGER AS day_of_week, -- 0=Sun, 6=Sat
  rc.root_category,
  COUNT(*)                                AS total
FROM gestiones g
JOIN leads l ON l.id = g.lead_id
JOIN root_categories rc ON rc.tipificacion_id = g.tipificacion_id
GROUP BY l.campaign_id, l.organization_id,
         EXTRACT(DOW FROM l.created_at)::INTEGER,
         rc.root_category;

-- --------------------------------------------------------------------------
-- 3. lead_results_by_hour — tipificacion root category counts by hour of day
--    Uses gestion.created_at for the hour grouping
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW lead_results_by_hour AS
WITH root_categories AS (
  SELECT
    t.id AS tipificacion_id,
    COALESCE(root.name, t.name) AS root_category
  FROM tipificacion_tree t
  LEFT JOIN tipificacion_tree root
    ON t.parent_id = root.id AND root.level = 1 AND t.level = 2
  WHERE t.level IN (1, 2)
  UNION ALL
  SELECT
    t.id AS tipificacion_id,
    grandparent.name AS root_category
  FROM tipificacion_tree t
  JOIN tipificacion_tree parent ON t.parent_id = parent.id AND parent.level = 2
  JOIN tipificacion_tree grandparent ON parent.parent_id = grandparent.id AND grandparent.level = 1
  WHERE t.level = 3
)
SELECT
  g.campaign_id,
  l.organization_id,
  EXTRACT(HOUR FROM g.created_at)::INTEGER AS hour_of_day, -- 0..23
  rc.root_category,
  COUNT(*)                                  AS total
FROM gestiones g
JOIN leads l ON l.id = g.lead_id
JOIN root_categories rc ON rc.tipificacion_id = g.tipificacion_id
GROUP BY g.campaign_id, l.organization_id,
         EXTRACT(HOUR FROM g.created_at)::INTEGER,
         rc.root_category;

-- --------------------------------------------------------------------------
-- 4. no_contact_recovery — for leads that had at least one NO CONTACTO:
--    total attempts, whether they were recovered, at which attempt
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW no_contact_recovery AS
WITH root_categories AS (
  SELECT
    t.id AS tipificacion_id,
    COALESCE(root.name, t.name) AS root_category
  FROM tipificacion_tree t
  LEFT JOIN tipificacion_tree root
    ON t.parent_id = root.id AND root.level = 1 AND t.level = 2
  WHERE t.level IN (1, 2)
  UNION ALL
  SELECT
    t.id AS tipificacion_id,
    grandparent.name AS root_category
  FROM tipificacion_tree t
  JOIN tipificacion_tree parent ON t.parent_id = parent.id AND parent.level = 2
  JOIN tipificacion_tree grandparent ON parent.parent_id = grandparent.id AND grandparent.level = 1
  WHERE t.level = 3
),
gestion_with_root AS (
  SELECT
    g.id,
    g.lead_id,
    g.campaign_id,
    g.attempt_number,
    g.created_at,
    rc.root_category
  FROM gestiones g
  JOIN root_categories rc ON rc.tipificacion_id = g.tipificacion_id
),
leads_with_no_contact AS (
  -- Leads that had at least one "NO CONTACTO"
  SELECT DISTINCT gwr.lead_id
  FROM gestion_with_root gwr
  WHERE gwr.root_category = 'NO CONTACTO'
),
first_no_contact AS (
  -- First "NO CONTACTO" attempt per lead
  SELECT
    gwr.lead_id,
    MIN(gwr.attempt_number) AS first_no_contact_attempt
  FROM gestion_with_root gwr
  WHERE gwr.root_category = 'NO CONTACTO'
  GROUP BY gwr.lead_id
),
recovery_attempt AS (
  -- First non-NO-CONTACTO attempt AFTER the first NO CONTACTO
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
-- G) ENABLE SUPABASE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE gestiones;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
