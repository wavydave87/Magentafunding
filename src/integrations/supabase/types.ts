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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      closing_document_items: {
        Row: {
          deal_id: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          deal_id: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          deal_id?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "closing_document_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_acceptances: {
        Row: {
          accepted_amount: number
          accepted_at: string
          computed_payback: number
          computed_payment: number
          deal_id: string
          frequency: string
          id: string
          requested_funding_date: string | null
        }
        Insert: {
          accepted_amount: number
          accepted_at?: string
          computed_payback: number
          computed_payment: number
          deal_id: string
          frequency: string
          id?: string
          requested_funding_date?: string | null
        }
        Update: {
          accepted_amount?: number
          accepted_at?: string
          computed_payback?: number
          computed_payment?: number
          deal_id?: string
          frequency?: string
          id?: string
          requested_funding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_acceptances_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_bank_verification_clicks: {
        Row: {
          clicked_at: string
          deal_id: string
          id: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          clicked_at?: string
          deal_id: string
          id?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          clicked_at?: string
          deal_id?: string
          id?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_bank_verification_clicks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_follow_ups: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deal_id: string
          due_at: string
          id: string
          note: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deal_id: string
          due_at: string
          id?: string
          note?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deal_id?: string
          due_at?: string
          id?: string
          note?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_follow_ups_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_presets: {
        Row: {
          amount: number
          deal_id: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          amount: number
          deal_id: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          amount?: number
          deal_id?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_presets_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_revision_requests: {
        Row: {
          computed_payback: number
          computed_payment: number
          created_at: string
          deal_id: string
          frequency: string
          id: string
          note: string | null
          requested_amount: number
          requested_funding_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          computed_payback: number
          computed_payment: number
          created_at?: string
          deal_id: string
          frequency: string
          id?: string
          note?: string | null
          requested_amount: number
          requested_funding_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          computed_payback?: number
          computed_payment?: number
          created_at?: string
          deal_id?: string
          frequency?: string
          id?: string
          note?: string | null
          requested_amount?: number
          requested_funding_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_revision_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_sends: {
        Row: {
          channel: string
          created_at: string
          deal_id: string
          destination: string | null
          detail: string | null
          id: string
          kind: string
          sent_by: string
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          deal_id: string
          destination?: string | null
          detail?: string | null
          id?: string
          kind?: string
          sent_by: string
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          deal_id?: string
          destination?: string | null
          detail?: string | null
          id?: string
          kind?: string
          sent_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_sends_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_views: {
        Row: {
          deal_id: string
          id: string
          user_agent: string | null
          viewed_at: string
          visitor_id: string
        }
        Insert: {
          deal_id: string
          id?: string
          user_agent?: string | null
          viewed_at?: string
          visitor_id: string
        }
        Update: {
          deal_id?: string
          id?: string
          user_agent?: string | null
          viewed_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_views_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          allow_weekly: boolean
          bank_verification_url: string | null
          buy_rate: number
          created_at: string
          expiration_date: string
          funding_window_end: string | null
          funding_window_start: string | null
          id: string
          max_funded: number
          merchant_email: string | null
          merchant_name: string
          merchant_phone: string | null
          min_funded: number
          origination_fee_percent: number
          other_fees: number
          pif_enabled: boolean
          rep_id: string
          sell_rate: number | null
          status: string
          term_days: number
          updated_at: string
          upsell_points: number
          weekly_rate_increase_points: number
        }
        Insert: {
          allow_weekly?: boolean
          bank_verification_url?: string | null
          buy_rate: number
          created_at?: string
          expiration_date: string
          funding_window_end?: string | null
          funding_window_start?: string | null
          id?: string
          max_funded: number
          merchant_email?: string | null
          merchant_name: string
          merchant_phone?: string | null
          min_funded: number
          origination_fee_percent?: number
          other_fees?: number
          pif_enabled?: boolean
          rep_id: string
          sell_rate?: number | null
          status?: string
          term_days: number
          updated_at?: string
          upsell_points?: number
          weekly_rate_increase_points?: number
        }
        Update: {
          allow_weekly?: boolean
          bank_verification_url?: string | null
          buy_rate?: number
          created_at?: string
          expiration_date?: string
          funding_window_end?: string | null
          funding_window_start?: string | null
          id?: string
          max_funded?: number
          merchant_email?: string | null
          merchant_name?: string
          merchant_phone?: string | null
          min_funded?: number
          origination_fee_percent?: number
          other_fees?: number
          pif_enabled?: boolean
          rep_id?: string
          sell_rate?: number | null
          status?: string
          term_days?: number
          updated_at?: string
          upsell_points?: number
          weekly_rate_increase_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          application_id: string | null
          attempts: number
          created_at: string
          direction: string
          error: string | null
          event_type: string
          external_id: string | null
          id: string
          idempotency_key: string
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          source_system: string
          status: Database["public"]["Enums"]["integration_event_status"]
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          attempts?: number
          created_at?: string
          direction: string
          error?: string | null
          event_type: string
          external_id?: string | null
          id?: string
          idempotency_key: string
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          source_system?: string
          status?: Database["public"]["Enums"]["integration_event_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          attempts?: number
          created_at?: string
          direction?: string
          error?: string | null
          event_type?: string
          external_id?: string | null
          id?: string
          idempotency_key?: string
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          source_system?: string
          status?: Database["public"]["Enums"]["integration_event_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_application_drafts: {
        Row: {
          application_id: string
          created_at: string
          current_step: number
          id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          current_step?: number
          id?: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          current_step?: number
          id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_application_drafts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_application_drafts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_application_tokens: {
        Row: {
          application_id: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["merchant_token_kind"]
          last_used_at: string | null
          revoked_at: string | null
          rotated_from: string | null
          rotation_count: number
          token_hash: string
        }
        Insert: {
          application_id: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          kind?: Database["public"]["Enums"]["merchant_token_kind"]
          last_used_at?: string | null
          revoked_at?: string | null
          rotated_from?: string | null
          rotation_count?: number
          token_hash: string
        }
        Update: {
          application_id?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["merchant_token_kind"]
          last_used_at?: string | null
          revoked_at?: string | null
          rotated_from?: string | null
          rotation_count?: number
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_application_tokens_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_application_tokens_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_application_tokens_rotated_from_fkey"
            columns: ["rotated_from"]
            isOneToOne: false
            referencedRelation: "merchant_application_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      partner_application_events: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          title: string
          visibility: Database["public"]["Enums"]["partner_event_visibility"]
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          title: string
          visibility?: Database["public"]["Enums"]["partner_event_visibility"]
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          title?: string
          visibility?: Database["public"]["Enums"]["partner_event_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "partner_application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_application_owners: {
        Row: {
          application_id: string
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          home_address: string | null
          id: string
          last_name: string
          ownership_percent: number | null
          phone: string | null
          sort_order: number
          state: string | null
          title: string | null
          zip: string | null
        }
        Insert: {
          application_id: string
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          home_address?: string | null
          id?: string
          last_name?: string
          ownership_percent?: number | null
          phone?: string | null
          sort_order?: number
          state?: string | null
          title?: string | null
          zip?: string | null
        }
        Update: {
          application_id?: string
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          home_address?: string | null
          id?: string
          last_name?: string
          ownership_percent?: number | null
          phone?: string | null
          sort_order?: number
          state?: string | null
          title?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_application_owners_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_application_owners_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_application_status_history: {
        Row: {
          actor_user_id: string | null
          application_id: string
          id: string
          new_value: string
          occurred_at: string
          partner_visible: boolean
          previous_value: string | null
          reason: string | null
          source: string
          state_kind: string
        }
        Insert: {
          actor_user_id?: string | null
          application_id: string
          id?: string
          new_value: string
          occurred_at?: string
          partner_visible?: boolean
          previous_value?: string | null
          reason?: string | null
          source?: string
          state_kind: string
        }
        Update: {
          actor_user_id?: string | null
          application_id?: string
          id?: string
          new_value?: string
          occurred_at?: string
          partner_visible?: boolean
          previous_value?: string | null
          reason?: string | null
          source?: string
          state_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          abandoned_at: string | null
          address_2: string | null
          application_state: Database["public"]["Enums"]["merchant_application_state"]
          approved_amount: number | null
          assigned_rep_id: string | null
          attributed_member_id: string | null
          attributed_organization_id: string | null
          average_monthly_revenue: number | null
          banking_connected: boolean
          banking_provider: string | null
          banking_reference: string | null
          business_address: string | null
          business_description: string | null
          city: string | null
          commission_amount: number | null
          completion_percent: number
          contact_email: string | null
          contact_first_name: string | null
          contact_last_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          date_business_started: string | null
          dba: string | null
          ein: string | null
          existing_balances: number | null
          existing_positions: string | null
          funded_amount: number | null
          funded_at: string | null
          funding_history: string | null
          funding_state: Database["public"]["Enums"]["partner_funding_state"]
          home_based_business: boolean
          id: string
          industry: string | null
          last_activity_at: string
          last_completed_step: number
          legal_business_name: string
          legal_entity: string | null
          linked_deal_id: string | null
          missing_items: string[] | null
          naics_code: string | null
          organization_id: string
          partner_status: Database["public"]["Enums"]["partner_facing_status"]
          reference: string
          referral_id: string | null
          referred_by_member_id: string | null
          requested_amount: number | null
          source: string
          started_at: string | null
          state: string | null
          state_incorporated: string | null
          status: Database["public"]["Enums"]["partner_application_status"]
          submitted_at: string | null
          updated_at: string
          use_of_funds: string | null
          visit_id: string | null
          website: string | null
          wizard_step: number
          zip: string | null
        }
        Insert: {
          abandoned_at?: string | null
          address_2?: string | null
          application_state?: Database["public"]["Enums"]["merchant_application_state"]
          approved_amount?: number | null
          assigned_rep_id?: string | null
          attributed_member_id?: string | null
          attributed_organization_id?: string | null
          average_monthly_revenue?: number | null
          banking_connected?: boolean
          banking_provider?: string | null
          banking_reference?: string | null
          business_address?: string | null
          business_description?: string | null
          city?: string | null
          commission_amount?: number | null
          completion_percent?: number
          contact_email?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          date_business_started?: string | null
          dba?: string | null
          ein?: string | null
          existing_balances?: number | null
          existing_positions?: string | null
          funded_amount?: number | null
          funded_at?: string | null
          funding_history?: string | null
          funding_state?: Database["public"]["Enums"]["partner_funding_state"]
          home_based_business?: boolean
          id?: string
          industry?: string | null
          last_activity_at?: string
          last_completed_step?: number
          legal_business_name?: string
          legal_entity?: string | null
          linked_deal_id?: string | null
          missing_items?: string[] | null
          naics_code?: string | null
          organization_id: string
          partner_status?: Database["public"]["Enums"]["partner_facing_status"]
          reference?: string
          referral_id?: string | null
          referred_by_member_id?: string | null
          requested_amount?: number | null
          source?: string
          started_at?: string | null
          state?: string | null
          state_incorporated?: string | null
          status?: Database["public"]["Enums"]["partner_application_status"]
          submitted_at?: string | null
          updated_at?: string
          use_of_funds?: string | null
          visit_id?: string | null
          website?: string | null
          wizard_step?: number
          zip?: string | null
        }
        Update: {
          abandoned_at?: string | null
          address_2?: string | null
          application_state?: Database["public"]["Enums"]["merchant_application_state"]
          approved_amount?: number | null
          assigned_rep_id?: string | null
          attributed_member_id?: string | null
          attributed_organization_id?: string | null
          average_monthly_revenue?: number | null
          banking_connected?: boolean
          banking_provider?: string | null
          banking_reference?: string | null
          business_address?: string | null
          business_description?: string | null
          city?: string | null
          commission_amount?: number | null
          completion_percent?: number
          contact_email?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          date_business_started?: string | null
          dba?: string | null
          ein?: string | null
          existing_balances?: number | null
          existing_positions?: string | null
          funded_amount?: number | null
          funded_at?: string | null
          funding_history?: string | null
          funding_state?: Database["public"]["Enums"]["partner_funding_state"]
          home_based_business?: boolean
          id?: string
          industry?: string | null
          last_activity_at?: string
          last_completed_step?: number
          legal_business_name?: string
          legal_entity?: string | null
          linked_deal_id?: string | null
          missing_items?: string[] | null
          naics_code?: string | null
          organization_id?: string
          partner_status?: Database["public"]["Enums"]["partner_facing_status"]
          reference?: string
          referral_id?: string | null
          referred_by_member_id?: string | null
          requested_amount?: number | null
          source?: string
          started_at?: string | null
          state?: string | null
          state_incorporated?: string | null
          status?: Database["public"]["Enums"]["partner_application_status"]
          submitted_at?: string | null
          updated_at?: string
          use_of_funds?: string | null
          visit_id?: string | null
          website?: string | null
          wizard_step?: number
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_applications_assigned_rep_id_fkey"
            columns: ["assigned_rep_id"]
            isOneToOne: false
            referencedRelation: "rep_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_attributed_member_id_fkey"
            columns: ["attributed_member_id"]
            isOneToOne: false
            referencedRelation: "partner_member_stats"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "partner_applications_attributed_member_id_fkey"
            columns: ["attributed_member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_attributed_organization_id_fkey"
            columns: ["attributed_organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_linked_deal_id_fkey"
            columns: ["linked_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_referred_by_member_id_fkey"
            columns: ["referred_by_member_id"]
            isOneToOne: false
            referencedRelation: "partner_member_stats"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "partner_applications_referred_by_member_id_fkey"
            columns: ["referred_by_member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "partner_referral_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commission_adjustments: {
        Row: {
          actor_user_id: string | null
          commission_id: string
          created_at: string
          id: string
          new_amount: number | null
          new_rate_percent: number | null
          new_status:
            | Database["public"]["Enums"]["partner_commission_status"]
            | null
          previous_amount: number | null
          previous_rate_percent: number | null
          previous_status:
            | Database["public"]["Enums"]["partner_commission_status"]
            | null
          reason: string
        }
        Insert: {
          actor_user_id?: string | null
          commission_id: string
          created_at?: string
          id?: string
          new_amount?: number | null
          new_rate_percent?: number | null
          new_status?:
            | Database["public"]["Enums"]["partner_commission_status"]
            | null
          previous_amount?: number | null
          previous_rate_percent?: number | null
          previous_status?:
            | Database["public"]["Enums"]["partner_commission_status"]
            | null
          reason: string
        }
        Update: {
          actor_user_id?: string | null
          commission_id?: string
          created_at?: string
          id?: string
          new_amount?: number | null
          new_rate_percent?: number | null
          new_status?:
            | Database["public"]["Enums"]["partner_commission_status"]
            | null
          previous_amount?: number | null
          previous_rate_percent?: number | null
          previous_status?:
            | Database["public"]["Enums"]["partner_commission_status"]
            | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commission_adjustments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "partner_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commissions: {
        Row: {
          amount: number
          application_id: string
          created_at: string
          deal_id: string | null
          funded_amount: number
          funding_event_key: string | null
          id: string
          note: string | null
          organization_id: string
          paid_at: string | null
          payment_reference: string | null
          rate_percent: number
          rate_source: string | null
          scheduled_payment_date: string | null
          status: Database["public"]["Enums"]["partner_commission_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          application_id: string
          created_at?: string
          deal_id?: string | null
          funded_amount?: number
          funding_event_key?: string | null
          id?: string
          note?: string | null
          organization_id: string
          paid_at?: string | null
          payment_reference?: string | null
          rate_percent?: number
          rate_source?: string | null
          scheduled_payment_date?: string | null
          status?: Database["public"]["Enums"]["partner_commission_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          application_id?: string
          created_at?: string
          deal_id?: string | null
          funded_amount?: number
          funding_event_key?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_reference?: string | null
          rate_percent?: number
          rate_source?: string | null
          scheduled_payment_date?: string | null
          status?: Database["public"]["Enums"]["partner_commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_deal_commission_overrides: {
        Row: {
          application_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          id: string
          override_rate_percent: number
          reason: string
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          override_rate_percent: number
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          override_rate_percent?: number
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_deal_commission_overrides_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_deal_commission_overrides_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_deal_commission_overrides_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_documents: {
        Row: {
          application_id: string
          document_type: string
          file_name: string
          file_size: number | null
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["partner_document_status"]
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          application_id: string
          document_type?: string
          file_name: string
          file_size?: number | null
          id?: string
          organization_id: string
          status?: Database["public"]["Enums"]["partner_document_status"]
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          application_id?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["partner_document_status"]
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_inquiries: {
        Row: {
          business_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          partner_type: string | null
          phone: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          business_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          partner_type?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          business_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          partner_type?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      partner_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          full_name: string | null
          id: string
          intended_role: Database["public"]["Enums"]["partner_member_role"]
          invited_by: string | null
          invited_email: string
          organization_id: string
          resend_count: number
          revoked_at: string | null
          status: Database["public"]["Enums"]["partner_invitation_status"]
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at: string
          full_name?: string | null
          id?: string
          intended_role?: Database["public"]["Enums"]["partner_member_role"]
          invited_by?: string | null
          invited_email: string
          organization_id: string
          resend_count?: number
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["partner_invitation_status"]
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          intended_role?: Database["public"]["Enums"]["partner_member_role"]
          invited_by?: string | null
          invited_email?: string
          organization_id?: string
          resend_count?: number
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["partner_invitation_status"]
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_members: {
        Row: {
          can_view_org_referrals: boolean
          code: string | null
          commission_rate_percent: number | null
          created_at: string
          email: string
          full_name: string
          id: string
          organization_id: string
          phone: string | null
          role: Database["public"]["Enums"]["partner_member_role"]
          status: Database["public"]["Enums"]["partner_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          can_view_org_referrals?: boolean
          code?: string | null
          commission_rate_percent?: number | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          organization_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["partner_member_role"]
          status?: Database["public"]["Enums"]["partner_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          can_view_org_referrals?: boolean
          code?: string | null
          commission_rate_percent?: number | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organization_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["partner_member_role"]
          status?: Database["public"]["Enums"]["partner_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_notification_preferences: {
        Row: {
          application_updates: boolean
          commission_updates: boolean
          created_at: string
          id: string
          missing_information: boolean
          organization_id: string | null
          training_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          application_updates?: boolean
          commission_updates?: boolean
          created_at?: string
          id?: string
          missing_information?: boolean
          organization_id?: string | null
          training_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          application_updates?: boolean
          commission_updates?: boolean
          created_at?: string
          id?: string
          missing_information?: boolean
          organization_id?: string | null
          training_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link_path: string | null
          organization_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link_path?: string | null
          organization_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link_path?: string | null
          organization_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_organizations: {
        Row: {
          assigned_rep_id: string | null
          code: string | null
          commission_rate_percent: number
          created_at: string
          id: string
          legal_name: string | null
          name: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          phone: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          referral_link_enabled: boolean
          slug: string
          status: Database["public"]["Enums"]["partner_org_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          assigned_rep_id?: string | null
          code?: string | null
          commission_rate_percent?: number
          created_at?: string
          id?: string
          legal_name?: string | null
          name: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
          phone?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          referral_link_enabled?: boolean
          slug: string
          status?: Database["public"]["Enums"]["partner_org_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          assigned_rep_id?: string | null
          code?: string | null
          commission_rate_percent?: number
          created_at?: string
          id?: string
          legal_name?: string | null
          name?: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
          phone?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          referral_link_enabled?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["partner_org_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_organizations_assigned_rep_id_fkey"
            columns: ["assigned_rep_id"]
            isOneToOne: false
            referencedRelation: "rep_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referral_visits: {
        Row: {
          campaign: string | null
          converted_application_id: string | null
          created_at: string
          id: string
          landed_at: string
          member_code_used: string | null
          member_id: string | null
          organization_id: string
          referral_code_used: string | null
          source: string | null
          visitor_id: string | null
        }
        Insert: {
          campaign?: string | null
          converted_application_id?: string | null
          created_at?: string
          id?: string
          landed_at?: string
          member_code_used?: string | null
          member_id?: string | null
          organization_id: string
          referral_code_used?: string | null
          source?: string | null
          visitor_id?: string | null
        }
        Update: {
          campaign?: string | null
          converted_application_id?: string | null
          created_at?: string
          id?: string
          landed_at?: string
          member_code_used?: string | null
          member_id?: string | null
          organization_id?: string
          referral_code_used?: string | null
          source?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_referral_visits_converted_application_id_fkey"
            columns: ["converted_application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referral_visits_converted_application_id_fkey"
            columns: ["converted_application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referral_visits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "partner_member_stats"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "partner_referral_visits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referral_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referrals: {
        Row: {
          application_id: string | null
          created_at: string
          created_by: string | null
          id: string
          member_code_used: string | null
          member_id: string | null
          merchant_business_name: string
          merchant_contact_name: string | null
          merchant_email: string | null
          merchant_phone: string | null
          note: string | null
          organization_id: string
          origin: string
          referral_code_used: string | null
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          member_code_used?: string | null
          member_id?: string | null
          merchant_business_name: string
          merchant_contact_name?: string | null
          merchant_email?: string | null
          merchant_phone?: string | null
          note?: string | null
          organization_id: string
          origin?: string
          referral_code_used?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          member_code_used?: string | null
          member_id?: string | null
          merchant_business_name?: string
          merchant_contact_name?: string | null
          merchant_email?: string | null
          merchant_phone?: string | null
          note?: string | null
          organization_id?: string
          origin?: string
          referral_code_used?: string | null
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_application_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "partner_member_stats"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "partner_referrals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referrals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "partner_referral_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_resources: {
        Row: {
          audience: Database["public"]["Enums"]["partner_type"] | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          id: string
          kind: Database["public"]["Enums"]["partner_resource_kind"]
          link_url: string | null
          published: boolean
          sort_order: number
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["partner_type"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["partner_resource_kind"]
          link_url?: string | null
          published?: boolean
          sort_order?: number
          storage_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["partner_type"] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["partner_resource_kind"]
          link_url?: string | null
          published?: boolean
          sort_order?: number
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_support_messages: {
        Row: {
          author_kind: string
          author_name: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          organization_id: string
          ticket_id: string
        }
        Insert: {
          author_kind: string
          author_name: string
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          organization_id: string
          ticket_id: string
        }
        Update: {
          author_kind?: string
          author_name?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_support_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "partner_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_support_tickets: {
        Row: {
          assigned_rep_id: string | null
          category: string
          created_at: string
          created_by: string | null
          created_by_member_id: string | null
          id: string
          last_message_at: string
          organization_id: string
          reference: string
          status: Database["public"]["Enums"]["partner_ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_rep_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_member_id?: string | null
          id?: string
          last_message_at?: string
          organization_id: string
          reference?: string
          status?: Database["public"]["Enums"]["partner_ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_rep_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          created_by_member_id?: string | null
          id?: string
          last_message_at?: string
          organization_id?: string
          reference?: string
          status?: Database["public"]["Enums"]["partner_ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_support_tickets_assigned_rep_id_fkey"
            columns: ["assigned_rep_id"]
            isOneToOne: false
            referencedRelation: "rep_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_support_tickets_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "partner_member_stats"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "partner_support_tickets_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_training_modules: {
        Row: {
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          kind: Database["public"]["Enums"]["partner_module_kind"]
          sort_order: number
          title: string
          training_id: string
        }
        Insert: {
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["partner_module_kind"]
          sort_order?: number
          title: string
          training_id: string
        }
        Update: {
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["partner_module_kind"]
          sort_order?: number
          title?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_training_modules_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "partner_trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_training_progress: {
        Row: {
          completed_at: string
          id: string
          member_id: string
          module_id: string
          organization_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          member_id: string
          module_id: string
          organization_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          member_id?: string
          module_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_training_progress_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "partner_member_stats"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "partner_training_progress_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "partner_training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_training_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_trainings: {
        Row: {
          audience: Database["public"]["Enums"]["partner_type"] | null
          category: string
          created_at: string
          description: string | null
          id: string
          published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["partner_type"] | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["partner_type"] | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_view_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          effective_member_id: string
          effective_role: Database["public"]["Enums"]["partner_member_role"]
          ended_at: string | null
          expires_at: string
          id: string
          last_seen_at: string
          mode: string
          organization_id: string
          reason: string | null
          return_path: string
          token_hash: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          effective_member_id: string
          effective_role: Database["public"]["Enums"]["partner_member_role"]
          ended_at?: string | null
          expires_at: string
          id?: string
          last_seen_at?: string
          mode?: string
          organization_id: string
          reason?: string | null
          return_path?: string
          token_hash: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          effective_member_id?: string
          effective_role?: Database["public"]["Enums"]["partner_member_role"]
          ended_at?: string | null
          expires_at?: string
          id?: string
          last_seen_at?: string
          mode?: string
          organization_id?: string
          reason?: string | null
          return_path?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_view_sessions_effective_member_id_fkey"
            columns: ["effective_member_id"]
            isOneToOne: false
            referencedRelation: "partner_member_stats"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "partner_view_sessions_effective_member_id_fkey"
            columns: ["effective_member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_view_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pif_tiers: {
        Row: {
          deal_id: string
          discount_percent: number
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          deal_id: string
          discount_percent: number
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          deal_id?: string
          discount_percent?: number
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pif_tiers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_profiles: {
        Row: {
          created_at: string
          default_bank_verification_url: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          default_bank_verification_url?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          default_bank_verification_url?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      uploaded_documents: {
        Row: {
          deal_id: string
          file_name: string
          file_size: number | null
          id: string
          storage_path: string
          synced_to_hubspot: boolean
          uploaded_at: string
        }
        Insert: {
          deal_id: string
          file_name: string
          file_size?: number | null
          id?: string
          storage_path: string
          synced_to_hubspot?: boolean
          uploaded_at?: string
        }
        Update: {
          deal_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          storage_path?: string
          synced_to_hubspot?: boolean
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      deal_view_stats: {
        Row: {
          deal_id: string | null
          first_viewed_at: string | null
          last_viewed_at: string | null
          unique_visitors: number | null
          view_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_views_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_application_summary: {
        Row: {
          application_state:
            | Database["public"]["Enums"]["merchant_application_state"]
            | null
          attributed_member_id: string | null
          city: string | null
          completion_percent: number | null
          contact_first_name: string | null
          contact_last_name: string | null
          created_at: string | null
          dba: string | null
          funded_amount: number | null
          funded_at: string | null
          funding_state:
            | Database["public"]["Enums"]["partner_funding_state"]
            | null
          id: string | null
          last_activity_at: string | null
          legal_business_name: string | null
          organization_id: string | null
          partner_status:
            | Database["public"]["Enums"]["partner_facing_status"]
            | null
          reference: string | null
          referral_id: string | null
          started_at: string | null
          state: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          application_state?:
            | Database["public"]["Enums"]["merchant_application_state"]
            | null
          attributed_member_id?: string | null
          city?: string | null
          completion_percent?: number | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          created_at?: string | null
          dba?: string | null
          funded_amount?: number | null
          funded_at?: string | null
          funding_state?:
            | Database["public"]["Enums"]["partner_funding_state"]
            | null
          id?: string | null
          last_activity_at?: string | null
          legal_business_name?: string | null
          organization_id?: string | null
          partner_status?:
            | Database["public"]["Enums"]["partner_facing_status"]
            | null
          reference?: string | null
          referral_id?: string | null
          started_at?: string | null
          state?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          application_state?:
            | Database["public"]["Enums"]["merchant_application_state"]
            | null
          attributed_member_id?: string | null
          city?: string | null
          completion_percent?: number | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          created_at?: string | null
          dba?: string | null
          funded_amount?: number | null
          funded_at?: string | null
          funding_state?:
            | Database["public"]["Enums"]["partner_funding_state"]
            | null
          id?: string | null
          last_activity_at?: string | null
          legal_business_name?: string | null
          organization_id?: string | null
          partner_status?:
            | Database["public"]["Enums"]["partner_facing_status"]
            | null
          reference?: string | null
          referral_id?: string | null
          started_at?: string | null
          state?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_applications_attributed_member_id_fkey"
            columns: ["attributed_member_id"]
            isOneToOne: false
            referencedRelation: "partner_member_stats"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "partner_applications_attributed_member_id_fkey"
            columns: ["attributed_member_id"]
            isOneToOne: false
            referencedRelation: "partner_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "partner_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_member_stats: {
        Row: {
          can_view_org_referrals: boolean | null
          code: string | null
          commission_earned: number | null
          email: string | null
          full_name: string | null
          funded_count: number | null
          funded_volume: number | null
          member_id: string | null
          organization_id: string | null
          referral_count: number | null
          role: Database["public"]["Enums"]["partner_member_role"] | null
          status: Database["public"]["Enums"]["partner_member_status"] | null
          submitted_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "partner_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_offer: {
        Args: {
          _amount: number
          _deal_id: string
          _frequency: string
          _funding_date?: string
          _payback: number
          _payment: number
        }
        Returns: string
      }
      code_initials: { Args: { _len: number; _name: string }; Returns: string }
      current_partner_can_view_org_links: { Args: never; Returns: boolean }
      current_partner_member_id: { Args: never; Returns: string }
      current_partner_org: { Args: never; Returns: string }
      deal_is_open: { Args: { _deal_id: string }; Returns: boolean }
      ensure_master_admins: { Args: never; Returns: number }
      get_public_deal: {
        Args: { _deal_id: string }
        Returns: {
          allow_weekly: boolean
          bank_verification_url: string
          expiration_date: string
          funding_window_end: string
          funding_window_start: string
          id: string
          max_funded: number
          merchant_name: string
          min_funded: number
          origination_fee_percent: number
          other_fees: number
          pif_enabled: boolean
          rep_email: string
          rep_name: string
          rep_phone: string
          sell_rate: number
          status: string
          term_days: number
          weekly_rate_increase_points: number
        }[]
      }
      get_public_deal_checklist: {
        Args: { _deal_id: string }
        Returns: {
          label: string
          sort_order: number
        }[]
      }
      get_public_deal_presets: {
        Args: { _deal_id: string }
        Returns: {
          amount: number
          label: string
          sort_order: number
        }[]
      }
      get_public_deal_tiers: {
        Args: { _deal_id: string }
        Returns: {
          discount_percent: number
          label: string
          sort_order: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_merchant_token: { Args: { _token: string }; Returns: string }
      is_internal_user: { Args: never; Returns: boolean }
      is_partner_member: { Args: never; Returns: boolean }
      is_partner_org_admin: { Args: never; Returns: boolean }
      is_trusted_partner_op: { Args: never; Returns: boolean }
      issue_merchant_token: {
        Args: {
          _application_id: string
          _kind: Database["public"]["Enums"]["merchant_token_kind"]
          _rotated_from?: string
          _ttl: string
        }
        Returns: string
      }
      merchant_get_application: {
        Args: { _token: string }
        Returns: {
          application_state: string
          completion_percent: number
          current_step: number
          payload: Json
          reference: string
          submitted: boolean
        }[]
      }
      merchant_redeem_resume_token: {
        Args: { _token: string }
        Returns: string
      }
      merchant_request_resume_token: {
        Args: { _token: string }
        Returns: string
      }
      merchant_save_step: {
        Args: {
          _completion_percent: number
          _payload: Json
          _step: number
          _token: string
        }
        Returns: boolean
      }
      merchant_submit_application: { Args: { _token: string }; Returns: string }
      merchant_token_application: {
        Args: {
          _kind?: Database["public"]["Enums"]["merchant_token_kind"]
          _token: string
        }
        Returns: string
      }
      next_member_code: {
        Args: { _full_name: string; _organization_id: string }
        Returns: string
      }
      next_org_code: { Args: { _name: string }; Returns: string }
      owns_deal: { Args: { _deal_id: string }; Returns: boolean }
      partner_accept_invitation: {
        Args: { _full_name: string; _token_hash: string; _user_id: string }
        Returns: string
      }
      partner_app_editable: {
        Args: { _application_id: string }
        Returns: boolean
      }
      partner_app_org: { Args: { _application_id: string }; Returns: string }
      partner_app_visible: {
        Args: { _application_id: string }
        Returns: boolean
      }
      partner_bulk_commission_status: {
        Args: {
          _ids: string[]
          _payment_reference?: string
          _status: Database["public"]["Enums"]["partner_commission_status"]
        }
        Returns: number
      }
      partner_create_deal_from_application: {
        Args: { _application_id: string }
        Returns: string
      }
      partner_entitled: {
        Args: { _member_id: string; _organization_id: string }
        Returns: boolean
      }
      partner_facing_status_for: {
        Args: {
          _status: Database["public"]["Enums"]["partner_application_status"]
        }
        Returns: Database["public"]["Enums"]["partner_facing_status"]
      }
      partner_information_provided: {
        Args: { _application_id: string; _note?: string }
        Returns: {
          abandoned_at: string | null
          address_2: string | null
          application_state: Database["public"]["Enums"]["merchant_application_state"]
          approved_amount: number | null
          assigned_rep_id: string | null
          attributed_member_id: string | null
          attributed_organization_id: string | null
          average_monthly_revenue: number | null
          banking_connected: boolean
          banking_provider: string | null
          banking_reference: string | null
          business_address: string | null
          business_description: string | null
          city: string | null
          commission_amount: number | null
          completion_percent: number
          contact_email: string | null
          contact_first_name: string | null
          contact_last_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          date_business_started: string | null
          dba: string | null
          ein: string | null
          existing_balances: number | null
          existing_positions: string | null
          funded_amount: number | null
          funded_at: string | null
          funding_history: string | null
          funding_state: Database["public"]["Enums"]["partner_funding_state"]
          home_based_business: boolean
          id: string
          industry: string | null
          last_activity_at: string
          last_completed_step: number
          legal_business_name: string
          legal_entity: string | null
          linked_deal_id: string | null
          missing_items: string[] | null
          naics_code: string | null
          organization_id: string
          partner_status: Database["public"]["Enums"]["partner_facing_status"]
          reference: string
          referral_id: string | null
          referred_by_member_id: string | null
          requested_amount: number | null
          source: string
          started_at: string | null
          state: string | null
          state_incorporated: string | null
          status: Database["public"]["Enums"]["partner_application_status"]
          submitted_at: string | null
          updated_at: string
          use_of_funds: string | null
          visit_id: string | null
          website: string | null
          wizard_step: number
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      partner_notify: {
        Args: {
          _body: string
          _kind: string
          _link_path: string
          _organization_id?: string
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      partner_override_commission: {
        Args: {
          _amount?: number
          _commission_id: string
          _note: string
          _paid_at?: string
          _payment_reference?: string
          _rate_percent?: number
          _status?: Database["public"]["Enums"]["partner_commission_status"]
        }
        Returns: undefined
      }
      partner_set_application_status: {
        Args: {
          _application_id: string
          _approved_amount?: number
          _funded_amount?: number
          _funded_at?: string
          _missing_items?: string[]
          _note?: string
          _status: Database["public"]["Enums"]["partner_application_status"]
        }
        Returns: {
          abandoned_at: string | null
          address_2: string | null
          application_state: Database["public"]["Enums"]["merchant_application_state"]
          approved_amount: number | null
          assigned_rep_id: string | null
          attributed_member_id: string | null
          attributed_organization_id: string | null
          average_monthly_revenue: number | null
          banking_connected: boolean
          banking_provider: string | null
          banking_reference: string | null
          business_address: string | null
          business_description: string | null
          city: string | null
          commission_amount: number | null
          completion_percent: number
          contact_email: string | null
          contact_first_name: string | null
          contact_last_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          date_business_started: string | null
          dba: string | null
          ein: string | null
          existing_balances: number | null
          existing_positions: string | null
          funded_amount: number | null
          funded_at: string | null
          funding_history: string | null
          funding_state: Database["public"]["Enums"]["partner_funding_state"]
          home_based_business: boolean
          id: string
          industry: string | null
          last_activity_at: string
          last_completed_step: number
          legal_business_name: string
          legal_entity: string | null
          linked_deal_id: string | null
          missing_items: string[] | null
          naics_code: string | null
          organization_id: string
          partner_status: Database["public"]["Enums"]["partner_facing_status"]
          reference: string
          referral_id: string | null
          referred_by_member_id: string | null
          requested_amount: number | null
          source: string
          started_at: string | null
          state: string | null
          state_incorporated: string | null
          status: Database["public"]["Enums"]["partner_application_status"]
          submitted_at: string | null
          updated_at: string
          use_of_funds: string | null
          visit_id: string | null
          website: string | null
          wizard_step: number
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      partner_set_commission_rate: {
        Args: { _organization_id: string; _rate: number }
        Returns: undefined
      }
      record_bank_verification_click: {
        Args: { _deal_id: string; _user_agent?: string; _visitor_id: string }
        Returns: boolean
      }
      record_deal_view: {
        Args: { _deal_id: string; _user_agent?: string; _visitor_id: string }
        Returns: boolean
      }
      record_referral_landing: {
        Args: {
          _campaign?: string
          _org_code: string
          _source?: string
          _user_code?: string
          _visitor_id?: string
        }
        Returns: {
          member_name: string
          organization_name: string
          visit_id: string
        }[]
      }
      record_referral_visit: {
        Args: { _member_ref?: string; _slug: string; _visitor_id?: string }
        Returns: boolean
      }
      request_revision: {
        Args: {
          _amount: number
          _deal_id: string
          _frequency: string
          _funding_date?: string
          _note?: string
          _payback: number
          _payment: number
        }
        Returns: string
      }
      resolve_commission_rate: {
        Args: {
          _application_id?: string
          _deal_id?: string
          _member_id?: string
          _organization_id: string
        }
        Returns: {
          rate_percent: number
          rate_source: string
        }[]
      }
      resolve_referral_codes: {
        Args: { _org_code: string; _user_code?: string }
        Returns: {
          member_code: string
          member_id: string
          member_name: string
          organization_code: string
          organization_id: string
          organization_name: string
        }[]
      }
      start_merchant_application: {
        Args: {
          _contact_email: string
          _contact_first_name: string
          _contact_last_name: string
          _contact_phone: string
          _legal_business_name: string
          _org_code: string
          _user_code?: string
          _visit_id?: string
        }
        Returns: string
      }
      submit_partner_application: {
        Args: { _application_id: string }
        Returns: {
          abandoned_at: string | null
          address_2: string | null
          application_state: Database["public"]["Enums"]["merchant_application_state"]
          approved_amount: number | null
          assigned_rep_id: string | null
          attributed_member_id: string | null
          attributed_organization_id: string | null
          average_monthly_revenue: number | null
          banking_connected: boolean
          banking_provider: string | null
          banking_reference: string | null
          business_address: string | null
          business_description: string | null
          city: string | null
          commission_amount: number | null
          completion_percent: number
          contact_email: string | null
          contact_first_name: string | null
          contact_last_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          date_business_started: string | null
          dba: string | null
          ein: string | null
          existing_balances: number | null
          existing_positions: string | null
          funded_amount: number | null
          funded_at: string | null
          funding_history: string | null
          funding_state: Database["public"]["Enums"]["partner_funding_state"]
          home_based_business: boolean
          id: string
          industry: string | null
          last_activity_at: string
          last_completed_step: number
          legal_business_name: string
          legal_entity: string | null
          linked_deal_id: string | null
          missing_items: string[] | null
          naics_code: string | null
          organization_id: string
          partner_status: Database["public"]["Enums"]["partner_facing_status"]
          reference: string
          referral_id: string | null
          referred_by_member_id: string | null
          requested_amount: number | null
          source: string
          started_at: string | null
          state: string | null
          state_incorporated: string | null
          status: Database["public"]["Enums"]["partner_application_status"]
          submitted_at: string | null
          updated_at: string
          use_of_funds: string | null
          visit_id: string | null
          website: string | null
          wizard_step: number
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_referral_application: {
        Args: {
          _average_monthly_revenue?: number
          _contact_email: string
          _contact_first_name: string
          _contact_last_name: string
          _contact_phone: string
          _legal_business_name: string
          _member_ref: string
          _requested_amount: number
          _slug: string
          _use_of_funds: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "rep"
      integration_event_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "dead_letter"
      merchant_application_state:
        | "draft"
        | "in_progress"
        | "incomplete"
        | "submitted"
        | "withdrawn"
      merchant_token_kind: "start" | "resume"
      partner_application_status:
        | "started"
        | "submitted"
        | "missing_information"
        | "under_review"
        | "offer_available"
        | "approved"
        | "contract_requested"
        | "contract_sent"
        | "contract_signed"
        | "funded"
        | "declined"
        | "duplicate"
        | "offer_expired"
      partner_commission_status:
        | "pending"
        | "approved"
        | "paid"
        | "void"
        | "scheduled"
        | "held"
        | "adjusted"
      partner_document_status:
        | "received"
        | "processing"
        | "approved"
        | "needs_attention"
      partner_event_visibility: "partner" | "internal"
      partner_facing_status:
        | "referred"
        | "application_started"
        | "application_incomplete"
        | "application_submitted"
        | "under_review"
        | "additional_information_needed"
        | "approved"
        | "declined"
        | "funded"
        | "closed_withdrawn"
      partner_funding_state: "not_funded" | "scheduled" | "funded" | "cancelled"
      partner_invitation_status: "pending" | "accepted" | "expired" | "revoked"
      partner_member_role:
        | "organization_admin"
        | "manager"
        | "broker"
        | "referral_rep"
        | "viewer"
      partner_member_status: "pending" | "active" | "inactive"
      partner_module_kind: "video" | "document" | "link"
      partner_org_status:
        | "pending"
        | "active"
        | "restricted"
        | "suspended"
        | "inactive"
      partner_resource_kind: "file" | "link"
      partner_ticket_status:
        | "open"
        | "awaiting_partner"
        | "awaiting_magenta"
        | "resolved"
        | "closed"
      partner_type: "iso" | "referral_partner" | "strategic_partner"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "rep"],
      integration_event_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "dead_letter",
      ],
      merchant_application_state: [
        "draft",
        "in_progress",
        "incomplete",
        "submitted",
        "withdrawn",
      ],
      merchant_token_kind: ["start", "resume"],
      partner_application_status: [
        "started",
        "submitted",
        "missing_information",
        "under_review",
        "offer_available",
        "approved",
        "contract_requested",
        "contract_sent",
        "contract_signed",
        "funded",
        "declined",
        "duplicate",
        "offer_expired",
      ],
      partner_commission_status: [
        "pending",
        "approved",
        "paid",
        "void",
        "scheduled",
        "held",
        "adjusted",
      ],
      partner_document_status: [
        "received",
        "processing",
        "approved",
        "needs_attention",
      ],
      partner_event_visibility: ["partner", "internal"],
      partner_facing_status: [
        "referred",
        "application_started",
        "application_incomplete",
        "application_submitted",
        "under_review",
        "additional_information_needed",
        "approved",
        "declined",
        "funded",
        "closed_withdrawn",
      ],
      partner_funding_state: ["not_funded", "scheduled", "funded", "cancelled"],
      partner_invitation_status: ["pending", "accepted", "expired", "revoked"],
      partner_member_role: [
        "organization_admin",
        "manager",
        "broker",
        "referral_rep",
        "viewer",
      ],
      partner_member_status: ["pending", "active", "inactive"],
      partner_module_kind: ["video", "document", "link"],
      partner_org_status: [
        "pending",
        "active",
        "restricted",
        "suspended",
        "inactive",
      ],
      partner_resource_kind: ["file", "link"],
      partner_ticket_status: [
        "open",
        "awaiting_partner",
        "awaiting_magenta",
        "resolved",
        "closed",
      ],
      partner_type: ["iso", "referral_partner", "strategic_partner"],
    },
  },
} as const
