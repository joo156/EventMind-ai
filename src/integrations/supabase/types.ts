export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      event_chats: {
        Row: {
          content: string;
          created_at: string;
          event_id: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          event_id: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_chats_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          all_day: boolean | null;
          category: string | null;
          confidence: number | null;
          created_at: string;
          description: string | null;
          end_date: string | null;
          end_time: string | null;
          extraction_id: string | null;
          guests: string[] | null;
          id: string;
          is_exported: boolean;
          is_favorite: boolean;
          location: string | null;
          meeting_link: string | null;
          meeting_platform: string | null;
          organizer: string | null;
          priority: string | null;
          reminder_minutes: number | null;
          repeat_rule: string | null;
          start_date: string | null;
          start_time: string | null;
          subtitle: string | null;
          tags: string[] | null;
          timezone: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          all_day?: boolean | null;
          category?: string | null;
          confidence?: number | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          extraction_id?: string | null;
          guests?: string[] | null;
          id?: string;
          is_exported?: boolean;
          is_favorite?: boolean;
          location?: string | null;
          meeting_link?: string | null;
          meeting_platform?: string | null;
          organizer?: string | null;
          priority?: string | null;
          reminder_minutes?: number | null;
          repeat_rule?: string | null;
          start_date?: string | null;
          start_time?: string | null;
          subtitle?: string | null;
          tags?: string[] | null;
          timezone?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          all_day?: boolean | null;
          category?: string | null;
          confidence?: number | null;
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          extraction_id?: string | null;
          guests?: string[] | null;
          id?: string;
          is_exported?: boolean;
          is_favorite?: boolean;
          location?: string | null;
          meeting_link?: string | null;
          meeting_platform?: string | null;
          organizer?: string | null;
          priority?: string | null;
          reminder_minutes?: number | null;
          repeat_rule?: string | null;
          start_date?: string | null;
          start_time?: string | null;
          subtitle?: string | null;
          tags?: string[] | null;
          timezone?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_extraction_id_fkey";
            columns: ["extraction_id"];
            isOneToOne: false;
            referencedRelation: "extractions";
            referencedColumns: ["id"];
          },
        ];
      };
      extractions: {
        Row: {
          created_at: string;
          event_count: number;
          id: string;
          source_files: Json;
          source_text: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_count?: number;
          id?: string;
          source_files?: Json;
          source_text?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_count?: number;
          id?: string;
          source_files?: Json;
          source_text?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      pro_requests: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string;
          emailed: boolean;
          id: string;
          message: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email: string;
          emailed?: boolean;
          id?: string;
          message?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string;
          emailed?: boolean;
          id?: string;
          message?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          monthly_imports_used: number;
          monthly_period: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          monthly_imports_used?: number;
          monthly_period?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          monthly_imports_used?: number;
          monthly_period?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      increment_monthly_import: { Args: { _user_id: string }; Returns: number };
    };
    Enums: {
      app_role: "admin" | "user" | "pro";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "pro"],
    },
  },
} as const;
