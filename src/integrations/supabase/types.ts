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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          category: Database["public"]["Enums"]["audit_category"]
          company_id: string
          created_at: string
          id: string
          ip: string | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          category: Database["public"]["Enums"]["audit_category"]
          company_id: string
          created_at?: string
          id?: string
          ip?: string | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          category?: Database["public"]["Enums"]["audit_category"]
          company_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          name: string
          plan: Database["public"]["Enums"]["company_plan"]
          status: Database["public"]["Enums"]["company_status"]
          tin: string
          updated_at: string
          legal_name: string | null
          email: string | null
          phone: string | null
          rc_number: string | null
          vat_number: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          lga: string | null
          postcode: string | null
          country_code: string
          industry_code: string | null
          nrs_business_id: string | null
          nrs_service_id: string | null
          nrs_environment: string | null
          nrs_sandbox_base_url: string | null
          nrs_production_base_url: string | null
          nrs_certificate_id: string | null
          nrs_api_key: string | null
          nrs_api_secret: string | null
          nrs_portal_email: string | null
          nrs_portal_password: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          name: string
          plan?: Database["public"]["Enums"]["company_plan"]
          status?: Database["public"]["Enums"]["company_status"]
          tin: string
          updated_at?: string
          legal_name?: string | null
          email?: string | null
          phone?: string | null
          rc_number?: string | null
          vat_number?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          lga?: string | null
          postcode?: string | null
          country_code?: string
          industry_code?: string | null
          nrs_business_id?: string | null
          nrs_service_id?: string | null
          nrs_environment?: string | null
          nrs_sandbox_base_url?: string | null
          nrs_production_base_url?: string | null
          nrs_certificate_id?: string | null
          nrs_api_key?: string | null
          nrs_api_secret?: string | null
          nrs_portal_email?: string | null
          nrs_portal_password?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["company_plan"]
          status?: Database["public"]["Enums"]["company_status"]
          tin?: string
          updated_at?: string
          legal_name?: string | null
          email?: string | null
          phone?: string | null
          rc_number?: string | null
          vat_number?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          lga?: string | null
          postcode?: string | null
          country_code?: string
          industry_code?: string | null
          nrs_business_id?: string | null
          nrs_service_id?: string | null
          nrs_environment?: string | null
          nrs_sandbox_base_url?: string | null
          nrs_production_base_url?: string | null
          nrs_certificate_id?: string | null
          nrs_api_key?: string | null
          nrs_api_secret?: string | null
          nrs_portal_email?: string | null
          nrs_portal_password?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_active_at: string | null
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_active_at?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_active_at?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["member_status"]
          tin: string | null
          updated_at: string
          buyer_type: Database["public"]["Enums"]["nrs_buyer_type"] | null
          rc_number: string | null
          address_line1: string | null
          address_line2: string | null
          state: string | null
          lga: string | null
          postcode: string | null
          country_code: string | null
        }
        Insert: {
          city?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          tin?: string | null
          updated_at?: string
          buyer_type?: Database["public"]["Enums"]["nrs_buyer_type"] | null
          rc_number?: string | null
          address_line1?: string | null
          address_line2?: string | null
          state?: string | null
          lga?: string | null
          postcode?: string | null
          country_code?: string | null
        }
        Update: {
          city?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          tin?: string | null
          updated_at?: string
          buyer_type?: Database["public"]["Enums"]["nrs_buyer_type"] | null
          rc_number?: string | null
          address_line1?: string | null
          address_line2?: string | null
          state?: string | null
          lga?: string | null
          postcode?: string | null
          country_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_health: {
        Row: {
          id: string
          last_incident: string | null
          latency: string | null
          name: string
          status: string
          updated_at: string
          uptime: string | null
        }
        Insert: {
          id?: string
          last_incident?: string | null
          latency?: string | null
          name: string
          status?: string
          updated_at?: string
          uptime?: string | null
        }
        Update: {
          id?: string
          last_incident?: string | null
          latency?: string | null
          name?: string
          status?: string
          updated_at?: string
          uptime?: string | null
        }
        Relationships: []
      }
      nrs_master_data: {
        Row: {
          resource_type: string
          code: string
          label: string
          metadata: Json | null
        }
        Insert: {
          resource_type: string
          code: string
          label: string
          metadata?: Json | null
        }
        Update: {
          resource_type?: string
          code?: string
          label?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number
          position: number
          product_id: string | null
          qty: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          position?: number
          product_id?: string | null
          qty?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          position?: number
          product_id?: string | null
          qty?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          customer_name: string
          due_date: string
          id: string
          irn: string | null
          issue_date: string
          notes: string | null
          number: string
          po_reference: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_name: string
          due_date: string
          id?: string
          irn?: string | null
          issue_date?: string
          notes?: string | null
          number: string
          po_reference?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          customer_name?: string
          due_date?: string
          id?: string
          irn?: string | null
          issue_date?: string
          notes?: string | null
          number?: string
          po_reference?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          price: number
          sku: string
          tax_rate: number
          unit: string | null
          updated_at: string
          item_classification_code: string | null
          unit_code: string | null
          tax_category: Database["public"]["Enums"]["nrs_tax_category"] | null
          tax_scheme: string | null
          item_type: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          price?: number
          sku: string
          tax_rate?: number
          unit?: string | null
          updated_at?: string
          item_classification_code?: string | null
          unit_code?: string | null
          tax_category?: Database["public"]["Enums"]["nrs_tax_category"] | null
          tax_scheme?: string | null
          item_type?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          sku?: string
          tax_rate?: number
          unit?: string | null
          updated_at?: string
          item_classification_code?: string | null
          unit_code?: string | null
          tax_category?: Database["public"]["Enums"]["nrs_tax_category"] | null
          tax_scheme?: string | null
          item_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          service: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          service: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          service?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_invoices: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _company_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "company_admin"
        | "finance_officer"
        | "staff_user"
      audit_category:
        | "Invoice"
        | "Customer"
        | "Product"
        | "User"
        | "Settings"
        | "Auth"
      company_plan: "Starter" | "Growth" | "Enterprise"
      company_status: "Active" | "Trial" | "Suspended"
      invoice_status:
        | "Draft"
        | "In Review"
        | "Approved"
        | "Ready"
        | "Submitted"
        | "Validated"
        | "Signed"
        | "Confirmed"
        | "Rejected"
      member_status: "Active" | "Invited" | "Disabled"
      nrs_buyer_type: "business" | "individual" | "government" | "foreign"
      nrs_tax_category: "S" | "Z" | "E" | "O"
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
      app_role: [
        "super_admin",
        "company_admin",
        "finance_officer",
        "staff_user",
      ],
      audit_category: [
        "Invoice",
        "Customer",
        "Product",
        "User",
        "Settings",
        "Auth",
      ],
      company_plan: ["Starter", "Growth", "Enterprise"],
      company_status: ["Active", "Trial", "Suspended"],
      invoice_status: [
        "Draft",
        "In Review",
        "Approved",
        "Ready",
        "Submitted",
        "Validated",
        "Signed",
        "Confirmed",
        "Rejected",
      ],
      member_status: ["Active", "Invited", "Disabled"],
      nrs_buyer_type: ["business", "individual", "government", "foreign"],
      nrs_tax_category: ["S", "Z", "E", "O"],
    },
  },
} as const
