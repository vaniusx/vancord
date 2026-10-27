export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      channel_members: {
        Row: {
          channel_id: string;
          user_id: string;
        };
        Insert: {
          channel_id: string;
          user_id: string;
        };
        Update: {
          channel_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_reads: {
        Row: {
          channel_id: string;
          last_read_at: string;
          user_id: string;
        };
        Insert: {
          channel_id: string;
          last_read_at?: string;
          user_id: string;
        };
        Update: {
          channel_id?: string;
          last_read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_reads_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
        ];
      };
      channels: {
        Row: {
          created_at: string;
          id: string;
          name: string | null;
          position: number;
          server_id: string | null;
          topic: string | null;
          type: Database["public"]["Enums"]["channel_type"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          name?: string | null;
          position?: number;
          server_id?: string | null;
          topic?: string | null;
          type?: Database["public"]["Enums"]["channel_type"];
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string | null;
          position?: number;
          server_id?: string | null;
          topic?: string | null;
          type?: Database["public"]["Enums"]["channel_type"];
        };
        Relationships: [
          {
            foreignKeyName: "channels_server_id_fkey";
            columns: ["server_id"];
            isOneToOne: false;
            referencedRelation: "servers";
            referencedColumns: ["id"];
          },
        ];
      };
      friendships: {
        Row: {
          addressee_id: string;
          created_at: string;
          requester_id: string;
          status: Database["public"]["Enums"]["friendship_status"];
          updated_at: string;
        };
        Insert: {
          addressee_id: string;
          created_at?: string;
          requester_id: string;
          status?: Database["public"]["Enums"]["friendship_status"];
          updated_at?: string;
        };
        Update: {
          addressee_id?: string;
          created_at?: string;
          requester_id?: string;
          status?: Database["public"]["Enums"]["friendship_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string | null;
          max_uses: number | null;
          server_id: string;
          uses: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          expires_at?: string | null;
          max_uses?: number | null;
          server_id: string;
          uses?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          server_id?: string;
          uses?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invites_server_id_fkey";
            columns: ["server_id"];
            isOneToOne: false;
            referencedRelation: "servers";
            referencedColumns: ["id"];
          },
        ];
      };
      message_attachments: {
        Row: {
          created_at: string;
          height: number | null;
          id: string;
          message_id: string;
          mime: string;
          size_bytes: number | null;
          storage_path: string;
          width: number | null;
        };
        Insert: {
          created_at?: string;
          height?: number | null;
          id?: string;
          message_id: string;
          mime: string;
          size_bytes?: number | null;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          created_at?: string;
          height?: number | null;
          id?: string;
          message_id?: string;
          mime?: string;
          size_bytes?: number | null;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          author_id: string;
          channel_id: string;
          content: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
        };
        Insert: {
          author_id: string;
          channel_id: string;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
        };
        Update: {
          author_id?: string;
          channel_id?: string;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          accent_color: string;
          avatar_url: string | null;
          created_at: string;
          custom_status: string | null;
          display_name: string;
          id: string;
          status: Database["public"]["Enums"]["presence_status"];
          updated_at: string;
          username: string;
        };
        Insert: {
          accent_color?: string;
          avatar_url?: string | null;
          created_at?: string;
          custom_status?: string | null;
          display_name: string;
          id: string;
          status?: Database["public"]["Enums"]["presence_status"];
          updated_at?: string;
          username: string;
        };
        Update: {
          accent_color?: string;
          avatar_url?: string | null;
          created_at?: string;
          custom_status?: string | null;
          display_name?: string;
          id?: string;
          status?: Database["public"]["Enums"]["presence_status"];
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      reactions: {
        Row: {
          created_at: string;
          emoji: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      server_members: {
        Row: {
          joined_at: string;
          role: Database["public"]["Enums"]["server_role"];
          server_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string;
          role?: Database["public"]["Enums"]["server_role"];
          server_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          role?: Database["public"]["Enums"]["server_role"];
          server_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "server_members_server_id_fkey";
            columns: ["server_id"];
            isOneToOne: false;
            referencedRelation: "servers";
            referencedColumns: ["id"];
          },
        ];
      };
      servers: {
        Row: {
          created_at: string;
          icon_url: string | null;
          id: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          icon_url?: string | null;
          id?: string;
          name: string;
          owner_id: string;
        };
        Update: {
          created_at?: string;
          icon_url?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_access_channel: { Args: { target_channel: string }; Returns: boolean };
      create_invite: {
        Args: {
          expires_in_hours?: number;
          max_uses?: number;
          target_server: string;
        };
        Returns: string;
      };
      find_user_by_username: {
        Args: { target_username: string };
        Returns: {
          avatar_url: string;
          display_name: string;
          id: string;
          username: string;
        }[];
      };
      is_server_admin: { Args: { target_server: string }; Returns: boolean };
      is_server_member: { Args: { target_server: string }; Returns: boolean };
      join_server: { Args: { invite_code: string }; Returns: string };
      mark_channel_read: {
        Args: { target_channel: string };
        Returns: undefined;
      };
      server_role_of: {
        Args: { target_server: string };
        Returns: Database["public"]["Enums"]["server_role"];
      };
      start_dm: { Args: { other_user: string }; Returns: string };
      unread_counts: {
        Args: never;
        Returns: {
          channel_id: string;
          unread: number;
        }[];
      };
    };
    Enums: {
      channel_type: "text" | "dm";
      friendship_status: "pending" | "accepted" | "blocked";
      presence_status: "online" | "idle" | "dnd" | "invisible" | "offline";
      server_role: "owner" | "admin" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      channel_type: ["text", "dm"],
      friendship_status: ["pending", "accepted", "blocked"],
      presence_status: ["online", "idle", "dnd", "invisible", "offline"],
      server_role: ["owner", "admin", "member"],
    },
  },
} as const;
