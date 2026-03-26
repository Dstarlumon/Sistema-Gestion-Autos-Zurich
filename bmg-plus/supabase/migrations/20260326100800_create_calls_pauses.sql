DO $$ BEGIN
  CREATE TYPE call_direction AS ENUM ('inbound','outbound');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE call_status AS ENUM ('ringing','active','completed','missed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pause_type AS ENUM ('almuerzo','break','bano','capacitacion','retroalimentacion','otro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS vitxi_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  extension VARCHAR(20) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS calls (
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

CREATE TABLE IF NOT EXISTS agent_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  pause_type pause_type NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_calls_external ON calls(external_call_id);
CREATE INDEX IF NOT EXISTS idx_pauses_agent ON agent_pauses(agent_id);
CREATE INDEX IF NOT EXISTS idx_pauses_active ON agent_pauses(agent_id) WHERE ended_at IS NULL;
