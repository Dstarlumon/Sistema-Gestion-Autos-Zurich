# BMG+ CRM — Phase 12 Adjustments: Onboarding Simplification

> **For Claude:** Apply these changes to the existing Phase 12 onboarding implementation.

**Why:** The current onboarding has config fields (SLA, daily goal, max pause, timezone) that belong at the campaign level, not the organization level. A BPO manages multiple campaigns with different SLAs and goals. The industry field was too narrow (5 options for campaign sectors) — it should describe the BPO's own business type with a broader list.

---

## Change 1: Simplify onboarding to 2 steps (remove config step)

### Files to modify:
- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/(onboarding)/onboarding/actions.ts`

### Current flow (3 steps):
1. Nombre org + Industria (5 opciones)
2. Config operativa (timezone, SLA, max pause, daily goal)
3. Invitar equipo (opcional)

### New flow (2 steps):
1. **Nombre org + Industria** (16 opciones — ver lista abajo)
2. **Invitar equipo** (opcional)

### What to remove from onboarding:
- Step 2 entirely (timezone, currency, sla_hours, max_pause_minutes, daily_goal)
- These fields from the Zod schema
- The stepper should show 2 steps, not 3

### What stays in organizations.config:
Keep the JSONB `config` column with sensible defaults. These will be editable from `/admin/configuracion`:
```json
{
  "timezone": "America/Bogota",
  "currency": "COP",
  "max_pause_minutes": 60
}
```

### Organization-level config keeps:
- `timezone` — affects the entire org (display, cron timing)
- `currency` — affects the entire org (COP formatting)
- `max_pause_minutes` — org-wide policy for pause abuse detection

### Move to campaign-level (future task):
- `sla_hours` — each campaign has different SLA requirements
- `daily_goal` — each campaign has different daily targets

---

## Change 2: Expand industry list to 16 options + "Otro"

### Files to modify:
- `src/app/(onboarding)/onboarding/page.tsx` (radio cards → select dropdown or searchable list)

### New industry list:

```typescript
const INDUSTRIES = [
  { value: 'tecnologia', label: 'Tecnologia y Software' },
  { value: 'financiero', label: 'Servicios Financieros / Banca' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'salud', label: 'Salud y Farmaceutica' },
  { value: 'telecomunicaciones', label: 'Telecomunicaciones' },
  { value: 'educacion', label: 'Educacion' },
  { value: 'logistica', label: 'Logistica y Transporte' },
  { value: 'retail', label: 'Comercio / Retail / E-commerce' },
  { value: 'energia', label: 'Energia y Petroleo' },
  { value: 'manufactura', label: 'Manufactura e Industria' },
  { value: 'consultoria', label: 'Consultoria y Servicios Profesionales' },
  { value: 'marketing', label: 'Marketing y Publicidad' },
  { value: 'gobierno', label: 'Gobierno y Sector Publico' },
  { value: 'bpo', label: 'BPO / Contact Center' },
  { value: 'turismo', label: 'Turismo y Hoteleria' },
  { value: 'otro', label: 'Otro' },
] as const
```

### UI change:
- Replace 5 radio cards with a **Select dropdown** (16 options don't fit as radio cards)
- Use the shadcn `Select` component
- Keep alphabetical order with "Otro" at the end
- The industry describes the BPO's own business type, NOT the sectors of its campaigns

### Important:
- The industry field should NOT drive campaign seeding anymore
- Default campaigns should be generic (not industry-specific), since each BPO defines its own campaigns
- Remove the industry-to-campaign mapping from the server action

---

## Change 3: Default campaigns are generic (not industry-driven)

### Files to modify:
- `src/app/(onboarding)/onboarding/actions.ts`

### Current behavior:
The server action seeds different campaigns based on industry (7 for seguros, 4 for telecom, etc.)

### New behavior:
Seed 2-3 generic starter campaigns regardless of industry. The coordinator will create and customize campaigns from `/admin/campanas`.

```typescript
const defaultCampaigns = [
  { name: 'Campana Principal', slug: 'campana-principal', color: '#3b82f6', icon: '📋' },
  { name: 'Inbound', slug: 'inbound', color: '#0284c7', icon: '📞' },
]
```

**Why:** A BPO's campaigns are unique to their operation. Pre-seeding "Autos" and "Hogar" only makes sense for Zurich Insurance. The coordinator should create campaigns that match their actual business.

---

## Change 4: Move SLA and daily_goal to campaign config (future)

### Context:
This is a structural change that should be planned separately. For now, document the intention.

### Future schema change:
```sql
-- Add config fields to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sla_hours INTEGER DEFAULT 24;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 30;
```

### Where it's used:
- `/api/cron/hourly` (SLA breach detection) — currently reads from `organizations.config`, should read from `campaigns.sla_hours`
- Dashboard KPIs — daily goal comparison should be per-campaign
- Agent scorecard — SLA compliance should be per-campaign

### NOT in scope for this adjustment:
This is a future task. For now, the org-level defaults work. The adjustment only removes these fields from the onboarding UI, not from the database.

---

## Change 5: Update Zod schema

### Current schema:
```typescript
const onboardingSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres'),
  industry: z.string().min(1, 'Selecciona una industria'),
  timezone: z.string(),
  currency: z.string(),
  sla_hours: z.number().min(1),
  max_pause_minutes: z.number().min(1),
  daily_goal: z.number().min(1),
  teamMembers: z.array(...).optional(),
})
```

### New schema:
```typescript
const onboardingSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres'),
  industry: z.string().min(1, 'Selecciona una industria'),
  teamMembers: z.array(z.object({
    email: z.string().email('Email invalido'),
    role: z.enum(['agente', 'supervisor']),
  })).optional(),
})
```

---

## Change 6: Add help tooltips (ℹ) for technical terms

### Files to modify:
- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/(app)/admin/configuracion/page.tsx`

### Implementation:
Add an info icon `(ℹ)` next to technical or non-obvious fields. On hover/click, show a tooltip with a plain-language explanation in Spanish.

Use shadcn `Tooltip` component (already installed):

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

function HelpTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info size={14} className="inline ml-1 text-on-surface-variant cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[250px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
```

### Where to add tooltips:

**In `/admin/configuracion`:**

| Field | Tooltip text |
|-------|-------------|
| Zona Horaria | "Define la hora local de tu operacion. Afecta reportes, cron jobs y marcas de tiempo." |
| Moneda | "Formato de moneda para valores de prima, poliza y reportes financieros." |
| Max. Pausa (min) | "Tiempo maximo permitido de pausa por agente antes de generar una alerta de abuso." |
| SLA (horas) | "Tiempo maximo para contactar un lead nuevo. Leads sin gestion despues de este tiempo generan alerta." |
| Meta Diaria | "Numero de gestiones que cada agente debe completar por dia." |

**In onboarding Step 1:**

| Field | Tooltip text |
|-------|-------------|
| Industria | "Selecciona el sector de tu empresa. Esto nos ayuda a personalizar tu experiencia." |

**In admin campaign config (future — when SLA moves to campaigns):**

| Field | Tooltip text |
|-------|-------------|
| SLA Campana | "Tiempo maximo para la primera gestion de un lead en esta campana." |
| Meta Diaria | "Cantidad de gestiones objetivo por agente por dia en esta campana." |

---

## Summary of changes

| Item | Action |
|------|--------|
| Onboarding steps | 3 → 2 (remove config step) |
| Industry options | 5 radio cards → 16 option Select dropdown |
| Config fields (SLA, goal, pause) | Remove from onboarding, keep in `/admin/configuracion` |
| Campaign seeding | Industry-specific → generic starter campaigns |
| Zod schema | Remove config fields |
| Server action | Remove industry-to-campaign mapping, use generic defaults |
| SLA per campaign | Future task (documented, not implemented now) |

---

## Testing checklist

- [ ] Onboarding shows 2 steps (Organizacion, Equipo)
- [ ] Industry dropdown has 16 options + works correctly
- [ ] No config fields (timezone, SLA, etc.) in onboarding
- [ ] Generic campaigns created regardless of industry
- [ ] Organization created with default config in JSONB
- [ ] Config editable from `/admin/configuracion`
- [ ] Team invite still works and can be skipped
- [ ] Existing users with organizations are unaffected
