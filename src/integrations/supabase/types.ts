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
      availability_exceptions: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          reason: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          reason?: string | null
          start_time?: string | null
        }
        Relationships: []
      }
      availability_rules: {
        Row: {
          active: boolean
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          slot_duration_minutes: number
          start_time: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          slot_duration_minutes?: number
          start_time: string
        }
        Update: {
          active?: boolean
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          slot_duration_minutes?: number
          start_time?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          admin_note: string | null
          consent_popia: boolean
          created_at: string
          email: string
          id: string
          new_patient: boolean
          patient_name: string
          phone: string
          preferred_language: string
          reason_for_visit: string | null
          requested_date: string
          requested_time: string
          service_type: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          consent_popia?: boolean
          created_at?: string
          email: string
          id?: string
          new_patient?: boolean
          patient_name: string
          phone: string
          preferred_language?: string
          reason_for_visit?: string | null
          requested_date: string
          requested_time: string
          service_type: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          consent_popia?: boolean
          created_at?: string
          email?: string
          id?: string
          new_patient?: boolean
          patient_name?: string
          phone?: string
          preferred_language?: string
          reason_for_visit?: string | null
          requested_date?: string
          requested_time?: string
          service_type?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          description: string
          icd10_code: string | null
          id: string
          invoice_id: string
          item_date: string
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          amount: number
          description: string
          icd10_code?: string | null
          id?: string
          invoice_id: string
          item_date: string
          quantity?: number
          sort_order?: number
          unit_price: number
        }
        Update: {
          amount?: number
          description?: string
          icd10_code?: string | null
          id?: string
          invoice_id?: string
          item_date?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          admin_note: string | null
          created_at: string
          date_issued: string
          date_paid: string | null
          dependant_code: string | null
          due_date: string | null
          id: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          medical_aid_member_number: string | null
          medical_aid_name: string | null
          medical_aid_plan: string | null
          paid_amount: number
          patient_address: string | null
          patient_email: string | null
          patient_id: string | null
          patient_name: string
          patient_phone: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total_due: number
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          date_issued?: string
          date_paid?: string | null
          dependant_code?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          medical_aid_member_number?: string | null
          medical_aid_name?: string | null
          medical_aid_plan?: string | null
          paid_amount?: number
          patient_address?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name: string
          patient_phone?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total_due?: number
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          date_issued?: string
          date_paid?: string | null
          dependant_code?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          medical_aid_member_number?: string | null
          medical_aid_name?: string | null
          medical_aid_plan?: string | null
          paid_amount?: number
          patient_address?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string
          patient_phone?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total_due?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          dependant_code: string | null
          email: string | null
          full_name: string
          id: string
          medical_aid_member_number: string | null
          medical_aid_name: string | null
          medical_aid_plan: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          dependant_code?: string | null
          email?: string | null
          full_name: string
          id?: string
          medical_aid_member_number?: string | null
          medical_aid_name?: string | null
          medical_aid_plan?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          dependant_code?: string | null
          email?: string | null
          full_name?: string
          id?: string
          medical_aid_member_number?: string | null
          medical_aid_name?: string | null
          medical_aid_plan?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      practice_settings: {
        Row: {
          address_line1: string
          address_line2: string
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch_code: string | null
          bank_name: string | null
          city: string
          contact_email: string
          contact_phone: string
          country: string
          id: string
          logo_url: string | null
          mp_number: string
          postal_code: string
          practice_name: string
          practice_number: string
          proof_of_payment_email: string | null
          provider_name: string
          role_line: string
          updated_at: string
          vat_exempt_note: string
        }
        Insert: {
          address_line1?: string
          address_line2?: string
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          city?: string
          contact_email?: string
          contact_phone?: string
          country?: string
          id?: string
          logo_url?: string | null
          mp_number?: string
          postal_code?: string
          practice_name?: string
          practice_number?: string
          proof_of_payment_email?: string | null
          provider_name?: string
          role_line?: string
          updated_at?: string
          vat_exempt_note?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          city?: string
          contact_email?: string
          contact_phone?: string
          country?: string
          id?: string
          logo_url?: string | null
          mp_number?: string
          postal_code?: string
          practice_name?: string
          practice_number?: string
          proof_of_payment_email?: string | null
          provider_name?: string
          role_line?: string
          updated_at?: string
          vat_exempt_note?: string
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "declined"
        | "rescheduled"
        | "completed"
        | "cancelled"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void"
      invoice_type: "payment_due" | "paid_receipt"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
      booking_status: [
        "pending",
        "confirmed",
        "declined",
        "rescheduled",
        "completed",
        "cancelled",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "void"],
      invoice_type: ["payment_due", "paid_receipt"],
    },
  },
} as const
