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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      case_messages: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          case_id: string
          created_at: string
          id: string
          is_staff: boolean
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          case_id: string
          created_at?: string
          id?: string
          is_staff?: boolean
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          is_staff?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          category: Database["public"]["Enums"]["case_category"]
          created_at: string
          id: string
          last_activity_at: string
          order_id: string | null
          priority: Database["public"]["Enums"]["case_priority"]
          status: Database["public"]["Enums"]["case_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["case_category"]
          created_at?: string
          id?: string
          last_activity_at?: string
          order_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          status?: Database["public"]["Enums"]["case_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["case_category"]
          created_at?: string
          id?: string
          last_activity_at?: string
          order_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          status?: Database["public"]["Enums"]["case_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          charge: number
          created_at: string
          id: string
          link: string
          provider_order_id: string | null
          quantity: number
          remains: number | null
          service_id: string
          start_count: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          charge: number
          created_at?: string
          id?: string
          link: string
          provider_order_id?: string | null
          quantity: number
          remains?: number | null
          service_id: string
          start_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          charge?: number
          created_at?: string
          id?: string
          link?: string
          provider_order_id?: string | null
          quantity?: number
          remains?: number | null
          service_id?: string
          start_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          created_at: string
          full_name: string | null
          id: string
          language: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_quantity: number
          min_quantity: number
          name: string
          platform: string | null
          provider_rate: number
          provider_service_id: string
          rate: number
          type: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_quantity?: number
          min_quantity?: number
          name: string
          platform?: string | null
          provider_rate: number
          provider_service_id: string
          rate: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_quantity?: number
          min_quantity?: number
          name?: string
          platform?: string | null
          provider_rate?: number
          provider_service_id?: string
          rate?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tool_orders: {
        Row: {
          codes: Json
          created_at: string
          id: string
          product_id: string
          product_name: string
          qty: number
          status: string
          total_price: number
          unit_price: number
          user_id: string
        }
        Insert: {
          codes?: Json
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          qty?: number
          status?: string
          total_price: number
          unit_price: number
          user_id: string
        }
        Update: {
          codes?: Json
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          qty?: number
          status?: string
          total_price?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          stripe_session_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          stripe_session_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          stripe_session_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      case_category:
        | "order_issue"
        | "refund"
        | "payment"
        | "account"
        | "technical"
        | "other"
      case_priority: "low" | "normal" | "high" | "urgent"
      case_status: "open" | "pending" | "resolved" | "closed"
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
      app_role: ["admin", "user"],
      case_category: [
        "order_issue",
        "refund",
        "payment",
        "account",
        "technical",
        "other",
      ],
      case_priority: ["low", "normal", "high", "urgent"],
      case_status: ["open", "pending", "resolved", "closed"],
    },
  },
} as const
