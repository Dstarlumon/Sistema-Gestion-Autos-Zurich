DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM ('inbound','chatbot','pauta','referido','organico','renovacion','otro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('nuevo','contactado','cotizado','en_proceso','venta','no_apto','cerrado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  agent_id UUID REFERENCES profiles(id),
  base_id UUID REFERENCES campaign_bases(id),
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  documento VARCHAR(50),
  correo VARCHAR(255),
  ciudad VARCHAR(100),
  placa VARCHAR(20),
  source lead_source DEFAULT 'otro',
  status lead_status DEFAULT 'nuevo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_agent ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_telefono ON leads(telefono);
CREATE INDEX IF NOT EXISTS idx_leads_documento ON leads(documento);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- Full-text search vector
ALTER TABLE leads ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('spanish', COALESCE(nombre,'') || ' ' || COALESCE(telefono,'') || ' ' || COALESCE(documento,'') || ' ' || COALESCE(correo,''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_leads_search ON leads USING GIN(search_vector);
