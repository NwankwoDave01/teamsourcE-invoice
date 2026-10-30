import type { Database, Json } from "./types";

// Frontend-only additions evidenced by checked-in migrations; generated types
// remain untouched and the existing authenticated client is reused unchanged.
export type AppDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions" | "Tables" | "Enums"> & {
    Tables: Omit<Database["public"]["Tables"], "customers" | "products"> & {
      customers: Database["public"]["Tables"]["customers"] & {
        Row: Database["public"]["Tables"]["customers"]["Row"] & {
          notes: string | null;
        };
        Insert: Database["public"]["Tables"]["customers"]["Insert"] & {
          notes?: string | null;
        };
        Update: Database["public"]["Tables"]["customers"]["Update"] & {
          notes?: string | null;
        };
      };
      products: Database["public"]["Tables"]["products"] & {
        Row: Database["public"]["Tables"]["products"]["Row"] & {
          description: string | null;
        };
        Insert: Database["public"]["Tables"]["products"]["Insert"] & {
          description?: string | null;
        };
        Update: Database["public"]["Tables"]["products"]["Update"] & {
          description?: string | null;
        };
      };
    };
    Functions: Database["public"]["Functions"] & {
      create_company_with_owner: {
        Args: { p_name: string; p_tin?: string; p_city?: string | null; p_state?: string | null };
        Returns: string;
      };
      update_invoice_atomic: {
        Args: { p_invoice_id: string; p_company_id: string; p_header: Json; p_lines: Json };
        Returns: Json;
      };
    };
    Enums: Omit<Database["public"]["Enums"], "app_role"> & {
      app_role: Database["public"]["Enums"]["app_role"] | "company_owner";
    };
  };
};