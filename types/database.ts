export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string;
          created_at: string;
          updated_at: string;
          settings: {
            theme: 'light' | 'dark' | 'system';
            notifications: boolean;
            voice_enabled: boolean;
            language: string;
          };
        };
        Insert: {
          id: string;
          email: string;
          name?: string;
          avatar_url?: string;
          settings?: {
            theme?: 'light' | 'dark' | 'system';
            notifications?: boolean;
            voice_enabled?: boolean;
            language?: string;
          };
        };
        Update: {
          name?: string;
          avatar_url?: string;
          settings?: {
            theme?: 'light' | 'dark' | 'system';
            notifications?: boolean;
            voice_enabled?: boolean;
            language?: string;
          };
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          start_time: string;
          end_time: string;
          all_day: boolean;
          location: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          description?: string;
          start_time: string;
          end_time: string;
          all_day?: boolean;
          location?: string;
        };
        Update: {
          title?: string;
          description?: string;
          start_time?: string;
          end_time?: string;
          all_day?: boolean;
          location?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          text: string;
          remind_at: string;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          text?: string;
          remind_at: string;
          completed?: boolean;
        };
        Update: {
          title?: string;
          text?: string;
          remind_at?: string;
          completed?: boolean;
          completed_at?: string | null;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          role: 'user' | 'assistant';
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          user_id: string;
          content: string;
          role: 'user' | 'assistant';
          metadata?: Record<string, any>;
        };
        Update: {
          content?: string;
          metadata?: Record<string, any>;
        };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type Reminder = Database['public']['Tables']['reminders']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];

export interface GeminiResponse {
  intent: 'create_event' | 'set_reminder' | 'get_information' | 'clarify' | 'unsupported' | 'general' | 'create_reminder' | 'get_events' | 'get_reminders' | 'update_event' | 'delete_event' | 'update_reminder' | 'delete_reminder';
  entities: {
    title?: string;
    date?: string;
    time?: string;
    reminderText?: string;
    relativeTime?: string;
    description?: string;
    location?: string;
    reminderMinutes?: number;
    limit?: string;
    eventId?: string;
    reminderId?: string;
    searchQuery?: string;
  };
  confidence: number;
  responseText: string;
}