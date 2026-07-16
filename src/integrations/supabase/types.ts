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
      auction_registrations: {
        Row: {
          auction_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          auction_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          auction_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_registrations_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
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
      documents: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          property_id: string
          size_bytes: number | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          property_id: string
          size_bytes?: number | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          property_id?: string
          size_bytes?: number | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["fund_request_kind"]
          method: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["fund_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["fund_request_kind"]
          method: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["fund_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["fund_request_kind"]
          method?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["fund_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          address_line1: string
          address_line2: string | null
          admin_notes: string | null
          city: string
          country: string
          created_at: string
          date_of_birth: string
          id: string
          id_document_path: string | null
          legal_name: string
          postal_code: string
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          status: Database["public"]["Enums"]["kyc_status"]
          tax_id_last4: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          admin_notes?: string | null
          city: string
          country?: string
          created_at?: string
          date_of_birth: string
          id?: string
          id_document_path?: string | null
          legal_name: string
          postal_code: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state: string
          status?: Database["public"]["Enums"]["kyc_status"]
          tax_id_last4: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          admin_notes?: string | null
          city?: string
          country?: string
          created_at?: string
          date_of_birth?: string
          id?: string
          id_document_path?: string | null
          legal_name?: string
          postal_code?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          tax_id_last4?: string
          updated_at?: string
          user_id?: string
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
          redemption_period_months: number
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
          redemption_period_months?: number
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
          redemption_period_months?: number
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
      messages: {
        Row: {
          body: string
          created_at: string
          from_admin: boolean
          id: string
          read_at: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_admin?: boolean
          id?: string
          read_at?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          read_at?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_balance: number
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          account_balance?: number
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          account_balance?: number
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          assessed_value: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          county_id: string
          created_at: string
          description: string | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          improvement_value: number | null
          land_value: number | null
          living_area_sqft: number | null
          lot_size_acres: number | null
          owner_mailing_address: string | null
          owner_name: string | null
          parcel_id: string
          property_type: Database["public"]["Enums"]["property_type"]
          state: string
          updated_at: string
          use_type: string | null
          year_built: number | null
          zip: string
        }
        Insert: {
          address: string
          assessed_value?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          county_id: string
          created_at?: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          improvement_value?: number | null
          land_value?: number | null
          living_area_sqft?: number | null
          lot_size_acres?: number | null
          owner_mailing_address?: string | null
          owner_name?: string | null
          parcel_id: string
          property_type: Database["public"]["Enums"]["property_type"]
          state: string
          updated_at?: string
          use_type?: string | null
          year_built?: number | null
          zip: string
        }
        Update: {
          address?: string
          assessed_value?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          county_id?: string
          created_at?: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          improvement_value?: number | null
          land_value?: number | null
          living_area_sqft?: number | null
          lot_size_acres?: number | null
          owner_mailing_address?: string | null
          owner_name?: string | null
          parcel_id?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          state?: string
          updated_at?: string
          use_type?: string | null
          year_built?: number | null
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
      saved_searches: {
        Row: {
          created_at: string
          id: string
          name: string
          notify: boolean
          query: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notify?: boolean
          query?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notify?: boolean
          query?: Json
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
      admin_adjust_balance: {
        Args: { _delta: number; _reason: string; _user_id: string }
        Returns: number
      }
      admin_delete_registration: { Args: { _id: string }; Returns: undefined }
      admin_send_message: {
        Args: { _body: string; _subject: string; _user_id: string }
        Returns: string
      }
      admin_set_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_set_verified: {
        Args: { _user_id: string; _verified: boolean }
        Returns: undefined
      }
      approve_fund_request: {
        Args: { _admin_notes?: string; _approve: boolean; _id: string }
        Returns: undefined
      }
      claim_first_admin: { Args: never; Returns: boolean }
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
      review_kyc: {
        Args: { _approve: boolean; _id: string; _notes?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      auction_status: "draft" | "scheduled" | "live" | "closed" | "canceled"
      bid_status: "winning" | "outbid" | "won" | "lost" | "invalid"
      fund_request_kind: "deposit" | "withdrawal"
      fund_request_status: "pending" | "approved" | "rejected" | "completed"
      kyc_status: "pending" | "approved" | "rejected"
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
      fund_request_kind: ["deposit", "withdrawal"],
      fund_request_status: ["pending", "approved", "rejected", "completed"],
      kyc_status: ["pending", "approved", "rejected"],
      lien_status: ["active", "redeemed", "canceled", "expired"],
      property_type: ["residential", "land", "commercial"],
    },
  },
} as const
