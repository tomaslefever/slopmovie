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
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          movie_id: string
          text: string
          user_avatar: string | null
          user_id: string
          user_name: string
          used_for_influence: boolean
          voted_option: string | null
          votes_count: number
        }
        Insert: {
          created_at?: string
          id: string
          is_system?: boolean
          movie_id: string
          text: string
          user_avatar?: string | null
          user_id: string
          user_name: string
          used_for_influence?: boolean
          voted_option?: string | null
          votes_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          movie_id?: string
          text?: string
          user_avatar?: string | null
          user_id?: string
          user_name?: string
          used_for_influence?: boolean
          voted_option?: string | null
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      cinema_state: {
        Row: {
          active_ad_id: string | null
          ads_config: Json
          current_step: number
          id: string
          is_generation_paused: boolean
          is_live: boolean
          is_paused: boolean
          movie_id: string | null
          phase: string
          phase_duration: number | null
          phase_ends_at: string | null
          phase_started_at: string | null
          selected_option: string | null
          time_remaining: number
          total_audience: number
          updated_at: string
          video_model: string | null
          video_resolution: string | null
          votes_a: number
          votes_b: number
          was_random_pick: boolean
          worker_heartbeat: string | null
          worker_id: string | null
        }
        Insert: {
          active_ad_id?: string | null
          ads_config?: Json
          current_step?: number
          id?: string
          is_generation_paused?: boolean
          is_live?: boolean
          is_paused?: boolean
          movie_id?: string | null
          phase?: string
          phase_duration?: number | null
          phase_ends_at?: string | null
          phase_started_at?: string | null
          selected_option?: string | null
          time_remaining?: number
          total_audience?: number
          updated_at?: string
          video_model?: string | null
          video_resolution?: string | null
          votes_a?: number
          votes_b?: number
          was_random_pick?: boolean
          worker_heartbeat?: string | null
          worker_id?: string | null
        }
        Update: {
          active_ad_id?: string | null
          ads_config?: Json
          current_step?: number
          id?: string
          is_generation_paused?: boolean
          is_live?: boolean
          is_paused?: boolean
          movie_id?: string | null
          phase?: string
          phase_duration?: number | null
          phase_ends_at?: string | null
          phase_started_at?: string | null
          selected_option?: string | null
          time_remaining?: number
          total_audience?: number
          updated_at?: string
          video_model?: string | null
          video_resolution?: string | null
          votes_a?: number
          votes_b?: number
          was_random_pick?: boolean
          worker_heartbeat?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cinema_state_active_ad_id_fkey"
            columns: ["active_ad_id"]
            isOneToOne: false
            referencedRelation: "immersive_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cinema_state_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_votes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          movie_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          movie_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          movie_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_votes_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      immersive_ads: {
        Row: {
          brand_name: string
          clicks: number
          created_at: string
          cta_text: string
          cta_url: string | null
          description: string | null
          duration: number
          frequency_steps: number | null
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          movie_id: string | null
          perk_reward: string | null
          step_trigger: number | null
          tagline: string | null
          title: string
          type: string
          video_url: string | null
        }
        Insert: {
          brand_name: string
          clicks?: number
          created_at?: string
          cta_text?: string
          cta_url?: string | null
          description?: string | null
          duration?: number
          frequency_steps?: number | null
          id: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          movie_id?: string | null
          perk_reward?: string | null
          step_trigger?: number | null
          tagline?: string | null
          title: string
          type?: string
          video_url?: string | null
        }
        Update: {
          brand_name?: string
          clicks?: number
          created_at?: string
          cta_text?: string
          cta_url?: string | null
          description?: string | null
          duration?: number
          frequency_steps?: number | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          movie_id?: string | null
          perk_reward?: string | null
          step_trigger?: number | null
          tagline?: string | null
          title?: string
          type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immersive_ads_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_steps: {
        Row: {
          active_characters: Json
          active_props: Json
          camera_motion_prompt: string | null
          created_at: string
          dialogue_snippet: string | null
          duration: number
          environment: string | null
          id: string
          movie_id: string
          new_character: Json | null
          new_prop: Json | null
          options: Json
          prop_reference_images: Json
          reference_video_url: string | null
          selected_option: string | null
          step_number: number
          subtitles: Json
          synopsis: string
          thumbnail_url: string | null
          title: string
          video_url: string
          visual_prompt: string
          voice_direction: string | null
          voting_window_seconds: number
          was_random_pick: boolean
        }
        Insert: {
          active_characters?: Json
          active_props?: Json
          camera_motion_prompt?: string | null
          created_at?: string
          dialogue_snippet?: string | null
          duration?: number
          environment?: string | null
          id?: string
          movie_id: string
          new_character?: Json | null
          new_prop?: Json | null
          options?: Json
          prop_reference_images?: Json
          reference_video_url?: string | null
          selected_option?: string | null
          step_number: number
          subtitles?: Json
          synopsis: string
          thumbnail_url?: string | null
          title: string
          video_url: string
          visual_prompt: string
          voice_direction?: string | null
          voting_window_seconds?: number
          was_random_pick?: boolean
        }
        Update: {
          active_characters?: Json
          active_props?: Json
          camera_motion_prompt?: string | null
          created_at?: string
          dialogue_snippet?: string | null
          duration?: number
          environment?: string | null
          id?: string
          movie_id?: string
          new_character?: Json | null
          new_prop?: Json | null
          options?: Json
          prop_reference_images?: Json
          reference_video_url?: string | null
          selected_option?: string | null
          step_number?: number
          subtitles?: Json
          synopsis?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
          visual_prompt?: string
          voice_direction?: string | null
          voting_window_seconds?: number
          was_random_pick?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "movie_steps_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          bible: Json
          completed_at: string | null
          created_at: string
          current_step: number
          final_summary: string | null
          final_synopsis: string | null
          genre: string
          id: string
          initial_plot: string
          master_arc_thread: string
          status: string
          tagline: string | null
          title: string
          total_steps: number
          total_votes_cast: number
        }
        Insert: {
          bible?: Json
          completed_at?: string | null
          created_at?: string
          current_step?: number
          final_summary?: string | null
          final_synopsis?: string | null
          genre?: string
          id: string
          initial_plot?: string
          master_arc_thread?: string
          status?: string
          tagline?: string | null
          title: string
          total_steps?: number
          total_votes_cast?: number
        }
        Update: {
          bible?: Json
          completed_at?: string | null
          created_at?: string
          current_step?: number
          final_summary?: string | null
          final_synopsis?: string | null
          genre?: string
          id?: string
          initial_plot?: string
          master_arc_thread?: string
          status?: string
          tagline?: string | null
          title?: string
          total_steps?: number
          total_votes_cast?: number
        }
        Relationships: []
      }
      props: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          movie_id: string
          name: string
          narrative_significance: string | null
          owner_character_id: string | null
          owner_character_name: string | null
          step_introduced: number
          visual_appearance: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id: string
          image_url?: string | null
          movie_id: string
          name: string
          narrative_significance?: string | null
          owner_character_id?: string | null
          owner_character_name?: string | null
          step_introduced?: number
          visual_appearance: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          movie_id?: string
          name?: string
          narrative_significance?: string | null
          owner_character_id?: string | null
          owner_character_name?: string | null
          step_introduced?: number
          visual_appearance?: string
        }
        Relationships: [
          {
            foreignKeyName: "props_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      step_votes: {
        Row: {
          created_at: string
          id: string
          movie_id: string
          option_id: string
          step_number: number
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movie_id: string
          option_id: string
          step_number: number
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movie_id?: string
          option_id?: string
          step_number?: number
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_votes_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      top_voted_comments: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          movie_id: string
          text: string
          updated_at: string
          user_id: string
          user_name: string
          votes_count: number
        }
        Insert: {
          comment_id: string
          created_at?: string
          id: string
          movie_id: string
          text: string
          updated_at?: string
          user_id: string
          user_name: string
          votes_count?: number
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          movie_id?: string
          text?: string
          updated_at?: string
          user_id?: string
          user_name?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "top_voted_comments_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      viewer_preferences: {
        Row: {
          last_voted_step: number | null
          nickname: string | null
          subtitle_language: string
          subtitles_enabled: boolean
          updated_at: string
          user_id: string
          voted_option: string | null
        }
        Insert: {
          last_voted_step?: number | null
          nickname?: string | null
          subtitle_language?: string
          subtitles_enabled?: boolean
          updated_at?: string
          user_id: string
          voted_option?: string | null
        }
        Update: {
          last_voted_step?: number | null
          nickname?: string | null
          subtitle_language?: string
          subtitles_enabled?: boolean
          updated_at?: string
          user_id?: string
          voted_option?: string | null
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
    Enums: {},
  },
} as const

