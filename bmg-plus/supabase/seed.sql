-- ============================================================================
-- BMG+ CRM — Seed Data
-- Campaigns, Campaign Bases, Tipificacion Tree
-- ============================================================================

-- ============================================================================
-- 1. CAMPAIGNS
-- ============================================================================

INSERT INTO campaigns (organization_id, name, slug, color, icon) VALUES
  ((SELECT id FROM organizations LIMIT 1), 'Autos',               'autos',          '#3b82f6', '🚗'),
  ((SELECT id FROM organizations LIMIT 1), 'Hogar',               'hogar',          '#059669', '🏠'),
  ((SELECT id FROM organizations LIMIT 1), 'Hogar Renovaciones',  'hogar_renov',    '#0d9488', '🔄'),
  ((SELECT id FROM organizations LIMIT 1), 'Arrendamiento',       'arrendamiento',  '#7c3aed', '🏢'),
  ((SELECT id FROM organizations LIMIT 1), 'Pymes',               'pymes',          '#d97706', '🏪'),
  ((SELECT id FROM organizations LIMIT 1), 'DirecTV',             'directv',        '#dc2626', '📺'),
  ((SELECT id FROM organizations LIMIT 1), 'Inbound/Chatbot',     'inbound',        '#0284c7', '📞')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. CAMPAIGN BASES
-- ============================================================================

-- Autos bases
INSERT INTO campaign_bases (campaign_id, name) VALUES
  ((SELECT id FROM campaigns WHERE slug = 'autos'), 'Directo'),
  ((SELECT id FROM campaigns WHERE slug = 'autos'), 'Pauta'),
  ((SELECT id FROM campaigns WHERE slug = 'autos'), 'In Bound'),
  ((SELECT id FROM campaigns WHERE slug = 'autos'), 'Chatbot');

-- Hogar bases
INSERT INTO campaign_bases (campaign_id, name) VALUES
  ((SELECT id FROM campaigns WHERE slug = 'hogar'), 'Hogar Directo');

-- Hogar Renovaciones bases
INSERT INTO campaign_bases (campaign_id, name) VALUES
  ((SELECT id FROM campaigns WHERE slug = 'hogar_renov'), 'Renovaciones Hogar');

-- Arrendamiento bases
INSERT INTO campaign_bases (campaign_id, name) VALUES
  ((SELECT id FROM campaigns WHERE slug = 'arrendamiento'), 'Arrendamiento Compensar'),
  ((SELECT id FROM campaigns WHERE slug = 'arrendamiento'), 'Arrendamiento Directo');

-- Pymes bases
INSERT INTO campaign_bases (campaign_id, name) VALUES
  ((SELECT id FROM campaigns WHERE slug = 'pymes'), 'Pymes Compensar'),
  ((SELECT id FROM campaigns WHERE slug = 'pymes'), 'Pymes Directo');

-- DirecTV bases
INSERT INTO campaign_bases (campaign_id, name) VALUES
  ((SELECT id FROM campaigns WHERE slug = 'directv'), 'Directo'),
  ((SELECT id FROM campaigns WHERE slug = 'directv'), 'Pauta');

-- Inbound/Chatbot bases
INSERT INTO campaign_bases (campaign_id, name) VALUES
  ((SELECT id FROM campaigns WHERE slug = 'inbound'), 'In Bound'),
  ((SELECT id FROM campaigns WHERE slug = 'inbound'), 'Chatbot');

-- ============================================================================
-- 3. TIPIFICACION TREE (Global — campaign_id = NULL)
-- ============================================================================

-- Use a DO block with CTEs to insert parents and children with proper IDs
DO $$
DECLARE
  v_org_id UUID;
  -- Level 1 IDs
  v_no_apto UUID;
  v_no_contacto UUID;
  v_contactado UUID;
  v_positivo UUID;
BEGIN
  -- Get the default organization
  SELECT id INTO v_org_id FROM organizations LIMIT 1;

  -- ========================================================================
  -- Level 1: Root categories
  -- ========================================================================

  INSERT INTO tipificacion_tree (organization_id, campaign_id, parent_id, name, level, sort_order)
  VALUES (v_org_id, NULL, NULL, 'NO APTO', 1, 1)
  RETURNING id INTO v_no_apto;

  INSERT INTO tipificacion_tree (organization_id, campaign_id, parent_id, name, level, sort_order)
  VALUES (v_org_id, NULL, NULL, 'NO CONTACTO', 1, 2)
  RETURNING id INTO v_no_contacto;

  INSERT INTO tipificacion_tree (organization_id, campaign_id, parent_id, name, level, sort_order)
  VALUES (v_org_id, NULL, NULL, 'CONTACTADO - NO COTIZA', 1, 3)
  RETURNING id INTO v_contactado;

  INSERT INTO tipificacion_tree (organization_id, campaign_id, parent_id, name, level, sort_order)
  VALUES (v_org_id, NULL, NULL, 'POSITIVO', 1, 4)
  RETURNING id INTO v_positivo;

  -- ========================================================================
  -- Level 2: NO APTO children
  -- ========================================================================

  INSERT INTO tipificacion_tree (organization_id, campaign_id, parent_id, name, level, sort_order) VALUES
    (v_org_id, NULL, v_no_apto, 'Cliente Ya Tiene Seguro Con Zurich Intermediario', 2, 1),
    (v_org_id, NULL, v_no_apto, 'Cliente Ya Tiene Seguro Con Zurich Directo',       2, 2),
    (v_org_id, NULL, v_no_apto, 'Esta Asesorado Por Un Asesor Zurich',              2, 3),
    (v_org_id, NULL, v_no_apto, 'Es Un Intermediario De Zurich',                    2, 4),
    (v_org_id, NULL, v_no_apto, 'Registro Duplicado',                               2, 5),
    (v_org_id, NULL, v_no_apto, 'Servicio al cliente',                              2, 6);

  -- ========================================================================
  -- Level 2: NO CONTACTO children
  -- ========================================================================

  INSERT INTO tipificacion_tree (organization_id, campaign_id, parent_id, name, level, sort_order) VALUES
    (v_org_id, NULL, v_no_contacto, 'No contesta',                             2, 1),
    (v_org_id, NULL, v_no_contacto, 'Cliente cuelga - Llamada caída',          2, 2),
    (v_org_id, NULL, v_no_contacto, 'Datos No Corresponden (Número - Rpl)',    2, 3),
    (v_org_id, NULL, v_no_contacto, 'No contacto - sin datos',                 2, 4),
    (v_org_id, NULL, v_no_contacto, 'Buzón de voz',                            2, 5);

  -- ========================================================================
  -- Level 2: CONTACTADO - NO COTIZA children
  -- ========================================================================

  INSERT INTO tipificacion_tree (organization_id, campaign_id, parent_id, name, level, sort_order) VALUES
    (v_org_id, NULL, v_contactado, 'No está interesado en comprar',             2, 1),
    (v_org_id, NULL, v_contactado, 'Volver a llamar',                           2, 2),
    (v_org_id, NULL, v_contactado, 'Contacto con tercero',                      2, 3),
    (v_org_id, NULL, v_contactado, 'Interesado en otro producto',               2, 4),
    (v_org_id, NULL, v_contactado, 'Interesado en SOAT',                        2, 5),
    (v_org_id, NULL, v_contactado, 'Vendió el vehículo',                        2, 6),
    (v_org_id, NULL, v_contactado, 'Cliente informa que no se registró',        2, 7),
    (v_org_id, NULL, v_contactado, 'Mala experiencia con Zurich',               2, 8),
    (v_org_id, NULL, v_contactado, 'No asegurable por MARCA',                   2, 9),
    (v_org_id, NULL, v_contactado, 'No asegurable por POLÍTICAS',               2, 10),
    (v_org_id, NULL, v_contactado, 'Ya lo compró con otra compañía',            2, 11),
    (v_org_id, NULL, v_contactado, 'Se decidió con otra compañía',              2, 12),
    (v_org_id, NULL, v_contactado, 'Solo está cotizando',                       2, 13),
    (v_org_id, NULL, v_contactado, 'Precio con otra aseguradora',               2, 14),
    (v_org_id, NULL, v_contactado, 'No venta',                                  2, 15);

  -- ========================================================================
  -- Level 2: POSITIVO children
  -- ========================================================================

  INSERT INTO tipificacion_tree (organization_id, campaign_id, parent_id, name, level, sort_order) VALUES
    (v_org_id, NULL, v_positivo, 'En proceso',             2, 1),
    (v_org_id, NULL, v_positivo, 'Pendiente inspección',   2, 2),
    (v_org_id, NULL, v_positivo, 'Venta',                  2, 3);

END $$;
