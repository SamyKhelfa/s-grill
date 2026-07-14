// Hand-written to match supabase/schema.sql.
// Regenerate with `supabase gen types typescript` once the project is linked, if you want it exact.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; created_at: string };
        Insert: { id: string; display_name: string; created_at?: string };
        Update: { id?: string; display_name?: string; created_at?: string };
        Relationships: [];
      };
      categories: {
        Row: { id: string; name: string; sort_order: number };
        Insert: { id?: string; name: string; sort_order?: number };
        Update: { id?: string; name?: string; sort_order?: number };
        Relationships: [];
      };
      dishes: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          evening_and_holidays_only: boolean;
          is_custom: boolean;
          calories_estimate: number;
          added_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          evening_and_holidays_only?: boolean;
          is_custom?: boolean;
          calories_estimate?: number;
          added_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["dishes"]["Insert"]>;
        Relationships: [];
      };
      outings: {
        Row: {
          id: string;
          label: string;
          created_by: string | null;
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          label?: string;
          created_by?: string | null;
          created_at?: string;
          closed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["outings"]["Insert"]>;
        Relationships: [];
      };
      rounds: {
        Row: {
          id: string;
          outing_id: string;
          round_number: number;
          status: "open" | "closed";
          created_at: string;
        };
        Insert: {
          id?: string;
          outing_id: string;
          round_number: number;
          status?: "open" | "closed";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rounds"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          round_id: string;
          user_id: string;
          dish_id: string;
          quantity: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          user_id: string;
          dish_id: string;
          quantity: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      halouf_awards: {
        Row: {
          user_id: string;
          display_name: string;
          total_calories: number;
          total_quantity: number;
          outings_count: number;
          avg_calories_per_outing: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
};
