import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'event_reminder' | 'event_upcoming' | 'reminder' | 'assistant_message';
  eventId?: string;
  reminderId?: string;
  title: string;
  body: string;
  conversationId?: string;
  [key: string]: any; // Add index signature for compatibility
}

class NotificationService {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
        });

        await Notifications.setNotificationChannelAsync('assistant', {
          name: 'Assistant Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  async scheduleEventReminder(eventId: string, title: string, startTime: Date, reminderMinutes: number = 15) {
    try {
      await this.initialize();

      const reminderTime = new Date(startTime.getTime() - reminderMinutes * 60 * 1000);
      
      // Don't schedule if the reminder time is in the past
      if (reminderTime <= new Date()) return;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Upcoming Event: ${title}`,
          body: `Your event "${title}" starts in ${reminderMinutes} minutes`,
          data: {
            type: 'event_reminder',
            eventId,
            title,
            body: `Your event "${title}" starts in ${reminderMinutes} minutes`,
            reminderMinutes,
          } as NotificationData,
          categoryIdentifier: 'event_reminder',
        },
        trigger: { date: reminderTime } as any,
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule event reminder:', error);
      return null;
    }
  }

  async scheduleReminderNotification(reminderId: string, title: string, text: string, remindAt: Date) {
    try {
      await this.initialize();

      // Don't schedule if the reminder time is in the past
      if (remindAt <= new Date()) return;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Reminder: ${title}`,
          body: text || title,
          data: {
            type: 'reminder',
            reminderId,
            title,
            body: text,
          } as NotificationData,
          categoryIdentifier: 'reminder',
        },
        trigger: { date: remindAt } as any,
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule reminder notification:', error);
      return null;
    }
  }

  async sendAssistantMessage(title: string, body: string, conversationId?: string) {
    try {
      await this.initialize();

      await Notifications.presentNotificationAsync({
        title,
        body,
        data: {
          type: 'assistant_message',
          title,
          body,
          conversationId,
        } as NotificationData,
        categoryIdentifier: 'assistant_message',
      });
    } catch (error) {
      console.error('Failed to send assistant message:', error);
    }
  }

  async cancelNotification(identifier: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  // Setup notification categories with actions
  async setupNotificationCategories() {
    try {
      await Notifications.setNotificationCategoryAsync('event_reminder', [
        {
          identifier: 'SNOOZE_5',
          buttonTitle: 'Snooze 5min',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'VIEW_EVENT',
          buttonTitle: 'View Event',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('reminder', [
        {
          identifier: 'MARK_DONE',
          buttonTitle: 'Mark Done',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SNOOZE_REMINDER',
          buttonTitle: 'Snooze',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('assistant_message', [
        {
          identifier: 'REPLY',
          buttonTitle: 'Reply',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'DISMISS',
          buttonTitle: 'Dismiss',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to setup notification categories:', error);
    }
  }
}

export const notificationService = new NotificationService();
