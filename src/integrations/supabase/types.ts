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
      admin_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          meta: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      auctions: {
        Row: {
          county_id: string | null
          created_at: string
          ends_at: string
          id: string
          starts_at: string
          status: Database["public"]["Enums"]["auction_status"]
          title: string
          updated_at: string
        }
        Insert: {
          county_id?: string | null
          created_at?: string
          ends_at: string
          id?: string
          starts_at: string
          status?: Database["public"]["Enums"]["auction_status"]
          title: string
          updated_at?: string
        }
        Update: {
          county_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["auction_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auctions_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          id: string
          interest_rate: number
          lien_id: string
          placed_at: string
          status: Database["public"]["Enums"]["bid_status"]
          user_id: string
        }
        Insert: {
          id?: string
          interest_rate: number
          lien_id: string
          placed_at?: string
          status?: Database["public"]["Enums"]["bid_status"]
          user_id: string
        }
        Update: {
          id?: string
          interest_rate?: number
          lien_id?: string
          placed_at?: string
          status?: Database["public"]["Enums"]["bid_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_lien_id_fkey"
            columns: ["lien_id"]
            isOneToOne: false
            referencedRelation: "liens"
            referencedColumns: ["id"]
          },
        ]
      }
      counties: {
        Row: {
          created_at: string
          id: string
          name: string
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          state: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          state?: string
        }
        Relationships: []
      }
      liens: {
        Row: {
          auction_id: string
          bid_decrement: number
          created_at: string
          current_rate: number | null
          current_winner_id: string | null
          id: string
          min_bid: number
          property_id: string
          starting_rate: number
          status: Database["public"]["Enums"]["lien_status"]
          tax_year: number
          taxes_owed: number
          updated_at: string
        }
        Insert: {
          auction_id: string
          bid_decrement?: number
          created_at?: string
          current_rate?: number | null
          current_winner_id?: string | null
          id?: string
          min_bid: number
          property_id: string
          starting_rate?: number
          status?: Database["public"]["Enums"]["lien_status"]
          tax_year: number
          taxes_owed: number
          updated_at?: string
        }
        Update: {
          auction_id?: string
          bid_decrement?: number
          created_at?: string
          current_rate?: number | null
          current_winner_id?: string | null
          id?: string
          min_bid?: number
          property_id?: string
          starting_rate?: number
          status?: Database["public"]["Enums"]["lien_status"]
          tax_year?: number
          taxes_owed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liens_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liens_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          assessed_value: number | null
          city: string
          county_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          parcel_id: string
          property_type: Database["public"]["Enums"]["property_type"]
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          address: string
          assessed_value?: number | null
          city: string
          county_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          parcel_id: string
          property_type: Database["public"]["Enums"]["property_type"]
          state: string
          updated_at?: string
          zip: string
        }
        Update: {
          address?: string
          assessed_value?: number | null
          city?: string
          county_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          parcel_id?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
      watchlist: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      place_bid: {
        Args: { _interest_rate: number; _lien_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      auction_status: "draft" | "scheduled" | "live" | "closed" | "canceled"
      bid_status: "winning" | "outbid" | "won" | "lost" | "invalid"
      lien_status: "active" | "redeemed" | "canceled" | "expired"
      property_type: "residential" | "land" | "commercial"
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
      auction_status: ["draft", "scheduled", "live", "closed", "canceled"],
      bid_status: ["winning", "outbid", "won", "lost", "invalid"],
      lien_status: ["active", "redeemed", "canceled", "expired"],
      property_type: ["residential", "land", "commercial"],
    },
  },
} as const
