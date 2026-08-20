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
      ai_access_audit: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          target_user_id: string | null
          thread_id: string | null
        }
        Insert: {
          action?: string
          admin_id: string
          created_at?: string
          id?: string
          target_user_id?: string | null
          thread_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          target_user_id?: string | null
          thread_id?: string | null
        }
        Relationships: []
      }
      alumni: {
        Row: {
          company: string | null
          company_type: string | null
          created_at: string
          current_company: string | null
          current_field: string | null
          current_location: string | null
          current_position: string | null
          education_level: string | null
          employment_status: string | null
          faculty: string | null
          full_name: string
          further_education: string | null
          gender: string | null
          graduation_status: string | null
          graduation_year: number
          id: string
          job_field: string | null
          linkedin_url: string | null
          location: string | null
          major: string | null
          name: string
          nim: string | null
          origin: string | null
          phone: string | null
          position: string | null
          profile_id: string | null
          status: string
          student_id: string | null
          target_university: string | null
          tracer_filled_at: string | null
          university: string | null
          university_id: string | null
          university_status: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
          work_city: string | null
          work_country: string | null
          work_province: string | null
          year_graduated: number | null
        }
        Insert: {
          company?: string | null
          company_type?: string | null
          created_at?: string
          current_company?: string | null
          current_field?: string | null
          current_location?: string | null
          current_position?: string | null
          education_level?: string | null
          employment_status?: string | null
          faculty?: string | null
          full_name: string
          further_education?: string | null
          gender?: string | null
          graduation_status?: string | null
          graduation_year: number
          id?: string
          job_field?: string | null
          linkedin_url?: string | null
          location?: string | null
          major?: string | null
          name: string
          nim?: string | null
          origin?: string | null
          phone?: string | null
          position?: string | null
          profile_id?: string | null
          status?: string
          student_id?: string | null
          target_university?: string | null
          tracer_filled_at?: string | null
          university?: string | null
          university_id?: string | null
          university_status?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          work_city?: string | null
          work_country?: string | null
          work_province?: string | null
          year_graduated?: number | null
        }
        Update: {
          company?: string | null
          company_type?: string | null
          created_at?: string
          current_company?: string | null
          current_field?: string | null
          current_location?: string | null
          current_position?: string | null
          education_level?: string | null
          employment_status?: string | null
          faculty?: string | null
          full_name?: string
          further_education?: string | null
          gender?: string | null
          graduation_status?: string | null
          graduation_year?: number
          id?: string
          job_field?: string | null
          linkedin_url?: string | null
          location?: string | null
          major?: string | null
          name?: string
          nim?: string | null
          origin?: string | null
          phone?: string | null
          position?: string | null
          profile_id?: string | null
          status?: string
          student_id?: string | null
          target_university?: string | null
          tracer_filled_at?: string | null
          university?: string | null
          university_id?: string | null
          university_status?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          work_city?: string | null
          work_country?: string | null
          work_province?: string | null
          year_graduated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_education: {
        Row: {
          alumni_id: string | null
          city: string | null
          created_at: string | null
          degree: string | null
          end_year: number | null
          id: string
          level: string | null
          major: string | null
          notes: string | null
          province: string | null
          start_year: number | null
          status: string
          university_id: string | null
          university_name: string | null
          university_type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alumni_id?: string | null
          city?: string | null
          created_at?: string | null
          degree?: string | null
          end_year?: number | null
          id?: string
          level?: string | null
          major?: string | null
          notes?: string | null
          province?: string | null
          start_year?: number | null
          status?: string
          university_id?: string | null
          university_name?: string | null
          university_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alumni_id?: string | null
          city?: string | null
          created_at?: string | null
          degree?: string | null
          end_year?: number | null
          id?: string
          level?: string | null
          major?: string | null
          notes?: string | null
          province?: string | null
          start_year?: number | null
          status?: string
          university_id?: string | null
          university_name?: string | null
          university_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_education_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_education_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_employment: {
        Row: {
          alumni_id: string | null
          company_id: string | null
          created_at: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          position: string | null
          start_date: string | null
        }
        Insert: {
          alumni_id?: string | null
          company_id?: string | null
          created_at?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          position?: string | null
          start_date?: string | null
        }
        Update: {
          alumni_id?: string | null
          company_id?: string | null
          created_at?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          position?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_employment_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_employment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_stories: {
        Row: {
          author_name: string
          category: string | null
          content: string
          created_at: string
          id: string
          is_published: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_updates: {
        Row: {
          alumni_id: string | null
          company_id: string | null
          created_at: string | null
          employment_status: string | null
          end_date: string | null
          id: string
          position: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          alumni_id?: string | null
          company_id?: string | null
          created_at?: string | null
          employment_status?: string | null
          end_date?: string | null
          id?: string
          position?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          alumni_id?: string | null
          company_id?: string | null
          created_at?: string | null
          employment_status?: string | null
          end_date?: string | null
          id?: string
          position?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_updates_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_updates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at: string
          updated_by: string | null
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
          updated_at?: string
          updated_by?: string | null
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
          updated_at?: string
          updated_by?: string | null
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
      cbt_results: {
        Row: {
          alumni_id: string | null
          cbt_test_id: string | null
          completed_at: string | null
          id: string
          score: number | null
        }
        Insert: {
          alumni_id?: string | null
          cbt_test_id?: string | null
          completed_at?: string | null
          id?: string
          score?: number | null
        }
        Update: {
          alumni_id?: string | null
          cbt_test_id?: string | null
          completed_at?: string | null
          id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cbt_results_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_results_cbt_test_id_fkey"
            columns: ["cbt_test_id"]
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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          mode: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      counseling: {
        Row: {
          alumni_id: string | null
          counselor_name: string | null
          created_at: string | null
          id: string
          notes: string | null
          schedule: string | null
          status: string | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          alumni_id?: string | null
          counselor_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          schedule?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          alumni_id?: string | null
          counselor_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          schedule?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counseling_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
        ]
      }
      counseling_referrals: {
        Row: {
          created_at: string
          id: string
          level: string
          notes: string | null
          reason: string
          source: string | null
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          notes?: string | null
          reason: string
          source?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          notes?: string | null
          reason?: string
          source?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          capacity: number | null
          created_at: string
          date: string
          description: string | null
          id: string
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
          location?: string
          organizer?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          identity_number: string | null
          invited_by: string | null
          last_sent_at: string | null
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          identity_number?: string | null
          invited_by?: string | null
          last_sent_at?: string | null
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          identity_number?: string | null
          invited_by?: string | null
          last_sent_at?: string | null
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          updated_by?: string | null
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
          company_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          employment_type: string
          id: string
          location: string
          posted_by: string | null
          salary: string | null
          salary_max: number | null
          salary_min: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company: string
          company_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          employment_type?: string
          id?: string
          location: string
          posted_by?: string | null
          salary?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company?: string
          company_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          employment_type?: string
          id?: string
          location?: string
          posted_by?: string | null
          salary?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          id: string
          ip_key: string
          last_failed_attempt: string | null
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          ip_key?: string
          last_failed_attempt?: string | null
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          ip_key?: string
          last_failed_attempt?: string | null
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          account_status: string
          activated_at: string | null
          address: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          company: string | null
          created_at: string
          education_level: string | null
          email: string | null
          full_name: string
          gender: string | null
          graduation_year: number | null
          id: string
          invited_at: string | null
          major: string | null
          origin: string | null
          phone: string | null
          position: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          school_origin: string | null
          university: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          activated_at?: string | null
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          company?: string | null
          created_at?: string
          education_level?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          invited_at?: string | null
          major?: string | null
          origin?: string | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          school_origin?: string | null
          university?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          activated_at?: string | null
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          company?: string | null
          created_at?: string
          education_level?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          graduation_year?: number | null
          id?: string
          invited_at?: string | null
          major?: string | null
          origin?: string | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          school_origin?: string | null
          university?: string | null
          updated_at?: string
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
          updated_at: string
          updated_by: string | null
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
          updated_at?: string
          updated_by?: string | null
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
          updated_at?: string
          updated_by?: string | null
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
      psychotest_results: {
        Row: {
          alumni_id: string | null
          completed_at: string | null
          id: string
          psychotest_id: string | null
          result: string | null
          score: number | null
        }
        Insert: {
          alumni_id?: string | null
          completed_at?: string | null
          id?: string
          psychotest_id?: string | null
          result?: string | null
          score?: number | null
        }
        Update: {
          alumni_id?: string | null
          completed_at?: string | null
          id?: string
          psychotest_id?: string | null
          result?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "psychotest_results_alumni_id_fkey"
            columns: ["alumni_id"]
            isOneToOne: false
            referencedRelation: "alumni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psychotest_results_psychotest_id_fkey"
            columns: ["psychotest_id"]
            isOneToOne: false
            referencedRelation: "psychotests"
            referencedColumns: ["id"]
          },
        ]
      }
      psychotests: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scholarships: {
        Row: {
          amount: string | null
          country: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          provider: string
          requirements: string | null
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          amount?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          provider: string
          requirements?: string | null
          type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          amount?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          provider?: string
          requirements?: string | null
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      universities: {
        Row: {
          category: Database["public"]["Enums"]["university_type"]
          city: string | null
          country: string
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          status: string | null
          updated_at: string
          website: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["university_type"]
          city?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          status?: string | null
          updated_at?: string
          website: string
        }
        Update: {
          category?: Database["public"]["Enums"]["university_type"]
          city?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          status?: string | null
          updated_at?: string
          website?: string
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
      alumni_directory: {
        Args: never
        Returns: {
          company: string
          company_type: string
          created_at: string
          education_level: string
          employment_status: string
          faculty: string
          full_name: string
          further_education: string
          gender: string
          graduation_status: string
          graduation_year: number
          id: string
          job_field: string
          location: string
          major: string
          name: string
          origin: string
          position: string
          status: string
          target_university: string
          tracer_filled_at: string
          university: string
          university_status: string
          updated_at: string
          work_city: string
          work_country: string
          work_province: string
        }[]
      }
      cbt_answer_options: {
        Args: { _test_id: string }
        Returns: {
          answer_text: string
          id: string
          question_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_or_create_alumni: {
        Args: { _full_name: string; _md?: Json; _user_id: string }
        Returns: string
      }
      public_stats: { Args: never; Returns: Json }
      submit_cbt_attempt: {
        Args: { _answers: Json; _test_id: string }
        Returns: Json
      }
      submit_graduate_status: {
        Args: {
          _company?: string
          _graduation_year?: number
          _job_field?: string
          _major?: string
          _position?: string
          _status: string
          _university?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "alumni" | "mitra" | "santri"
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
      app_role: ["admin", "alumni", "mitra", "santri"],
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
