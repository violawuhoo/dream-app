import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export type Database = {
  public: {
    Tables: {
      dream_records: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          created_at: string;
          raw_input: string | null;
          narrative: string | null;
          title: string | null;
          keywords: string[] | null;
          emotions: string[] | null;
          interpretation: string | null;
          life_connection_interpretation: string | null;
          tarot_card: Record<string, unknown> | null;
          tarot_interpretation: string | null;
          status: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["dream_records"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["dream_records"]["Insert"]>;
      };
    };
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
