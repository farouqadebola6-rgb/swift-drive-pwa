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
      cash_debts: {
        Row: {
          amount_owed: number
          created_at: string
          driver_id: string
          id: string
          ride_id: number
          settled: boolean
          settled_at: string | null
          settlement_reference: string | null
        }
        Insert: {
          amount_owed: number
          created_at?: string
          driver_id: string
          id?: string
          ride_id: number
          settled?: boolean
          settled_at?: string | null
          settlement_reference?: string | null
        }
        Update: {
          amount_owed?: number
          created_at?: string
          driver_id?: string
          id?: string
          ride_id?: number
          settled?: boolean
          settled_at?: string | null
          settlement_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_debts_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_logs: {
        Row: {
          error_message: string | null
          id: string
          message_body: string
          ride_id: number
          sent_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          message_body: string
          ride_id: number
          sent_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          message_body?: string
          ride_id?: number
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_logs_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          account_number: string | null
          badge_type: Database["public"]["Enums"]["driver_badge_type"] | null
          bank_name: string | null
          created_at: string
          date_of_birth: string | null
          debt_locked_at: string | null
          drivers_license_expiry: string | null
          drivers_license_number: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          home_address: string | null
          insurance_doc_url: string | null
          licence_url: string | null
          nin: string | null
          onboarding_submitted_at: string | null
          paystack_subaccount_code: string | null
          plate_number: string | null
          profile_photo_url: string | null
          suspension_reason: string | null
          total_cash_debt: number
          updated_at: string
          user_id: string
          vehicle_colour: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_photo_url: string | null
          vehicle_registration_doc_url: string | null
          vehicle_registration_number: string | null
          vehicle_year: number | null
          verification_status: Database["public"]["Enums"]["driver_verification_status"]
        }
        Insert: {
          account_number?: string | null
          badge_type?: Database["public"]["Enums"]["driver_badge_type"] | null
          bank_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          debt_locked_at?: string | null
          drivers_license_expiry?: string | null
          drivers_license_number?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          home_address?: string | null
          insurance_doc_url?: string | null
          licence_url?: string | null
          nin?: string | null
          onboarding_submitted_at?: string | null
          paystack_subaccount_code?: string | null
          plate_number?: string | null
          profile_photo_url?: string | null
          suspension_reason?: string | null
          total_cash_debt?: number
          updated_at?: string
          user_id: string
          vehicle_colour?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_registration_doc_url?: string | null
          vehicle_registration_number?: string | null
          vehicle_year?: number | null
          verification_status?: Database["public"]["Enums"]["driver_verification_status"]
        }
        Update: {
          account_number?: string | null
          badge_type?: Database["public"]["Enums"]["driver_badge_type"] | null
          bank_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          debt_locked_at?: string | null
          drivers_license_expiry?: string | null
          drivers_license_number?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          home_address?: string | null
          insurance_doc_url?: string | null
          licence_url?: string | null
          nin?: string | null
          onboarding_submitted_at?: string | null
          paystack_subaccount_code?: string | null
          plate_number?: string | null
          profile_photo_url?: string | null
          suspension_reason?: string | null
          total_cash_debt?: number
          updated_at?: string
          user_id?: string
          vehicle_colour?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_registration_doc_url?: string | null
          vehicle_registration_number?: string | null
          vehicle_year?: number | null
          verification_status?: Database["public"]["Enums"]["driver_verification_status"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: number
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: number
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: number
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          driver_split: number | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paystack_authorization_code: string | null
          paystack_reference: string | null
          platform_split: number | null
          ride_id: number
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          driver_split?: number | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paystack_authorization_code?: string | null
          paystack_reference?: string | null
          platform_split?: number | null
          ride_id: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          driver_split?: number | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paystack_authorization_code?: string | null
          paystack_reference?: string | null
          platform_split?: number | null
          ride_id?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          base_fare: number
          commission_percent: number
          id: number
          per_km_rate: number
          per_minute_rate: number
          updated_at: string
          whatsapp_group_jid: string | null
        }
        Insert: {
          base_fare?: number
          commission_percent?: number
          id?: number
          per_km_rate?: number
          per_minute_rate?: number
          updated_at?: string
          whatsapp_group_jid?: string | null
        }
        Update: {
          base_fare?: number
          commission_percent?: number
          id?: number
          per_km_rate?: number
          per_minute_rate?: number
          updated_at?: string
          whatsapp_group_jid?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          driver_id: string
          id: string
          ride_id: number
          rider_id: string
          score: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          driver_id: string
          id?: string
          ride_id: number
          rider_id: string
          score: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          ride_id?: number
          rider_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: true
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          acceptance_token: string
          accepted_at: string | null
          actual_distance_km: number | null
          actual_duration_min: number | null
          arrived_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          destination_address: string
          destination_area: string
          destination_lat: number
          destination_lng: number
          dispatched_at: string | null
          driver_id: string | null
          driver_pickup_lat: number | null
          driver_pickup_lng: number | null
          estimated_distance_km: number | null
          estimated_duration_min: number | null
          fare_estimate: number
          final_fare: number | null
          id: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup_address: string
          pickup_area: string
          pickup_lat: number
          pickup_lng: number
          rider_id: string
          status: Database["public"]["Enums"]["ride_status"]
          trip_end_time: string | null
          trip_start_time: string | null
          updated_at: string
        }
        Insert: {
          acceptance_token?: string
          accepted_at?: string | null
          actual_distance_km?: number | null
          actual_duration_min?: number | null
          arrived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          destination_address: string
          destination_area: string
          destination_lat: number
          destination_lng: number
          dispatched_at?: string | null
          driver_id?: string | null
          driver_pickup_lat?: number | null
          driver_pickup_lng?: number | null
          estimated_distance_km?: number | null
          estimated_duration_min?: number | null
          fare_estimate: number
          final_fare?: number | null
          id?: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup_address: string
          pickup_area: string
          pickup_lat: number
          pickup_lng: number
          rider_id: string
          status?: Database["public"]["Enums"]["ride_status"]
          trip_end_time?: string | null
          trip_start_time?: string | null
          updated_at?: string
        }
        Update: {
          acceptance_token?: string
          accepted_at?: string | null
          actual_distance_km?: number | null
          actual_duration_min?: number | null
          arrived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          destination_address?: string
          destination_area?: string
          destination_lat?: number
          destination_lng?: number
          dispatched_at?: string | null
          driver_id?: string | null
          driver_pickup_lat?: number | null
          driver_pickup_lng?: number | null
          estimated_distance_km?: number | null
          estimated_duration_min?: number | null
          fare_estimate?: number
          final_fare?: number | null
          id?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pickup_address?: string
          pickup_area?: string
          pickup_lat?: number
          pickup_lng?: number
          rider_id?: string
          status?: Database["public"]["Enums"]["ride_status"]
          trip_end_time?: string | null
          trip_start_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          address: string
          created_at: string
          id: number
          label: string
          lat: number | null
          lng: number | null
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: number
          label: string
          lat?: number | null
          lng?: number | null
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: number
          label?: string
          lat?: number | null
          lng?: number | null
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
      matched_driver_public: {
        Row: {
          badge_type: Database["public"]["Enums"]["driver_badge_type"] | null
          plate_number: string | null
          user_id: string | null
          vehicle_colour: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_photo_url: string | null
          verification_status:
            | Database["public"]["Enums"]["driver_verification_status"]
            | null
        }
        Insert: {
          badge_type?: Database["public"]["Enums"]["driver_badge_type"] | null
          plate_number?: string | null
          user_id?: string | null
          vehicle_colour?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          verification_status?:
            | Database["public"]["Enums"]["driver_verification_status"]
            | null
        }
        Update: {
          badge_type?: Database["public"]["Enums"]["driver_badge_type"] | null
          plate_number?: string | null
          user_id?: string | null
          vehicle_colour?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          verification_status?:
            | Database["public"]["Enums"]["driver_verification_status"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_ride: {
        Args: { p_ride_id: number }
        Returns: {
          acceptance_token: string
          accepted_at: string | null
          actual_distance_km: number | null
          actual_duration_min: number | null
          arrived_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          destination_address: string
          destination_area: string
          destination_lat: number
          destination_lng: number
          dispatched_at: string | null
          driver_id: string | null
          driver_pickup_lat: number | null
          driver_pickup_lng: number | null
          estimated_distance_km: number | null
          estimated_duration_min: number | null
          fare_estimate: number
          final_fare: number | null
          id: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup_address: string
          pickup_area: string
          pickup_lat: number
          pickup_lng: number
          rider_id: string
          status: Database["public"]["Enums"]["ride_status"]
          trip_end_time: string | null
          trip_start_time: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_ride: {
        Args: {
          p_actual_distance_km: number
          p_actual_duration_min: number
          p_ride_id: number
        }
        Returns: {
          acceptance_token: string
          accepted_at: string | null
          actual_distance_km: number | null
          actual_duration_min: number | null
          arrived_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          destination_address: string
          destination_area: string
          destination_lat: number
          destination_lng: number
          dispatched_at: string | null
          driver_id: string | null
          driver_pickup_lat: number | null
          driver_pickup_lng: number | null
          estimated_distance_km: number | null
          estimated_duration_min: number | null
          fare_estimate: number
          final_fare: number | null
          id: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup_address: string
          pickup_area: string
          pickup_lat: number
          pickup_lng: number
          rider_id: string
          status: Database["public"]["Enums"]["ride_status"]
          trip_end_time: string | null
          trip_start_time: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_ride_status: {
        Args: {
          p_ride_id: number
          p_status: Database["public"]["Enums"]["ride_status"]
        }
        Returns: {
          acceptance_token: string
          accepted_at: string | null
          actual_distance_km: number | null
          actual_duration_min: number | null
          arrived_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          destination_address: string
          destination_area: string
          destination_lat: number
          destination_lng: number
          dispatched_at: string | null
          driver_id: string | null
          driver_pickup_lat: number | null
          driver_pickup_lng: number | null
          estimated_distance_km: number | null
          estimated_duration_min: number | null
          fare_estimate: number
          final_fare: number | null
          id: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup_address: string
          pickup_area: string
          pickup_lat: number
          pickup_lng: number
          rider_id: string
          status: Database["public"]["Enums"]["ride_status"]
          trip_end_time: string | null
          trip_start_time: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "rider" | "driver" | "admin"
      driver_badge_type: "verified" | "physically_verified"
      driver_verification_status:
        | "pending"
        | "verified_digital"
        | "verified_physical"
        | "suspended"
      payment_method: "online" | "cash"
      payment_status:
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "refunded"
      ride_status:
        | "pending"
        | "in_progress"
        | "driver_arrived"
        | "started"
        | "completed"
        | "cancelled"
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
      app_role: ["rider", "driver", "admin"],
      driver_badge_type: ["verified", "physically_verified"],
      driver_verification_status: [
        "pending",
        "verified_digital",
        "verified_physical",
        "suspended",
      ],
      payment_method: ["online", "cash"],
      payment_status: [
        "pending",
        "authorized",
        "captured",
        "failed",
        "refunded",
      ],
      ride_status: [
        "pending",
        "in_progress",
        "driver_arrived",
        "started",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
