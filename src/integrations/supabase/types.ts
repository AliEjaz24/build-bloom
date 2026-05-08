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
      availability: {
        Row: {
          day: number
          id: string
          slot_index: number
          status: string | null
          teacher_id: string
        }
        Insert: {
          day: number
          id?: string
          slot_index: number
          status?: string | null
          teacher_id: string
        }
        Update: {
          day?: number
          id?: string
          slot_index?: number
          status?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cancel_requests: {
        Row: {
          cancel_date: string | null
          course_id: string | null
          created_at: string | null
          id: string
          reason: string | null
          slot_index: number | null
          status: string | null
          teacher_id: string
        }
        Insert: {
          cancel_date?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          slot_index?: number | null
          status?: string | null
          teacher_id: string
        }
        Update: {
          cancel_date?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          slot_index?: number | null
          status?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancel_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancel_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          credit_hours: number
          id: string
          program: string | null
          semester: number | null
          title: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          credit_hours?: number
          id?: string
          program?: string | null
          semester?: number | null
          title: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          credit_hours?: number
          id?: string
          program?: string | null
          semester?: number | null
          title?: string
        }
        Relationships: []
      }
      makeup_requests: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          original_date: string | null
          proposed_date: string | null
          reason: string | null
          room_id: string | null
          slot_index: number | null
          status: string | null
          teacher_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          original_date?: string | null
          proposed_date?: string | null
          reason?: string | null
          room_id?: string | null
          slot_index?: number | null
          status?: string | null
          teacher_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          original_date?: string | null
          proposed_date?: string | null
          reason?: string | null
          room_id?: string | null
          slot_index?: number | null
          status?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "makeup_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "makeup_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: Database["public"]["Enums"]["app_role"] | null
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          recipient_id: string | null
          title: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          recipient_id?: string | null
          title: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          recipient_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          batch: number | null
          created_at: string
          department: string | null
          designation: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          program: string | null
          section: string | null
        }
        Insert: {
          batch?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email: string
          full_name?: string
          id: string
          phone?: string | null
          program?: string | null
          section?: string | null
        }
        Update: {
          batch?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          program?: string | null
          section?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          status: string | null
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          status?: string | null
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          code: string
          created_at: string | null
          id: string
          location: string | null
          type: string | null
        }
        Insert: {
          capacity?: number | null
          code: string
          created_at?: string | null
          id?: string
          location?: string | null
          type?: string | null
        }
        Update: {
          capacity?: number | null
          code?: string
          created_at?: string | null
          id?: string
          location?: string | null
          type?: string | null
        }
        Relationships: []
      }
      term_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          room_id: string | null
          section: string | null
          teacher_id: string | null
          term_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          room_id?: string | null
          section?: string | null
          teacher_id?: string | null
          term_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          room_id?: string | null
          section?: string | null
          teacher_id?: string | null
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_courses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_courses_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      term_datesheet: {
        Row: {
          course_id: string | null
          created_at: string
          exam_date: string | null
          id: string
          kind: string
          room_id: string | null
          slot_index: number | null
          term_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          exam_date?: string | null
          id?: string
          kind: string
          room_id?: string | null
          slot_index?: number | null
          term_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          exam_date?: string | null
          id?: string
          kind?: string
          room_id?: string | null
          slot_index?: number | null
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_datesheet_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_datesheet_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_datesheet_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      term_week_plan: {
        Row: {
          color: string | null
          created_at: string
          day: number
          id: string
          label: string
          term_id: string
          week: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          day: number
          id?: string
          label?: string
          term_id: string
          week: number
        }
        Update: {
          color?: string | null
          created_at?: string
          day?: number
          id?: string
          label?: string
          term_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "term_week_plan_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          active: boolean
          code: string
          created_at: string
          end_date: string | null
          id: string
          label: string
          start_date: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          end_date?: string | null
          id?: string
          label: string
          start_date?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          end_date?: string | null
          id?: string
          label?: string
          start_date?: string | null
        }
        Relationships: []
      }
      timetable_slots: {
        Row: {
          batch: number
          color: string | null
          course_id: string | null
          created_at: string | null
          day: number
          id: string
          program: string
          room_id: string | null
          section: string
          slot_index: number
          teacher_id: string | null
        }
        Insert: {
          batch: number
          color?: string | null
          course_id?: string | null
          created_at?: string | null
          day: number
          id?: string
          program: string
          room_id?: string | null
          section: string
          slot_index: number
          teacher_id?: string | null
        }
        Update: {
          batch?: number
          color?: string | null
          course_id?: string | null
          created_at?: string | null
          day?: number
          id?: string
          program?: string
          room_id?: string | null
          section?: string
          slot_index?: number
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "admin" | "teacher" | "student"
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
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
