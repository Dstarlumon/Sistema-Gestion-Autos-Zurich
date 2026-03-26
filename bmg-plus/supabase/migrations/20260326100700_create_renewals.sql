DO $$ BEGIN
  CREATE TYPE renewal_status AS ENUM ('si','no','en_proceso');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  documento VARCHAR(50),
  num_poliza_original VARCHAR(50),
  fecha_vencimiento DATE,
  placa VARCHAR(20),
  valor_actual NUMERIC(15,2),
  valor_renovacion NUMERIC(15,2),
  se_renovo renewal_status DEFAULT 'en_proceso',
  razon_no_renovacion TEXT,
  medio VARCHAR(100),
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewals_agent ON renewals(agent_id);
CREATE INDEX IF NOT EXISTS idx_renewals_campaign ON renewals(campaign_id);
