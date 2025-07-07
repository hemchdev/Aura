import { supabase } from './supabase';
import { notificationService } from './notificationService';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Event, Reminder } from '@/types/database';

export interface CalendarCommand {
  type: 'create_event' | 'update_event' | 'delete_event' | 'get_events' | 
        'create_reminder' | 'update_reminder' | 'delete_reminder' | 'get_reminders';
  data: any;
}

export interface CalendarResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class AssistantCalendarService {
  
  async createEvent(eventData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    location?: string;
    reminderMinutes?: number;
    multiDay?: boolean;
    dateRange?: string;
  }): Promise<CalendarResponse> {
    try {
      // Debug logging
      console.log('=== CALENDAR SERVICE DEBUG ===');
      console.log('Event data received:', {
        title: eventData.title,
        startTime: eventData.startTime.toISOString(),
        endTime: eventData.endTime?.toISOString(),
        multiDay: eventData.multiDay,
        dateRange: eventData.dateRange,
      });
      
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      await useAuthStore.getState().ensureProfile();

      // Handle multi-day events
      let endTime = eventData.endTime;
      let isAllDay = false;
      
      if (eventData.multiDay && eventData.endTime) {
        // For multi-day events, make them all-day events
        isAllDay = true;
        // Set start time to beginning of day
        const startOfDay = new Date(eventData.startTime);
        startOfDay.setHours(0, 0, 0, 0);
        
        // Set end time to end of the last day
        const endOfDay = new Date(eventData.endTime);
        endOfDay.setHours(23, 59, 59, 999);
        
        endTime = endOfDay;
        eventData.startTime = startOfDay;
        
        console.log('Multi-day event processed:', {
          startTime: eventData.startTime.toISOString(),
          endTime: endTime.toISOString(),
          isAllDay,
        });
      } else {
        // For single day events, default to 1 hour duration if no end time
        endTime = eventData.endTime || new Date(eventData.startTime.getTime() + 60 * 60 * 1000);
        console.log('Single day event processed:', {
          startTime: eventData.startTime.toISOString(),
          endTime: endTime.toISOString(),
          isAllDay,
        });
      }

      const { data, error } = await supabase.from('events').insert({
        user_id: user.id,
        title: eventData.title,
        description: eventData.description || '',
        start_time: eventData.startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: eventData.location || '',
        all_day: isAllDay,
      }).select().single();

      if (error) {
        return { success: false, message: 'Failed to create event', error: error.message };
      }

      // Schedule notification reminder (skip for multi-day events as they're usually all-day)
      if (eventData.reminderMinutes && eventData.reminderMinutes > 0 && !isAllDay) {
        await notificationService.scheduleEventReminder(
          data.id,
          eventData.title,
          eventData.startTime,
          eventData.reminderMinutes
        );
      }

      const durationText = eventData.multiDay 
        ? `from ${eventData.startTime.toLocaleDateString()} to ${endTime.toLocaleDateString()}`
        : `on ${eventData.startTime.toLocaleDateString()} at ${eventData.startTime.toLocaleTimeString()}`;

      return {
        success: true,
        message: `Event "${eventData.title}" has been created successfully ${durationText}`,
        data: data
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to create event', error: error.message };
    }
  }

  async updateEvent(eventId: string, updateData: {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
    location?: string;
  }): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      const updatePayload: any = {};
      if (updateData.title) updatePayload.title = updateData.title;
      if (updateData.description !== undefined) updatePayload.description = updateData.description;
      if (updateData.startTime) updatePayload.start_time = updateData.startTime.toISOString();
      if (updateData.endTime) updatePayload.end_time = updateData.endTime.toISOString();
      if (updateData.location !== undefined) updatePayload.location = updateData.location;

      const { data, error } = await supabase
        .from('events')
        .update(updatePayload)
        .eq('id', eventId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, message: 'Failed to update event', error: error.message };
      }

      return {
        success: true,
        message: `Event "${data.title}" has been updated successfully`,
        data: data
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to update event', error: error.message };
    }
  }

  async deleteEvent(eventId: string): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      // Get event details before deletion
      const { data: eventData, error: fetchError } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        return { success: false, message: 'Event not found', error: fetchError.message };
      }

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, message: 'Failed to delete event', error: error.message };
      }

      return {
        success: true,
        message: `Event "${eventData.title}" has been deleted successfully`
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to delete event', error: error.message };
    }
  }

  async getEvents(filters?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      let query = supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (filters?.startDate) {
        query = query.gte('start_time', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('start_time', filters.endDate.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, message: 'Failed to fetch events', error: error.message };
      }

      return {
        success: true,
        message: `Found ${data.length} events`,
        data: data
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to fetch events', error: error.message };
    }
  }

  async createReminder(reminderData: {
    title: string;
    text?: string;
    remindAt: Date;
  }): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      await useAuthStore.getState().ensureProfile();

      const { data, error } = await supabase.from('reminders').insert({
        user_id: user.id,
        title: reminderData.title,
        text: reminderData.text || '',
        remind_at: reminderData.remindAt.toISOString(),
        completed: false,
      }).select().single();

      if (error) {
        return { success: false, message: 'Failed to create reminder', error: error.message };
      }

      // Schedule notification
      await notificationService.scheduleReminderNotification(
        data.id,
        reminderData.title,
        reminderData.text || reminderData.title,
        reminderData.remindAt
      );

      return {
        success: true,
        message: `Reminder "${reminderData.title}" has been created successfully`,
        data: data
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to create reminder', error: error.message };
    }
  }

  async updateReminder(reminderId: string, updateData: {
    title?: string;
    text?: string;
    remindAt?: Date;
    completed?: boolean;
  }): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      const updatePayload: any = {};
      if (updateData.title) updatePayload.title = updateData.title;
      if (updateData.text !== undefined) updatePayload.text = updateData.text;
      if (updateData.remindAt) updatePayload.remind_at = updateData.remindAt.toISOString();
      if (updateData.completed !== undefined) {
        updatePayload.completed = updateData.completed;
        if (updateData.completed) {
          updatePayload.completed_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from('reminders')
        .update(updatePayload)
        .eq('id', reminderId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, message: 'Failed to update reminder', error: error.message };
      }

      return {
        success: true,
        message: `Reminder "${data.title}" has been updated successfully`,
        data: data
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to update reminder', error: error.message };
    }
  }

  async deleteReminder(reminderId: string): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      // Get reminder details before deletion
      const { data: reminderData, error: fetchError } = await supabase
        .from('reminders')
        .select('title')
        .eq('id', reminderId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        return { success: false, message: 'Reminder not found', error: fetchError.message };
      }

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, message: 'Failed to delete reminder', error: error.message };
      }

      return {
        success: true,
        message: `Reminder "${reminderData.title}" has been deleted successfully`
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to delete reminder', error: error.message };
    }
  }

  async getReminders(filters?: {
    completed?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      let query = supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('remind_at', { ascending: true });

      if (filters?.completed !== undefined) {
        query = query.eq('completed', filters.completed);
      }

      if (filters?.startDate) {
        query = query.gte('remind_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('remind_at', filters.endDate.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, message: 'Failed to fetch reminders', error: error.message };
      }

      return {
        success: true,
        message: `Found ${data.length} reminders`,
        data: data
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to fetch reminders', error: error.message };
    }
  }

  async findEventsByKeywords(searchQuery: string): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      // Search in title, description, and location
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
        .order('start_time', { ascending: true });

      if (error) {
        return { success: false, message: 'Failed to search events', error: error.message };
      }

      return {
        success: true,
        message: `Found ${data.length} events matching "${searchQuery}"`,
        data: data
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to search events', error: error.message };
    }
  }

  async findRemindersByKeywords(searchQuery: string): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      // Search in title and text
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .or(`title.ilike.%${searchQuery}%,text.ilike.%${searchQuery}%`)
        .order('remind_at', { ascending: true });

      if (error) {
        return { success: false, message: 'Failed to search reminders', error: error.message };
      }

      return {
        success: true,
        message: `Found ${data.length} reminders matching "${searchQuery}"`,
        data: data
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to search reminders', error: error.message };
    }
  }

  async findTodaysEventsByKeywords(searchQuery: string): Promise<CalendarResponse> {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        return { success: false, message: 'User not authenticated', error: 'No user found' };
      }

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
        .order('start_time', { ascending: true });

      if (error) {
        return { success: false, message: 'Failed to search today\'s events', error: error.message };
      }

      return {
        success: true,
        message: `Found ${data.length} events today matching "${searchQuery}"`,
        data: data
      };
    } catch (error: any) {
      return { success: false, message: 'Failed to search today\'s events', error: error.message };
    }
  }

  // Helper method to process natural language commands
  async processCommand(command: string): Promise<CalendarResponse> {
    const lowerCommand = command.toLowerCase();
    
    // Simple command parsing - can be enhanced with NLP
    if (lowerCommand.includes('create event') || lowerCommand.includes('schedule meeting')) {
      // Extract event details from command
      // This is a simplified example - in practice, you'd use more sophisticated NLP
      return { success: false, message: 'Please provide event details: title, date, and time' };
    }
    
    if (lowerCommand.includes('show events') || lowerCommand.includes('list events')) {
      return await this.getEvents({ limit: 10 });
    }
    
    if (lowerCommand.includes('create reminder') || lowerCommand.includes('remind me')) {
      return { success: false, message: 'Please provide reminder details: what to remind and when' };
    }
    
    if (lowerCommand.includes('show reminders') || lowerCommand.includes('list reminders')) {
      return await this.getReminders({ completed: false, limit: 10 });
    }
    
    return { success: false, message: 'Command not recognized. Try: "show events", "list reminders", etc.' };
  }
}

export const assistantCalendarService = new AssistantCalendarService();
