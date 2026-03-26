-- ==========================================================================
-- Fix 5: Create increment_unread RPC + organization_config view
-- ==========================================================================

-- RPC for Callbell webhook to atomically increment unread count
CREATE OR REPLACE FUNCTION increment_unread(conv_id UUID)
RETURNS void AS $$
  UPDATE conversations SET unread_count = unread_count + 1 WHERE id = conv_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- View: organization_config
-- The hourly cron queries:
--   supabase.from('organization_config').select('value').eq('key', 'sla_hours').single()
-- But the actual config lives in organizations.config JSONB.
-- This view exposes the first organization's JSONB keys as (key, value) rows.
CREATE OR REPLACE VIEW organization_config AS
  SELECT
    k.key,
    k.value
  FROM organizations o,
       LATERAL jsonb_each_text(o.config) AS k(key, value)
  LIMIT 100;

-- Grant select on the view to authenticated users
GRANT SELECT ON organization_config TO authenticated;
