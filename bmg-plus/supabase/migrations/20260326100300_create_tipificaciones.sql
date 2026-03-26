CREATE TABLE IF NOT EXISTS tipificacion_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES tipificacion_tree(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
  sort_order SMALLINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tipificacion_parent ON tipificacion_tree(parent_id);
CREATE INDEX IF NOT EXISTS idx_tipificacion_org ON tipificacion_tree(organization_id);
CREATE INDEX IF NOT EXISTS idx_tipificacion_campaign ON tipificacion_tree(campaign_id);
