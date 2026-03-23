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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      academies: {
        Row: {
          access_code: string
          admin_user_id: string
          created_at: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          access_code?: string
          admin_user_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          access_code?: string
          admin_user_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      academy_students: {
        Row: {
          academy_id: string
          id: string
          is_active: boolean
          joined_at: string | null
          student_auth_user_id: string
        }
        Insert: {
          academy_id: string
          id?: string
          is_active?: boolean
          joined_at?: string | null
          student_auth_user_id: string
        }
        Update: {
          academy_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string | null
          student_auth_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_students_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_teachers: {
        Row: {
          academy_id: string
          id: string
          is_active: boolean
          joined_at: string | null
          teacher_id: string
        }
        Insert: {
          academy_id: string
          id?: string
          is_active?: boolean
          joined_at?: string | null
          teacher_id: string
        }
        Update: {
          academy_id?: string
          id?: string
          is_active?: boolean
          joined_at?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_teachers_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_url: string | null
          course_id: string
          id: string
          issued_at: string | null
          student_auth_user_id: string
        }
        Insert: {
          certificate_url?: string | null
          course_id: string
          id?: string
          issued_at?: string | null
          student_auth_user_id: string
        }
        Update: {
          certificate_url?: string | null
          course_id?: string
          id?: string
          issued_at?: string | null
          student_auth_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      exam_options: {
        Row: {
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          question_text: string
          question_type: string
          sort_order: number
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          question_text?: string
          question_type?: string
          sort_order?: number
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          question_text?: string
          question_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_comments: {
        Row: {
          auth_user_id: string
          class_id: string
          created_at: string | null
          id: string
          message: string
          parent_id: string | null
          sender_name: string
        }
        Insert: {
          auth_user_id: string
          class_id: string
          created_at?: string | null
          id?: string
          message?: string
          parent_id?: string | null
          sender_name?: string
        }
        Update: {
          auth_user_id?: string
          class_id?: string
          created_at?: string | null
          id?: string
          message?: string
          parent_id?: string | null
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_comments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "feedback_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_options: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "feedback_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_questions: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          is_active: boolean
          question_text: string
          question_type: string
          sort_order: number
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          question_text?: string
          question_type?: string
          sort_order?: number
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          question_text?: string
          question_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_questions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          answer_text: string | null
          created_at: string | null
          id: string
          question_id: string
          rating: number | null
          selected_option_id: string | null
          student_auth_user_id: string
        }
        Insert: {
          answer_text?: string | null
          created_at?: string | null
          id?: string
          question_id: string
          rating?: number | null
          selected_option_id?: string | null
          student_auth_user_id: string
        }
        Update: {
          answer_text?: string | null
          created_at?: string | null
          id?: string
          question_id?: string
          rating?: number | null
          selected_option_id?: string | null
          student_auth_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "feedback_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "feedback_options"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          auth_user_id: string
          class_id: string
          created_at: string | null
          id: string
          message: string
          sender_name: string
        }
        Insert: {
          auth_user_id: string
          class_id: string
          created_at?: string | null
          id?: string
          message?: string
          sender_name?: string
        }
        Update: {
          auth_user_id?: string
          class_id?: string
          created_at?: string | null
          id?: string
          message?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_slides: {
        Row: {
          id: string
          image_url: string
          is_active: boolean | null
          language: string
          slide_number: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          image_url: string
          is_active?: boolean | null
          language: string
          slide_number: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          image_url?: string
          is_active?: boolean | null
          language?: string
          slide_number?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      slide_actions: {
        Row: {
          action_type: string
          created_at: string | null
          emoji: string
          id: string
          is_active: boolean
          is_vertical: boolean
          label: string
          slide_id: string
          sort_order: number
          updated_at: string | null
          url: string | null
        }
        Insert: {
          action_type?: string
          created_at?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          is_vertical?: boolean
          label?: string
          slide_id: string
          sort_order?: number
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          is_vertical?: boolean
          label?: string
          slide_id?: string
          sort_order?: number
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slide_actions_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "teacher_slides"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exam_responses: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean | null
          open_answer: string | null
          question_id: string
          selected_option_id: string | null
          student_auth_user_id: string
          teacher_grade: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          open_answer?: string | null
          question_id: string
          selected_option_id?: string | null
          student_auth_user_id: string
          teacher_grade?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          open_answer?: string | null
          question_id?: string
          selected_option_id?: string | null
          student_auth_user_id?: string
          teacher_grade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_exam_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_responses_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "exam_options"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          note_text: string
          slide_number: number
          student_auth_user_id: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          note_text?: string
          slide_number: number
          student_auth_user_id: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          note_text?: string
          slide_number?: number
          student_auth_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          class_id: string
          completed: boolean
          id: string
          last_slide_number: number
          student_auth_user_id: string
          total_slides: number
          updated_at: string | null
        }
        Insert: {
          class_id: string
          completed?: boolean
          id?: string
          last_slide_number?: number
          student_auth_user_id: string
          total_slides?: number
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          completed?: boolean
          id?: string
          last_slide_number?: number
          student_auth_user_id?: string
          total_slides?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_classes: {
        Row: {
          class_type: string
          course_id: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          external_url: string | null
          feedback_enabled: boolean
          id: string
          is_active: boolean
          is_live_active: boolean
          layout: string
          name: string
          scheduled_date: string | null
          sort_order: number
          teacher_id: string
          teacher_notes: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          class_type?: string
          course_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          feedback_enabled?: boolean
          id?: string
          is_active?: boolean
          is_live_active?: boolean
          layout?: string
          name?: string
          scheduled_date?: string | null
          sort_order?: number
          teacher_id: string
          teacher_notes?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          class_type?: string
          course_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          feedback_enabled?: boolean
          id?: string
          is_active?: boolean
          is_live_active?: boolean
          layout?: string
          name?: string
          scheduled_date?: string | null
          sort_order?: number
          teacher_id?: string
          teacher_notes?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_requests: {
        Row: {
          auth_user_id: string
          brand_name: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          auth_user_id: string
          brand_name?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          auth_user_id?: string
          brand_name?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      teacher_slides: {
        Row: {
          class_id: string | null
          content_type: string
          created_at: string | null
          id: string
          is_active: boolean
          language: string
          media_type: string
          media_url: string | null
          slide_number: number
          sort_order: number
          teacher_id: string
          teacher_notes: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          language?: string
          media_type?: string
          media_url?: string | null
          slide_number: number
          sort_order?: number
          teacher_id: string
          teacher_notes?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          language?: string
          media_type?: string
          media_url?: string | null
          slide_number?: number
          sort_order?: number
          teacher_id?: string
          teacher_notes?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_slides_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_slides_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_students: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string | null
          student_auth_user_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string | null
          student_auth_user_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string | null
          student_auth_user_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          access_code: string
          auth_user_id: string | null
          avatar_url: string | null
          brand_name: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          access_code?: string
          auth_user_id?: string | null
          avatar_url?: string | null
          brand_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          access_code?: string
          auth_user_id?: string | null
          avatar_url?: string | null
          brand_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      users: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          reviewed_at: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          reviewed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          reviewed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_teacher_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_academy_admin: {
        Args: { _academy_id: string; _user_id: string }
        Returns: boolean
      }
      is_academy_manager: {
        Args: { _teacher_id: string; _user_id: string }
        Returns: boolean
      }
      is_academy_student: {
        Args: { _academy_id: string; _user_id: string }
        Returns: boolean
      }
      is_student_of_teacher: {
        Args: { _student_user_id: string; _teacher_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "superadmin" | "teacher" | "academy"
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
      app_role: ["admin", "moderator", "superadmin", "teacher", "academy"],
    },
  },
} as const
