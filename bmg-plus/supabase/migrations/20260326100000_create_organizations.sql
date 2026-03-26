CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  config JSONB DEFAULT '{
    "timezone": "America/Bogota",
    "currency": "COP",
    "max_pause_minutes": 60,
    "sla_hours": 24,
    "daily_goal": 30
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default organization
INSERT INTO organizations (name) VALUES ('Zurich BPO Colombia')
ON CONFLICT DO NOTHING;
