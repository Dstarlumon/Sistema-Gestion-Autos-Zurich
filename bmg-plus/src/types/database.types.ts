export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_pauses: {
        Row: {
          agent_id: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          pause_type: Database["public"]["Enums"]["pause_type"]
          started_at: string | null
        }
        Insert: {
          agent_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          pause_type: Database["public"]["Enums"]["pause_type"]
          started_at?: string | null
        }
        Update: {
          agent_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          pause_type?: Database["public"]["Enums"]["pause_type"]
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_pauses_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_scorecards: {
        Row: {
          agent_id: string
          calls_count: number
          conversion_rate: number
          created_at: string | null
          date: string
          gestiones_count: number
          id: string
          sales_count: number
          total_prima: number
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          calls_count?: number
          conversion_rate?: number
          created_at?: string | null
          date: string
          gestiones_count?: number
          id?: string
          sales_count?: number
          total_prima?: number
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          calls_count?: number
          conversion_rate?: number
          created_at?: string | null
          date?: string
          gestiones_count?: number
          id?: string
          sales_count?: number
          total_prima?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_scorecards_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          organization_id: string
          related_agent_id: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          organization_id: string
          related_agent_id?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          organization_id?: string
          related_agent_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_related_agent_id_fkey"
            columns: ["related_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds: number | null
          ended_at: string | null
          external_call_id: string | null
          id: string
          metadata: Json | null
          phone_number: string | null
          recording_url: string | null
          started_at: string
          status: Database["public"]["Enums"]["call_status"]
        }
        Insert: {
          agent_id?: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          metadata?: Json | null
          phone_number?: string | null
          recording_url?: string | null
          started_at: string
          status?: Database["public"]["Enums"]["call_status"]
        }
        Update: {
          agent_id?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          metadata?: Json | null
          phone_number?: string | null
          recording_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_agents: {
        Row: {
          agent_id: string
          assigned_at: string | null
          campaign_id: string
        }
        Insert: {
          agent_id: string
          assigned_at?: string | null
          campaign_id: string
        }
        Update: {
          agent_id?: string
          assigned_at?: string | null
          campaign_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_agents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_bases: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_bases_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          external_id: string | null
          id: string
          last_message_at: string | null
          lead_id: string | null
          status: string | null
          unread_count: number | null
        }
        Insert: {
          agent_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          status?: string | null
          unread_count?: number | null
        }
        Update: {
          agent_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          status?: string | null
          unread_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_contact_attempts"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      gestiones: {
        Row: {
          agent_id: string
          attempt_number: number | null
          campaign_id: string
          canal: Database["public"]["Enums"]["gestion_canal"]
          cotizacion: boolean | null
          created_at: string | null
          id: string
          lead_id: string
          medio: string | null
          next_contact_at: string | null
          num_cotizacion: string | null
          observacion: string | null
          organization_id: string
          retry_notified: boolean | null
          retry_scheduled_at: string | null
          tipificacion_id: string
          valor_poliza: number | null
        }
        Insert: {
          agent_id: string
          attempt_number?: number | null
          campaign_id: string
          canal: Database["public"]["Enums"]["gestion_canal"]
          cotizacion?: boolean | null
          created_at?: string | null
          id?: string
          lead_id: string
          medio?: string | null
          next_contact_at?: string | null
          num_cotizacion?: string | null
          observacion?: string | null
          organization_id: string
          retry_notified?: boolean | null
          retry_scheduled_at?: string | null
          tipificacion_id: string
          valor_poliza?: number | null
        }
        Update: {
          agent_id?: string
          attempt_number?: number | null
          campaign_id?: string
          canal?: Database["public"]["Enums"]["gestion_canal"]
          cotizacion?: boolean | null
          created_at?: string | null
          id?: string
          lead_id?: string
          medio?: string | null
          next_contact_at?: string | null
          num_cotizacion?: string | null
          observacion?: string | null
          organization_id?: string
          retry_notified?: boolean | null
          retry_scheduled_at?: string | null
          tipificacion_id?: string
          valor_poliza?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gestiones_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestiones_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestiones_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_contact_attempts"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "gestiones_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestiones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestiones_tipificacion_id_fkey"
            columns: ["tipificacion_id"]
            isOneToOne: false
            referencedRelation: "tipificacion_tree"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string | null
          base_id: string | null
          campaign_id: string
          ciudad: string | null
          correo: string | null
          created_at: string
          documento: string | null
          id: string
          metadata: Json | null
          nombre: string
          organization_id: string
          placa: string | null
          search_vector: unknown
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"] | null
          telefono: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          agent_id?: string | null
          base_id?: string | null
          campaign_id: string
          ciudad?: string | null
          correo?: string | null
          created_at?: string
          documento?: string | null
          id?: string
          metadata?: Json | null
          nombre: string
          organization_id: string
          placa?: string | null
          search_vector?: unknown
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          telefono: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          agent_id?: string | null
          base_id?: string | null
          campaign_id?: string
          ciudad?: string | null
          correo?: string | null
          created_at?: string
          documento?: string | null
          id?: string
          metadata?: Json | null
          nombre?: string
          organization_id?: string
          placa?: string | null
          search_vector?: unknown
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          telefono?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "campaign_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          direction: string
          external_id: string | null
          id: string
          media_type: string | null
          media_url: string | null
          status: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          direction: string
          external_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          status?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          direction?: string
          external_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          plan: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          plan?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["agent_status"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      renewals: {
        Row: {
          agent_id: string
          campaign_id: string
          created_at: string | null
          documento: string | null
          fecha_vencimiento: string | null
          id: string
          lead_id: string | null
          medio: string | null
          nombre: string
          num_poliza_original: string | null
          observacion: string | null
          organization_id: string
          placa: string | null
          razon_no_renovacion: string | null
          se_renovo: Database["public"]["Enums"]["renewal_status"] | null
          telefono: string | null
          valor_actual: number | null
          valor_renovacion: number | null
        }
        Insert: {
          agent_id: string
          campaign_id: string
          created_at?: string | null
          documento?: string | null
          fecha_vencimiento?: string | null
          id?: string
          lead_id?: string | null
          medio?: string | null
          nombre: string
          num_poliza_original?: string | null
          observacion?: string | null
          organization_id: string
          placa?: string | null
          razon_no_renovacion?: string | null
          se_renovo?: Database["public"]["Enums"]["renewal_status"] | null
          telefono?: string | null
          valor_actual?: number | null
          valor_renovacion?: number | null
        }
        Update: {
          agent_id?: string
          campaign_id?: string
          created_at?: string | null
          documento?: string | null
          fecha_vencimiento?: string | null
          id?: string
          lead_id?: string | null
          medio?: string | null
          nombre?: string
          num_poliza_original?: string | null
          observacion?: string | null
          organization_id?: string
          placa?: string | null
          razon_no_renovacion?: string | null
          se_renovo?: Database["public"]["Enums"]["renewal_status"] | null
          telefono?: string | null
          valor_actual?: number | null
          valor_renovacion?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "renewals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_contact_attempts"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "renewals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          agent_id: string
          campaign_id: string
          canal: string | null
          ciudad: string | null
          correo: string | null
          created_at: string | null
          documento: string | null
          fecha_cotizacion: string | null
          fecha_emision: string | null
          fuente: string | null
          gestion_id: string | null
          id: string
          lead_id: string | null
          medio_pago: string | null
          nombre_cliente: string
          num_poliza: string | null
          organization_id: string
          placa: string | null
          telefono: string | null
          tipo_seguro: string | null
          valor_prima: number
        }
        Insert: {
          agent_id: string
          campaign_id: string
          canal?: string | null
          ciudad?: string | null
          correo?: string | null
          created_at?: string | null
          documento?: string | null
          fecha_cotizacion?: string | null
          fecha_emision?: string | null
          fuente?: string | null
          gestion_id?: string | null
          id?: string
          lead_id?: string | null
          medio_pago?: string | null
          nombre_cliente: string
          num_poliza?: string | null
          organization_id: string
          placa?: string | null
          telefono?: string | null
          tipo_seguro?: string | null
          valor_prima: number
        }
        Update: {
          agent_id?: string
          campaign_id?: string
          canal?: string | null
          ciudad?: string | null
          correo?: string | null
          created_at?: string | null
          documento?: string | null
          fecha_cotizacion?: string | null
          fecha_emision?: string | null
          fuente?: string | null
          gestion_id?: string | null
          id?: string
          lead_id?: string | null
          medio_pago?: string | null
          nombre_cliente?: string
          num_poliza?: string | null
          organization_id?: string
          placa?: string | null
          telefono?: string | null
          tipo_seguro?: string | null
          valor_prima?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_gestion_id_fkey"
            columns: ["gestion_id"]
            isOneToOne: false
            referencedRelation: "gestiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_contact_attempts"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tipificacion_tree: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          level: number
          name: string
          organization_id: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          name: string
          organization_id: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          name?: string
          organization_id?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tipificacion_tree_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipificacion_tree_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipificacion_tree_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tipificacion_tree"
            referencedColumns: ["id"]
          },
        ]
      }
      vitxi_extensions: {
        Row: {
          agent_id: string
          extension: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          agent_id: string
          extension: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          agent_id?: string
          extension?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "vitxi_extensions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      lead_contact_attempts: {
        Row: {
          agent_id: string | null
          avg_days_between_attempts: number | null
          campaign_id: string | null
          first_attempt_at: string | null
          last_attempt_at: string | null
          lead_id: string | null
          next_scheduled_retry: string | null
          nombre: string | null
          organization_id: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          telefono: string | null
          total_attempts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_results_by_hour: {
        Row: {
          campaign_id: string | null
          hour_of_day: number | null
          organization_id: string | null
          root_category: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gestiones_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_results_by_weekday: {
        Row: {
          campaign_id: string | null
          day_of_week: number | null
          organization_id: string | null
          root_category: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      no_contact_recovery: {
        Row: {
          agent_id: string | null
          campaign_id: string | null
          first_no_contact_attempt: number | null
          lead_id: string | null
          organization_id: string | null
          recovery_at_attempt: number | null
          recovery_category: string | null
          total_attempts: number | null
          was_recovered: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "gestiones_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_contact_attempts"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "gestiones_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_config: {
        Row: {
          key: string | null
          value: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_tipificacion_root: {
        Args: { tip_id: string }
        Returns: {
          root_id: string
          root_name: string
        }[]
      }
      get_user_campaigns: { Args: never; Returns: string[] }
      get_user_org: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      increment_unread: { Args: { conv_id: string }; Returns: undefined }
    }
    Enums: {
      agent_status: "disponible" | "en_llamada" | "pausa" | "offline"
      alert_severity: "alta" | "media" | "informativa"
      call_direction: "inbound" | "outbound"
      call_status: "ringing" | "active" | "completed" | "missed"
      gestion_canal: "telefono" | "whatsapp" | "email" | "chatbot"
      lead_source:
        | "inbound"
        | "chatbot"
        | "pauta"
        | "referido"
        | "organico"
        | "renovacion"
        | "otro"
      lead_status:
        | "nuevo"
        | "contactado"
        | "cotizado"
        | "en_proceso"
        | "venta"
        | "no_apto"
        | "cerrado"
      pause_type:
        | "almuerzo"
        | "break"
        | "bano"
        | "capacitacion"
        | "retroalimentacion"
        | "otro"
      renewal_status: "si" | "no" | "en_proceso"
      user_role: "coordinador" | "supervisor" | "agente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_status: ["disponible", "en_llamada", "pausa", "offline"],
      alert_severity: ["alta", "media", "informativa"],
      call_direction: ["inbound", "outbound"],
      call_status: ["ringing", "active", "completed", "missed"],
      gestion_canal: ["telefono", "whatsapp", "email", "chatbot"],
      lead_source: [
        "inbound",
        "chatbot",
        "pauta",
        "referido",
        "organico",
        "renovacion",
        "otro",
      ],
      lead_status: [
        "nuevo",
        "contactado",
        "cotizado",
        "en_proceso",
        "venta",
        "no_apto",
        "cerrado",
      ],
      pause_type: [
        "almuerzo",
        "break",
        "bano",
        "capacitacion",
        "retroalimentacion",
        "otro",
      ],
      renewal_status: ["si", "no", "en_proceso"],
      user_role: ["coordinador", "supervisor", "agente"],
    },
  },
} as const
