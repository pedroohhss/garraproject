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
      activities: {
        Row: {
          deadline: string | null
          delivery_type: string | null
          description: string | null
          id: string
          is_required: boolean | null
          title: string | null
          week_id: string | null
        }
        Insert: {
          deadline?: string | null
          delivery_type?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          title?: string | null
          week_id?: string | null
        }
        Update: {
          deadline?: string | null
          delivery_type?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          title?: string | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_config: {
        Row: {
          groups_confirmed: boolean | null
          id: string
          ideas_open: boolean | null
          joining_open: boolean | null
          max_groups: number | null
          max_participants: number | null
          max_per_group: number | null
          registration_open: boolean | null
          votes_per_user: number | null
          voting_open: boolean | null
        }
        Insert: {
          groups_confirmed?: boolean | null
          id?: string
          ideas_open?: boolean | null
          joining_open?: boolean | null
          max_groups?: number | null
          max_participants?: number | null
          max_per_group?: number | null
          registration_open?: boolean | null
          votes_per_user?: number | null
          voting_open?: boolean | null
        }
        Update: {
          groups_confirmed?: boolean | null
          id?: string
          ideas_open?: boolean | null
          joining_open?: boolean | null
          max_groups?: number | null
          max_participants?: number | null
          max_per_group?: number | null
          registration_open?: boolean | null
          votes_per_user?: number | null
          voting_open?: boolean | null
        }
        Relationships: []
      }
      checklist_criteria: {
        Row: {
          description: string | null
          id: string
          points: number | null
          week_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          points?: number | null
          week_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          points?: number | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_criteria_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_entries: {
        Row: {
          completed: boolean | null
          criterion_id: string | null
          group_id: string | null
          id: string
          note: string | null
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          completed?: boolean | null
          criterion_id?: string | null
          group_id?: string | null
          id?: string
          note?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          completed?: boolean | null
          criterion_id?: string | null
          group_id?: string | null
          id?: string
          note?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_entries_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "checklist_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_entries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_entries_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          activity_id: string | null
          admin_feedback: string | null
          content_file_url: string | null
          content_link: string | null
          content_text: string | null
          group_id: string | null
          id: string
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          activity_id?: string | null
          admin_feedback?: string | null
          content_file_url?: string | null
          content_link?: string | null
          content_text?: string | null
          group_id?: string | null
          id?: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          activity_id?: string | null
          admin_feedback?: string | null
          content_file_url?: string | null
          content_link?: string | null
          content_text?: string | null
          group_id?: string | null
          id?: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          id: string
          idea_id: string | null
          leader_id: string | null
          name: string
          representative_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          idea_id?: string | null
          leader_id?: string | null
          name: string
          representative_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          idea_id?: string | null
          leader_id?: string | null
          name?: string
          representative_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          problem: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          problem?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          problem?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          description: string | null
          id: string
          is_required: boolean | null
          title: string | null
          type: string | null
          url: string | null
          week_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_required?: boolean | null
          title?: string | null
          type?: string | null
          url?: string | null
          week_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_required?: boolean | null
          title?: string | null
          type?: string | null
          url?: string | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          group_id: string | null
          id: string
          is_active: boolean | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          group_id?: string | null
          id: string
          is_active?: boolean | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          id: string
          idea_id: string | null
          quantity: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          idea_id?: string | null
          quantity?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          idea_id?: string | null
          quantity?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weeks: {
        Row: {
          ends_at: string | null
          id: string
          is_active: boolean | null
          number: number
          starts_at: string | null
          theme: string | null
          title: string
        }
        Insert: {
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          number: number
          starts_at?: string | null
          theme?: string | null
          title: string
        }
        Update: {
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          number?: number
          starts_at?: string | null
          theme?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_participant_count: { Args: never; Returns: number }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
