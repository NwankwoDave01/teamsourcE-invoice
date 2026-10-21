import type { Database, Json } from "./types";

// Frontend-only additions evidenced by checked-in migrations; generated types
// remain untouched and the existing authenticated client is reused unchanged.
export type AppDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      update_invoice_atomic: {
        Args: { p_invoice_id: string; p_company_id: string; p_header: Json; p_lines: Json };
        Returns: Json;
      };
    };
  };
};