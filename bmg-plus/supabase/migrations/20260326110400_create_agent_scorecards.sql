-- ==========================================================================
-- Fix 4: Create agent_scorecards table for daily cron scorecard generation
-- ==========================================================================

CREATE TABLE IF NOT EXISTS agent_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gestiones_count INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  total_prima NUMERIC(14,2) NOT NULL DEFAULT 0,
  calls_count INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique for upsert on (agent_id, date)
  CONSTRAINT agent_scorecards_agent_date_uq UNIQUE (agent_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scorecards_agent ON agent_scorecards(agent_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_date ON agent_scorecards(date);

-- Enable RLS
ALTER TABLE agent_scorecards ENABLE ROW LEVEL SECURITY;

-- Supervisors and coordinators can read scorecards for agents they oversee
CREATE POLICY "scorecards_select" ON agent_scorecards FOR SELECT USING (
  CASE get_user_role()
    WHEN 'agente' THEN agent_id = auth.uid()
    WHEN 'supervisor' THEN agent_id IN (
      SELECT ca.agent_id FROM campaign_agents ca
      WHERE ca.campaign_id IN (SELECT get_user_campaigns())
    )
    WHEN 'coordinador' THEN agent_id IN (
      SELECT id FROM profiles WHERE organization_id = get_user_org()
    )
    ELSE false
  END
);

-- Only service_role can insert/update (cron runs with admin client)
-- No INSERT/UPDATE/DELETE policies for authenticated users means
-- only service_role (which bypasses RLS) can write.

-- updated_at trigger
CREATE TRIGGER set_agent_scorecards_updated_at
  BEFORE UPDATE ON agent_scorecards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
