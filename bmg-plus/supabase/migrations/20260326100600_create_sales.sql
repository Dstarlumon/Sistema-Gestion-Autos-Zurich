CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  gestion_id UUID REFERENCES gestiones(id),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  nombre_cliente VARCHAR(255) NOT NULL,
  documento VARCHAR(50),
  telefono VARCHAR(50),
  correo VARCHAR(255),
  placa VARCHAR(20),
  ciudad VARCHAR(100),
  valor_prima NUMERIC(15,2) NOT NULL,
  num_poliza VARCHAR(50),
  tipo_seguro VARCHAR(100),
  canal VARCHAR(50),
  fuente VARCHAR(100),
  medio_pago VARCHAR(100),
  fecha_emision DATE,
  fecha_cotizacion DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_agent ON sales(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_campaign ON sales(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sales_lead ON sales(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
