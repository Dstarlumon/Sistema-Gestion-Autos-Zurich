export const ROLES = ['coordinador', 'supervisor', 'agente'] as const
export type Role = (typeof ROLES)[number]

export const AGENT_STATUSES = ['disponible', 'en_llamada', 'pausa', 'offline'] as const
export type AgentStatus = (typeof AGENT_STATUSES)[number]

export const LEAD_STATUSES = [
  'nuevo',
  'contactado',
  'cotizado',
  'en_proceso',
  'venta',
  'no_apto',
  'cerrado',
] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const CANALES = ['telefono', 'whatsapp', 'email', 'chatbot'] as const
export type Canal = (typeof CANALES)[number]

export const PAUSE_TYPES = [
  'almuerzo',
  'break',
  'bano',
  'capacitacion',
  'retroalimentacion',
  'otro',
] as const
export type PauseType = (typeof PAUSE_TYPES)[number]

export const CAMPAIGN_COLORS: Record<string, string> = {
  autos: '#3b82f6',
  hogar: '#059669',
  hogar_renov: '#0d9488',
  arrendamiento: '#7c3aed',
  pymes: '#d97706',
  directv: '#dc2626',
  inbound: '#0284c7',
}

export const ALERT_SEVERITIES = ['alta', 'media', 'informativa'] as const
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]
