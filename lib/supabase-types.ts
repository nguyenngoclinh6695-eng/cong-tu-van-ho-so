// Sinh tự động từ schema Supabase (project "Website du hoc"). Chạy lại khi đổi schema:
// generate_typescript_types qua MCP Supabase, rồi dán đè vào file này.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      conversations: {
        Row: {
          channel: string;
          id: string;
          last_message_at: string;
          session_id: string;
          started_at: string;
        };
        Insert: {
          channel?: string;
          id?: string;
          last_message_at?: string;
          session_id: string;
          started_at?: string;
        };
        Update: {
          channel?: string;
          id?: string;
          last_message_at?: string;
          session_id?: string;
          started_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          availability: string | null;
          conversation_id: string;
          country: string | null;
          education_level: string | null;
          email: string | null;
          extracted_at: string;
          full_name: string | null;
          id: string;
          major: string | null;
          note: string | null;
          phone: string | null;
          quality: string;
          wants_consultation: boolean | null;
        };
        Insert: {
          availability?: string | null;
          conversation_id: string;
          country?: string | null;
          education_level?: string | null;
          email?: string | null;
          extracted_at?: string;
          full_name?: string | null;
          id?: string;
          major?: string | null;
          note?: string | null;
          phone?: string | null;
          quality: string;
          wants_consultation?: boolean | null;
        };
        Update: {
          availability?: string | null;
          conversation_id?: string;
          country?: string | null;
          education_level?: string | null;
          email?: string | null;
          extracted_at?: string;
          full_name?: string | null;
          id?: string;
          major?: string | null;
          note?: string | null;
          phone?: string | null;
          quality?: string;
          wants_consultation?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: true;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
