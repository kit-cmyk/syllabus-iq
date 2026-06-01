// Stub database types — replace with: supabase gen types typescript --project-id <id>
// This stub mirrors the expected Supabase generated types format.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      exam_templates: {
        Row: { id: string; name: string; slug: string; config: Json; created_at: string }
        Insert: { id?: string; name: string; slug: string; config: Json; created_at?: string }
        Update: { id?: string; name?: string; slug?: string; config?: Json; created_at?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string; email: string; display_name: string | null; avatar_url: string | null
          total_xp: number; streak_count: number; streak_shields: number
          streak_last_date: string | null; opt_in_leaderboard: boolean; created_at: string
        }
        Insert: {
          id: string; email: string; display_name?: string | null; avatar_url?: string | null
          total_xp?: number; streak_count?: number; streak_shields?: number
          streak_last_date?: string | null; opt_in_leaderboard?: boolean; created_at?: string
        }
        Update: {
          id?: string; email?: string; display_name?: string | null; avatar_url?: string | null
          total_xp?: number; streak_count?: number; streak_shields?: number
          streak_last_date?: string | null; opt_in_leaderboard?: boolean; created_at?: string
        }
        Relationships: []
      }
      user_exam_enrollments: {
        Row: { id: string; user_id: string; template_id: string; exam_date: string; weekly_hours: number; created_at: string }
        Insert: { id?: string; user_id: string; template_id: string; exam_date: string; weekly_hours: number; created_at?: string }
        Update: { id?: string; user_id?: string; template_id?: string; exam_date?: string; weekly_hours?: number; created_at?: string }
        Relationships: [{ foreignKeyName: 'user_exam_enrollments_template_id_fkey'; columns: ['template_id']; referencedRelation: 'exam_templates'; referencedColumns: ['id'] }]
      }
      user_nodes: {
        Row: { id: string; user_id: string; enrollment_id: string; node_path: string; coverage_status: 'unread' | 'in_progress' | 'completed'; mastery_score: number; updated_at: string }
        Insert: { id?: string; user_id: string; enrollment_id: string; node_path: string; coverage_status?: 'unread' | 'in_progress' | 'completed'; mastery_score?: number; updated_at?: string }
        Update: { id?: string; user_id?: string; enrollment_id?: string; node_path?: string; coverage_status?: 'unread' | 'in_progress' | 'completed'; mastery_score?: number; updated_at?: string }
        Relationships: []
      }
      sessions: {
        Row: { id: string; user_id: string; enrollment_id: string; node_path: string; type: 'passive' | 'quiz'; duration_minutes: number | null; score: number | null; total_items: number | null; logged_at: string }
        Insert: { id?: string; user_id: string; enrollment_id: string; node_path: string; type: 'passive' | 'quiz'; duration_minutes?: number | null; score?: number | null; total_items?: number | null; logged_at?: string }
        Update: { id?: string; user_id?: string; enrollment_id?: string; node_path?: string; type?: 'passive' | 'quiz'; duration_minutes?: number | null; score?: number | null; total_items?: number | null; logged_at?: string }
        Relationships: []
      }
      user_xp_log: {
        Row: { id: string; user_id: string; action_type: string; xp_earned: number; logged_at: string }
        Insert: { id?: string; user_id: string; action_type: string; xp_earned: number; logged_at?: string }
        Update: { id?: string; user_id?: string; action_type?: string; xp_earned?: number; logged_at?: string }
        Relationships: []
      }
      user_achievements: {
        Row: { id: string; user_id: string; achievement_slug: string; unlocked_at: string }
        Insert: { id?: string; user_id: string; achievement_slug: string; unlocked_at?: string }
        Update: { id?: string; user_id?: string; achievement_slug?: string; unlocked_at?: string }
        Relationships: []
      }
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; notify_daily_reminder: boolean; notify_pace_warning: boolean; notify_streak_milestone: boolean; reminder_time: string | null; created_at: string }
        Insert: { id?: string; user_id: string; endpoint: string; p256dh: string; auth: string; notify_daily_reminder?: boolean; notify_pace_warning?: boolean; notify_streak_milestone?: boolean; reminder_time?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; endpoint?: string; p256dh?: string; auth?: string; notify_daily_reminder?: boolean; notify_pace_warning?: boolean; notify_streak_milestone?: boolean; reminder_time?: string | null; created_at?: string }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: { enrollment_id: string | null; template_id: string | null; avg_mastery: number | null; topics_logged: number | null; rank: number | null }
        Relationships: []
      }
    }
    Functions: {
      increment_profile_xp: { Args: { p_user_id: string; p_amount: number }; Returns: undefined }
      update_streak: { Args: { p_user_id: string }; Returns: number }
      check_streak_shield: { Args: { p_user_id: string; p_streak: number }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
