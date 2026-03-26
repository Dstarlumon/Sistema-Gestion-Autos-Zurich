DO $$ BEGIN
  CREATE TYPE gestion_canal AS ENUM ('telefono','whatsapp','email','chatbot');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS gestiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  tipificacion_id UUID NOT NULL REFERENCES tipificacion_tree(id),
  canal gestion_canal NOT NULL,
  medio VARCHAR(100),
  cotizacion BOOLEAN DEFAULT FALSE,
  num_cotizacion VARCHAR(50),
  valor_poliza NUMERIC(15,2),
  observacion TEXT,
  attempt_number INTEGER,
  retry_scheduled_at TIMESTAMPTZ,
  retry_notified BOOLEAN DEFAULT FALSE,
  next_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gestiones_lead ON gestiones(lead_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_agent ON gestiones(agent_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_campaign ON gestiones(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gestiones_retry ON gestiones(retry_scheduled_at)
  WHERE retry_scheduled_at IS NOT NULL AND retry_notified = FALSE;

-- Auto-calculate attempt_number
CREATE OR REPLACE FUNCTION set_attempt_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.attempt_number := (
    SELECT COALESCE(MAX(attempt_number), 0) + 1
    FROM gestiones WHERE lead_id = NEW.lead_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_gestion_insert ON gestiones;
CREATE TRIGGER before_gestion_insert
  BEFORE INSERT ON gestiones
  FOR EACH ROW EXECUTE FUNCTION set_attempt_number();
