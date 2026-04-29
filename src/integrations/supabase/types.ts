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
      accounting_entries: {
        Row: {
          account_code: string
          account_name: string
          amount: number
          created_at: string
          date: string
          entry_type: string
          id: string
          label: string
          notes: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          amount?: number
          created_at?: string
          date?: string
          entry_type: string
          id?: string
          label: string
          notes?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          amount?: number
          created_at?: string
          date?: string
          entry_type?: string
          id?: string
          label?: string
          notes?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          currency: string
          current_fiscal_year: number
          default_tva: number
          email: string | null
          fiscal_year_start_day: number
          fiscal_year_start_month: number
          id: string
          invoice_footer: string | null
          legal_form: string | null
          logo_url: string | null
          name: string
          ninea: string | null
          phone: string | null
          rccm: string | null
          tax_regime: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          current_fiscal_year?: number
          default_tva?: number
          email?: string | null
          fiscal_year_start_day?: number
          fiscal_year_start_month?: number
          id?: string
          invoice_footer?: string | null
          legal_form?: string | null
          logo_url?: string | null
          name?: string
          ninea?: string | null
          phone?: string | null
          rccm?: string | null
          tax_regime?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          current_fiscal_year?: number
          default_tva?: number
          email?: string | null
          fiscal_year_start_day?: number
          fiscal_year_start_month?: number
          id?: string
          invoice_footer?: string | null
          legal_form?: string | null
          logo_url?: string | null
          name?: string
          ninea?: string | null
          phone?: string | null
          rccm?: string | null
          tax_regime?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          date: string
          due_date: string | null
          id: string
          kind: string
          lines: Json
          notes: string | null
          number: string
          party_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          kind: string
          lines?: Json
          notes?: string | null
          number: string
          party_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          kind?: string
          lines?: Json
          notes?: string | null
          number?: string
          party_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          ninea: string | null
          notes: string | null
          phone: string | null
          type: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          ninea?: string | null
          notes?: string | null
          phone?: string | null
          type: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          ninea?: string | null
          notes?: string | null
          phone?: string | null
          type?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          cost_ht: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price_ht: number
          sku: string
          stock: number
          stock_alert: number
          tva_rate: number
          unit: string
        }
        Insert: {
          category?: string | null
          cost_ht?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price_ht?: number
          sku: string
          stock?: number
          stock_alert?: number
          tva_rate?: number
          unit?: string
        }
        Update: {
          category?: string | null
          cost_ht?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price_ht?: number
          sku?: string
          stock?: number
          stock_alert?: number
          tva_rate?: number
          unit?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
