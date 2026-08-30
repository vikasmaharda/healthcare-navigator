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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string | null
          doctor_id: string
          hospital_id: string | null
          id: string
          notes: string | null
          patient_name: string
          status: string | null
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string | null
          doctor_id: string
          hospital_id?: string | null
          id?: string
          notes?: string | null
          patient_name: string
          status?: string | null
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string | null
          doctor_id?: string
          hospital_id?: string | null
          id?: string
          notes?: string | null
          patient_name?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          emergency_available: number | null
          general_available: number | null
          hospital_id: string
          icu_available: number | null
          oxygen_available: number | null
          updated_at: string | null
        }
        Insert: {
          emergency_available?: number | null
          general_available?: number | null
          hospital_id: string
          icu_available?: number | null
          oxygen_available?: number | null
          updated_at?: string | null
        }
        Update: {
          emergency_available?: number | null
          general_available?: number | null
          hospital_id?: string
          icu_available?: number | null
          oxygen_available?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beds_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: true
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_banks: {
        Row: {
          address: string | null
          available_groups: string[] | null
          city: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          available_groups?: string[] | null
          city: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          available_groups?: string[] | null
          city?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      blood_donors: {
        Row: {
          available: boolean | null
          blood_group: string
          city: string
          created_at: string | null
          id: string
          name: string
          phone: string
          user_id: string
        }
        Insert: {
          available?: boolean | null
          blood_group: string
          city: string
          created_at?: string | null
          id?: string
          name: string
          phone: string
          user_id: string
        }
        Update: {
          available?: boolean | null
          blood_group?: string
          city?: string
          created_at?: string | null
          id?: string
          name?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          category: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          resolved: boolean | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          resolved?: boolean | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          resolved?: boolean | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          head_doctor: string | null
          hospital_id: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_doctor?: string | null
          hospital_id?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          head_doctor?: string | null
          hospital_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          available_days: string[] | null
          avatar_url: string | null
          avg_wait_min: number | null
          consultation_fee: number | null
          experience_years: number | null
          hospital_id: string | null
          id: string
          is_active: boolean
          is_available: boolean
          name: string
          rating: number | null
          specialization: string
          timing: string | null
          updated_at: string
        }
        Insert: {
          available_days?: string[] | null
          avatar_url?: string | null
          avg_wait_min?: number | null
          consultation_fee?: number | null
          experience_years?: number | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          name: string
          rating?: number | null
          specialization: string
          timing?: string | null
          updated_at?: string
        }
        Update: {
          available_days?: string[] | null
          avatar_url?: string | null
          avg_wait_min?: number | null
          consultation_fee?: number | null
          experience_years?: number | null
          hospital_id?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          name?: string
          rating?: number | null
          specialization?: string
          timing?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_alerts: {
        Row: {
          channels: string[]
          created_at: string
          id: string
          location_url: string | null
          message: string
          recipients_count: number
          status: string
          user_id: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          id?: string
          location_url?: string | null
          message: string
          recipients_count?: number
          status?: string
          user_id: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          id?: string
          location_url?: string | null
          message?: string
          recipients_count?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          category: string
          id: string
          label: string
          number: string
        }
        Insert: {
          category: string
          id?: string
          label: string
          number: string
        }
        Update: {
          category?: string
          id?: string
          label?: string
          number?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          available: boolean | null
          category: string | null
          created_at: string
          hospital_id: string | null
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          available?: boolean | null
          category?: string | null
          created_at?: string
          hospital_id?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          available?: boolean | null
          category?: string | null
          created_at?: string
          hospital_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          notes: string | null
          record_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          record_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          record_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      hospital_admins: {
        Row: {
          approved: boolean
          created_at: string
          email: string
          hospital_id: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email: string
          hospital_id: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string
          hospital_id?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_admins_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_updates: {
        Row: {
          actor_email: string | null
          changed_by: string | null
          created_at: string
          entity: string
          hospital_id: string
          id: string
          summary: string
        }
        Insert: {
          actor_email?: string | null
          changed_by?: string | null
          created_at?: string
          entity: string
          hospital_id: string
          id?: string
          summary: string
        }
        Update: {
          actor_email?: string | null
          changed_by?: string | null
          created_at?: string
          entity?: string
          hospital_id?: string
          id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_updates_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          ayushman: boolean | null
          city: string
          cost_tier: string | null
          created_at: string | null
          email: string | null
          emergency_24x7: boolean | null
          emergency_phone: string | null
          has_ambulance: boolean | null
          has_blood_bank: boolean | null
          has_icu: boolean | null
          has_lab: boolean | null
          has_mri: boolean | null
          has_pharmacy: boolean | null
          id: string
          image_url: string | null
          is_active: boolean
          is_government: boolean | null
          lat: number | null
          lng: number | null
          maps_link: string | null
          name: string
          phone: string | null
          pincode: string | null
          rating: number | null
          specialties: string[] | null
          state: string | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          ayushman?: boolean | null
          city: string
          cost_tier?: string | null
          created_at?: string | null
          email?: string | null
          emergency_24x7?: boolean | null
          emergency_phone?: string | null
          has_ambulance?: boolean | null
          has_blood_bank?: boolean | null
          has_icu?: boolean | null
          has_lab?: boolean | null
          has_mri?: boolean | null
          has_pharmacy?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_government?: boolean | null
          lat?: number | null
          lng?: number | null
          maps_link?: string | null
          name: string
          phone?: string | null
          pincode?: string | null
          rating?: number | null
          specialties?: string[] | null
          state?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          ayushman?: boolean | null
          city?: string
          cost_tier?: string | null
          created_at?: string | null
          email?: string | null
          emergency_24x7?: boolean | null
          emergency_phone?: string | null
          has_ambulance?: boolean | null
          has_blood_bank?: boolean | null
          has_icu?: boolean | null
          has_lab?: boolean | null
          has_mri?: boolean | null
          has_pharmacy?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_government?: boolean | null
          lat?: number | null
          lng?: number | null
          maps_link?: string | null
          name?: string
          phone?: string | null
          pincode?: string | null
          rating?: number | null
          specialties?: string[] | null
          state?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      pending_hospitals: {
        Row: {
          address: string | null
          ayushman: boolean | null
          city: string
          claim_hospital_id: string | null
          created_at: string | null
          emergency_24x7: boolean | null
          has_ambulance: boolean | null
          has_icu: boolean | null
          has_mri: boolean | null
          id: string
          is_government: boolean | null
          lat: number | null
          lng: number | null
          manager_email: string | null
          name: string
          notes: string | null
          phone: string | null
          reviewed_at: string | null
          specialties: string[] | null
          status: string
          submitted_by: string | null
          submitter_email: string | null
        }
        Insert: {
          address?: string | null
          ayushman?: boolean | null
          city: string
          claim_hospital_id?: string | null
          created_at?: string | null
          emergency_24x7?: boolean | null
          has_ambulance?: boolean | null
          has_icu?: boolean | null
          has_mri?: boolean | null
          id?: string
          is_government?: boolean | null
          lat?: number | null
          lng?: number | null
          manager_email?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          specialties?: string[] | null
          status?: string
          submitted_by?: string | null
          submitter_email?: string | null
        }
        Update: {
          address?: string | null
          ayushman?: boolean | null
          city?: string
          claim_hospital_id?: string | null
          created_at?: string | null
          emergency_24x7?: boolean | null
          has_ambulance?: boolean | null
          has_icu?: boolean | null
          has_mri?: boolean | null
          id?: string
          is_government?: boolean | null
          lat?: number | null
          lng?: number | null
          manager_email?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          reviewed_at?: string | null
          specialties?: string[] | null
          status?: string
          submitted_by?: string | null
          submitter_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_hospitals_claim_hospital_id_fkey"
            columns: ["claim_hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string | null
          city: string
          home_delivery: boolean | null
          id: string
          medicines: string[] | null
          name: string
          open_24x7: boolean | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          city: string
          home_delivery?: boolean | null
          id?: string
          medicines?: string[] | null
          name: string
          open_24x7?: boolean | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          home_delivery?: boolean | null
          id?: string
          medicines?: string[] | null
          name?: string
          open_24x7?: boolean | null
          phone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blood_group: string | null
          created_at: string
          dob: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string | null
          gender: string | null
          id: string
          language: string | null
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          blood_group?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          language?: string | null
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          blood_group?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          language?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          cleanliness: number | null
          comment: string | null
          created_at: string | null
          doctor_behavior: number | null
          hospital_id: string
          id: string
          rating: number
          treatment_quality: number | null
          user_id: string
          waiting_time: number | null
        }
        Insert: {
          cleanliness?: number | null
          comment?: string | null
          created_at?: string | null
          doctor_behavior?: number | null
          hospital_id: string
          id?: string
          rating: number
          treatment_quality?: number | null
          user_id: string
          waiting_time?: number | null
        }
        Update: {
          cleanliness?: number | null
          comment?: string | null
          created_at?: string | null
          doctor_behavior?: number | null
          hospital_id?: string
          id?: string
          rating?: number
          treatment_quality?: number | null
          user_id?: string
          waiting_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      schemes: {
        Row: {
          benefits: string | null
          description: string | null
          eligibility: string | null
          id: string
          link: string | null
          name: string
        }
        Insert: {
          benefits?: string | null
          description?: string | null
          eligibility?: string | null
          id?: string
          link?: string | null
          name: string
        }
        Update: {
          benefits?: string | null
          description?: string | null
          eligibility?: string | null
          id?: string
          link?: string | null
          name?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_type: string
          created_at: string
          detail: string | null
          hospital_id: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          detail?: string | null
          hospital_id?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          detail?: string | null
          hospital_id?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_emergency_contacts: {
        Row: {
          created_at: string
          custom_message: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          relationship?: string | null
          updated_at?: string
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
      user_settings: {
        Row: {
          created_at: string
          emergency_message: string
          language: string
          share_location: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emergency_message?: string
          language?: string
          share_location?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emergency_message?: string
          language?: string
          share_location?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_age: { Args: { _dob: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_hospital_admin: {
        Args: { _hospital_id: string; _user_id: string }
        Returns: boolean
      }
      my_hospital_id: { Args: never; Returns: string }
      search_blood_donors: {
        Args: { _blood_group: string; _city?: string }
        Returns: {
          blood_group: string
          city: string
          id: string
          name: string
          phone: string
        }[]
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
