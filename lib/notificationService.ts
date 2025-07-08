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
  type: 'event_reminder' | 'event_upcoming' | 'reminder' | 'assistant_message' | 'scheduling_success';
  eventId?: string;
  reminderId?: string;
  title: string;
  body: string;
  conversationId?: string;
  scheduledTime?: string;
  originalTime?: string;
  [key: string]: any; // Add index signature for compatibility
}

class NotificationService {
  private isInitialized = false;
  private notificationListeners: { remove: () => void }[] = [];

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // Configure notification channels for Android
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

        await Notifications.setNotificationChannelAsync('events', {
          name: 'Events',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });

        await Notifications.setNotificationChannelAsync('scheduling', {
          name: 'Scheduling Confirmations',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 100, 100],
          lightColor: '#10B981',
        });

        await Notifications.setNotificationChannelAsync('assistant', {
          name: 'Assistant Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });
      }

      // Setup notification listeners
      this.setupNotificationListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  setupNotificationListeners() {
    // Listen for notification responses (when user taps action buttons)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );
    
    // Listen for notifications received while app is in foreground
    const receivedListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    this.notificationListeners.push(responseListener, receivedListener);
  }

  async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { notification, actionIdentifier } = response;
    const data = notification.request.content.data as NotificationData;

    console.log('Notification response:', { actionIdentifier, data });

    try {
      switch (actionIdentifier) {
        case 'MARK_AS_READ':
          await this.markAsRead(data);
          break;
        case 'SNOOZE_5':
          await this.snoozeNotification(data, 5);
          break;
        case 'SNOOZE_10':
          await this.snoozeNotification(data, 10);
          break;
        case 'SNOOZE_REMINDER':
          await this.snoozeNotification(data, 10);
          break;
        case 'MARK_DONE':
          await this.markReminderDone(data);
          break;
        case 'VIEW_EVENT':
          // Handle viewing event - could navigate to calendar
          break;
        default:
          // Default tap action - open app
          break;
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  async handleNotificationReceived(notification: Notifications.Notification) {
    const data = notification.request.content.data as NotificationData;
    console.log('Notification received while app is open:', data);
  }

  async markAsRead(data: NotificationData) {
    try {
      if (data.eventId) {
        // Mark event as read in database
        await supabase
          .from('events')
          .update({ read_at: new Date().toISOString() })
          .eq('id', data.eventId);
      } else if (data.reminderId) {
        // Mark reminder as read in database
        await supabase
          .from('reminders')
          .update({ read_at: new Date().toISOString() })
          .eq('id', data.reminderId);
      }
      
      // Show confirmation
      await this.showSchedulingSuccess('Marked as read', '✓ Notification marked as read');
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  async markReminderDone(data: NotificationData) {
    try {
      if (data.reminderId) {
        await supabase
          .from('reminders')
          .update({ 
            completed: true, 
            completed_at: new Date().toISOString() 
          })
          .eq('id', data.reminderId);
        
        await this.showSchedulingSuccess('Reminder completed', '✓ Reminder marked as done');
      }
    } catch (error) {
      console.error('Error marking reminder as done:', error);
    }
  }

  async snoozeNotification(data: NotificationData, minutes: number) {
    try {
      const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
      
      if (data.eventId) {
        await this.scheduleEventReminder(data.eventId, data.title, snoozeTime, 0);
      } else if (data.reminderId) {
        await this.scheduleReminderNotification(data.reminderId, data.title, data.body, snoozeTime);
      }
      
      await this.showSchedulingSuccess(
        `Snoozed for ${minutes} minutes`, 
        `You'll be reminded again at ${snoozeTime.toLocaleTimeString()}`
      );
    } catch (error) {
      console.error('Error snoozing notification:', error);
    }
  }

  // Show immediate feedback when something is scheduled
  async showSchedulingSuccess(title: string, message: string, scheduledTime?: Date) {
    try {
      await this.initialize();

      let body = message;
      if (scheduledTime) {
        const timeStr = scheduledTime.toLocaleString();
        body = `${message}\nScheduled for: ${timeStr}`;
      }

      await Notifications.presentNotificationAsync({
        title,
        body,
        data: {
          type: 'scheduling_success',
          title,
          body,
          scheduledTime: scheduledTime?.toISOString(),
        } as NotificationData,
        categoryIdentifier: 'scheduling_success',
      });
    } catch (error) {
      console.error('Failed to show scheduling success:', error);
    }
  }

  async scheduleEventReminder(eventId: string, title: string, startTime: Date, reminderMinutes: number = 15) {
    try {
      await this.initialize();

      const reminderTime = new Date(startTime.getTime() - reminderMinutes * 60 * 1000);
      
      // Don't schedule if the reminder time is in the past
      if (reminderTime <= new Date()) {
        console.warn('Cannot schedule event reminder in the past');
        return null;
      }

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
            originalTime: startTime.toISOString(),
          } as NotificationData,
          categoryIdentifier: 'event_reminder',
        },
        trigger: { date: reminderTime } as any,
      });

      // Show immediate confirmation
      await this.showSchedulingSuccess(
        'Event Reminder Scheduled',
        `You'll be reminded ${reminderMinutes} minutes before "${title}"`,
        reminderTime
      );

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
      if (remindAt <= new Date()) {
        console.warn('Cannot schedule reminder in the past');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Reminder: ${title}`,
          body: text || title,
          data: {
            type: 'reminder',
            reminderId,
            title,
            body: text,
            originalTime: remindAt.toISOString(),
          } as NotificationData,
          categoryIdentifier: 'reminder',
        },
        trigger: { date: remindAt } as any,
      });

      // Show immediate confirmation
      await this.showSchedulingSuccess(
        'Reminder Scheduled',
        `"${title}" reminder has been set`,
        remindAt
      );

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
      // Event reminder category with "Mark as read" and "Snooze" actions
      await Notifications.setNotificationCategoryAsync('event_reminder', [
        {
          identifier: 'MARK_AS_READ',
          buttonTitle: 'Mark as Read',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SNOOZE_5',
          buttonTitle: 'Snooze 5min',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      // Reminder category with "Mark as read", "Mark done", and "Snooze" actions
      await Notifications.setNotificationCategoryAsync('reminder', [
        {
          identifier: 'MARK_AS_READ',
          buttonTitle: 'Mark as Read',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'MARK_DONE',
          buttonTitle: 'Mark Done',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SNOOZE_10',
          buttonTitle: 'Snooze 10min',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      // Scheduling success category (no actions needed)
      await Notifications.setNotificationCategoryAsync('scheduling_success', []);

      // Assistant message category
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

  // Cleanup method
  cleanup() {
    this.notificationListeners.forEach(listener => listener.remove());
    this.notificationListeners = [];
  }
}

export const notificationService = new NotificationService();
