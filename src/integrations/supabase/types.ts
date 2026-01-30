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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      community_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          product_id: string
          store_id: string
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          product_id: string
          store_id: string
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          product_id?: string
          store_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "community_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_request_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_admin: boolean
          request_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_admin?: boolean
          request_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "customer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_requests: {
        Row: {
          content: string
          created_at: string
          id: string
          password_hash: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          password_hash: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          password_hash?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discussion_comments: {
        Row: {
          content: string
          created_at: string
          discussion_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          discussion_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          discussion_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_likes: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_likes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_reports: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_reports_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_blinded: boolean | null
          linked_product_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_blinded?: boolean | null
          linked_product_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_blinded?: boolean | null
          linked_product_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          reference_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          reference_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "price_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          current_price: number
          discount_period: string | null
          discount_price: number | null
          id: string
          image_url: string | null
          product_id: string
          recorded_at: string | null
          selling_price: number
          store_id: string
          user_id: string
        }
        Insert: {
          current_price: number
          discount_period?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          product_id: string
          recorded_at?: string | null
          selling_price: number
          store_id: string
          user_id: string
        }
        Update: {
          current_price?: number
          discount_period?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          product_id?: string
          recorded_at?: string | null
          selling_price?: number
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "price_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          content: string
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          image_url: string | null
          name: string
          product_id: string
          product_image_url: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          image_url?: string | null
          name: string
          product_id: string
          product_image_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          image_url?: string | null
          name?: string
          product_id?: string
          product_image_url?: string | null
        }
        Relationships: []
      }
      shopping_memo: {
        Row: {
          created_at: string
          estimated_price: number
          id: string
          is_purchased: boolean
          product_id: string
          product_name: string
          quantity: number
          store_id: string | null
          store_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_price?: number
          id?: string
          is_purchased?: boolean
          product_id: string
          product_name: string
          quantity?: number
          store_id?: string | null
          store_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_price?: number
          id?: string
          is_purchased?: boolean
          product_id?: string
          product_name?: string
          quantity?: number
          store_id?: string | null
          store_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_memo_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_memo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_memo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          address_detail: string | null
          business_hours: string | null
          closing_dates: string[] | null
          created_at: string | null
          email: string | null
          has_hearing_aids: boolean | null
          has_tire_center: boolean | null
          holiday_info: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          phone: string | null
          postal_code: string | null
          region: string
          special_notice: string | null
        }
        Insert: {
          address?: string | null
          address_detail?: string | null
          business_hours?: string | null
          closing_dates?: string[] | null
          created_at?: string | null
          email?: string | null
          has_hearing_aids?: boolean | null
          has_tire_center?: boolean | null
          holiday_info?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          phone?: string | null
          postal_code?: string | null
          region: string
          special_notice?: string | null
        }
        Update: {
          address?: string | null
          address_detail?: string | null
          business_hours?: string | null
          closing_dates?: string[] | null
          created_at?: string | null
          email?: string | null
          has_hearing_aids?: boolean | null
          has_tire_center?: boolean | null
          holiday_info?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          phone?: string | null
          postal_code?: string | null
          region?: string
          special_notice?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          badges: Json | null
          bakery_purchase_count: number | null
          bio: string | null
          confirmed_points: number | null
          created_at: string | null
          daily_budget: number | null
          email: string | null
          id: string
          location_terms_agreed: boolean | null
          location_terms_agreed_at: string | null
          nickname: string | null
          pending_points: number | null
          phone: string | null
          points: number | null
          preferred_store_id: string | null
          status: string | null
          unique_stores_visited: Json | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: Json | null
          bakery_purchase_count?: number | null
          bio?: string | null
          confirmed_points?: number | null
          created_at?: string | null
          daily_budget?: number | null
          email?: string | null
          id: string
          location_terms_agreed?: boolean | null
          location_terms_agreed_at?: string | null
          nickname?: string | null
          pending_points?: number | null
          phone?: string | null
          points?: number | null
          preferred_store_id?: string | null
          status?: string | null
          unique_stores_visited?: Json | null
        }
        Update: {
          avatar_url?: string | null
          badges?: Json | null
          bakery_purchase_count?: number | null
          bio?: string | null
          confirmed_points?: number | null
          created_at?: string | null
          daily_budget?: number | null
          email?: string | null
          id?: string
          location_terms_agreed?: boolean | null
          location_terms_agreed_at?: string | null
          nickname?: string | null
          pending_points?: number | null
          phone?: string | null
          points?: number | null
          preferred_store_id?: string | null
          status?: string | null
          unique_stores_visited?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_preferred_store_id_fkey"
            columns: ["preferred_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          badges: Json | null
          confirmed_points: number | null
          created_at: string | null
          id: string | null
          nickname: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: Json | null
          confirmed_points?: number | null
          created_at?: string | null
          id?: string | null
          nickname?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges?: Json | null
          confirmed_points?: number | null
          created_at?: string | null
          id?: string | null
          nickname?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_pending_points: {
        Args: {
          p_amount: number
          p_reason: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: string
      }
      cancel_pending_points: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      confirm_pending_points: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
