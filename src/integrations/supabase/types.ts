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
      alumni: {
        Row: {
          company: string | null
          created_at: string
          graduation_year: number
          id: string
          location: string | null
          name: string
          position: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          graduation_year: number
          id?: string
          location?: string | null
          name: string
          position?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          graduation_year?: number
          id?: string
          location?: string | null
          name?: string
          position?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cbt_answers: {
        Row: {
          answer_text: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          score: number
        }
        Insert: {
          answer_text: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          score?: number
        }
        Update: {
          answer_text?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "cbt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "cbt_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_attempt_answers: {
        Row: {
          answer_id: string | null
          attempt_id: string
          created_at: string
          id: string
          question_id: string
          score: number
        }
        Insert: {
          answer_id?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          question_id: string
          score?: number
        }
        Update: {
          answer_id?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          question_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "cbt_attempt_answers_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "cbt_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "cbt_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "cbt_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          max_score: number
          passed: boolean
          percentage: number
          recommendation: string | null
          started_at: string
          test_id: string
          total_score: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          max_score?: number
          passed?: boolean
          percentage?: number
          recommendation?: string | null
          started_at?: string
          test_id: string
          total_score?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          max_score?: number
          passed?: boolean
          percentage?: number
          recommendation?: string | null
          started_at?: string
          test_id?: string
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbt_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "cbt_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["cbt_category_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: Database["public"]["Enums"]["cbt_category_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["cbt_category_type"]
          updated_at?: string
        }
        Relationships: []
      }
      cbt_questions: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          order_index: number
          question_text: string
          test_id: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          order_index?: number
          question_text: string
          test_id: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          order_index?: number
          question_text?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbt_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "cbt_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_tests: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          passing_score: number
          title: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          passing_score?: number
          title: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          passing_score?: number
          title?: string
          total_questions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbt_tests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cbt_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          created_at: string
          date: string
          description: string | null
          id: string
          location: string
          organizer: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          location?: string
          organizer?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          location?: string
          organizer?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          cv_url: string | null
          email: string
          full_name: string
          id: string
          job_id: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          cv_url?: string | null
          email: string
          full_name: string
          id?: string
          job_id: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          cv_url?: string | null
          email?: string
          full_name?: string
          id?: string
          job_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string
          created_at: string
          description: string | null
          id: string
          location: string
          posted_by: string | null
          salary: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          id?: string
          location: string
          posted_by?: string | null
          salary?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          posted_by?: string | null
          salary?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          contact_email: string | null
          created_at: string
          description: string | null
          id: string
          industry: string
          location: string | null
          logo_url: string | null
          name: string
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string
          location?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psikotes_answers: {
        Row: {
          answer_text: string
          created_at: string
          id: string
          question_id: string
          score: number
        }
        Insert: {
          answer_text: string
          created_at?: string
          id?: string
          question_id: string
          score?: number
        }
        Update: {
          answer_text?: string
          created_at?: string
          id?: string
          question_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "psikotes_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "psikotes_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      psikotes_attempts: {
        Row: {
          answers: Json
          completed_at: string
          conclusion: string | null
          created_at: string
          id: string
          level: string | null
          recommendation: string | null
          test_id: string
          total_score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          conclusion?: string | null
          created_at?: string
          id?: string
          level?: string | null
          recommendation?: string | null
          test_id: string
          total_score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          conclusion?: string | null
          created_at?: string
          id?: string
          level?: string | null
          recommendation?: string | null
          test_id?: string
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psikotes_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "psikotes_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      psikotes_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      psikotes_questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          question_text: string
          test_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          question_text: string
          test_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          question_text?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psikotes_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "psikotes_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      psikotes_results: {
        Row: {
          conclusion: string
          created_at: string
          id: string
          level: string
          max_score: number
          min_score: number
          recommendation: string
          test_id: string
        }
        Insert: {
          conclusion: string
          created_at?: string
          id?: string
          level: string
          max_score: number
          min_score: number
          recommendation: string
          test_id: string
        }
        Update: {
          conclusion?: string
          created_at?: string
          id?: string
          level?: string
          max_score?: number
          min_score?: number
          recommendation?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psikotes_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "psikotes_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      psikotes_tests: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psikotes_tests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "psikotes_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          city: string | null
          country: string
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          type: Database["public"]["Enums"]["university_type"]
          updated_at: string
          website_url: string
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          type?: Database["public"]["Enums"]["university_type"]
          updated_at?: string
          website_url: string
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          type?: Database["public"]["Enums"]["university_type"]
          updated_at?: string
          website_url?: string
        }
        Relationships: []
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
      app_role: "admin" | "alumni" | "mitra"
      cbt_category_type:
        | "tpa"
        | "minat_bakat"
        | "verbal"
        | "numerik"
        | "logika"
        | "kepribadian"
      university_type: "dalam_negeri" | "luar_negeri" | "kedinasan"
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
      app_role: ["admin", "alumni", "mitra"],
      cbt_category_type: [
        "tpa",
        "minat_bakat",
        "verbal",
        "numerik",
        "logika",
        "kepribadian",
      ],
      university_type: ["dalam_negeri", "luar_negeri", "kedinasan"],
    },
  },
} as const
