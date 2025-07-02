import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Send, MicOff, X, AlertCircle, Calendar, Clock } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/stores/useAuthStore';
import { geminiService } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { speechService } from '@/lib/speech';
import { speechRecognitionService } from '@/lib/speechRecognition';
import { notificationService } from '@/lib/notificationService';
import { assistantCalendarService } from '@/lib/assistantCalendarService';
import * as Notifications from 'expo-notifications';
import type { ChatMessage, GeminiResponse } from '@/types/database';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export default function AssistantTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const { user } = useAuthStore();
  const colors = useColors();

  useEffect(() => {
    loadChatHistory();
    initializeNotifications();
    
    return () => {
      // Clean up speech recognition resources
      speechRecognitionService.destroy();
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      // Initialize notification service
      await notificationService.initialize();
      await notificationService.setupNotificationCategories();

      // Listen for notification responses
      const subscription = Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

      // Listen for foreground notifications
      const foregroundSubscription = Notifications.addNotificationReceivedListener(
        handleForegroundNotification
      );

      return () => {
        subscription.remove();
        foregroundSubscription.remove();
      };
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content;
    const actionIdentifier = response.actionIdentifier;

    if (data.type === 'event_reminder') {
      if (actionIdentifier === 'SNOOZE_5') {
        // Snooze for 5 minutes
        const newTime = new Date(Date.now() + 5 * 60 * 1000);
        await notificationService.scheduleEventReminder(
          String(data.eventId || ''),
          String(data.title || ''),
          newTime,
          0 // No additional delay for snooze
        );
        showInfoModal('Snoozed', 'Event reminder snoozed for 5 minutes');
      } else if (actionIdentifier === 'VIEW_EVENT') {
        // Navigate to calendar - could implement navigation here
        showInfoModal('Event', `Viewing event: ${data.title}`);
      }
    } else if (data.type === 'reminder') {
      if (actionIdentifier === 'MARK_DONE') {
        // Mark reminder as completed
        await assistantCalendarService.updateReminder(String(data.reminderId || ''), { completed: true });
        showInfoModal('Completed', 'Reminder marked as completed');
      } else if (actionIdentifier === 'SNOOZE_REMINDER') {
        // Snooze reminder for 10 minutes
        const newTime = new Date(Date.now() + 10 * 60 * 1000);
        await assistantCalendarService.updateReminder(String(data.reminderId || ''), { remindAt: newTime });
        showInfoModal('Snoozed', 'Reminder snoozed for 10 minutes');
      }
    } else if (data.type === 'assistant_message') {
      if (actionIdentifier === 'REPLY') {
        // Open chat interface with context
        const replyMessage = `Replying to: "${data.body}"`;
        setInputText('');
        // Could add context about what we're replying to
        addSystemMessage(`You can now reply to the assistant message: "${data.body}"`);
      }
    }
  };

  const handleForegroundNotification = (notification: Notifications.Notification) => {
    const { data } = notification.request.content;
    
    // If it's an assistant message, add it to the chat
    if (data.type === 'assistant_message') {
      const assistantMessage: Message = {
        id: generateId(),
        content: `📱 ${notification.request.content.body}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: generateId(),
      content: `ℹ️ ${content}`,
      role: 'assistant',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  const showInfoModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };

  const loadChatHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const formattedMessages: Message[] = data.map((msg) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.created_at),
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const saveMessage = async (content: string, role: 'user' | 'assistant') => {
    if (!user) return;

    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        content,
        role,
      });
    } catch (error) {
      console.error('Error saving message:', error);
      // Continue anyway, don't block the user experience
    }
  };

  const processMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: generateId(),
      content: text,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Save user message
      await saveMessage(text, 'user');

      // Get conversation history
      const history = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Process with Gemini
      const response: GeminiResponse = await geminiService.processUserMessage(text, history);

      const assistantMessage: Message = {
        id: generateId(),
        content: response.responseText,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await saveMessage(response.responseText, 'assistant');

      // Handle intents
      await handleIntent(response);

      // Speak response if enabled
      await speechService.speak(response.responseText, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: generateId(),
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntent = async (response: GeminiResponse) => {
    if (!user) return;

    try {
      // Ensure user profile exists before creating events/reminders
      await useAuthStore.getState().ensureProfile();

      switch (response.intent) {
        case 'create_event':
          await handleCreateEvent(response);
          break;
          
        case 'create_reminder':
        case 'set_reminder':
          await handleCreateReminder(response);
          break;
          
        case 'get_events':
          await handleGetEvents(response);
          break;
          
        case 'get_reminders':
          await handleGetReminders(response);
          break;
          
        case 'update_event':
          await handleUpdateEvent(response);
          break;
          
        case 'delete_event':
          await handleDeleteEvent(response);
          break;
          
        case 'update_reminder':
          await handleUpdateReminder(response);
          break;
          
        case 'delete_reminder':
          await handleDeleteReminder(response);
          break;

        default:
          // No specific intent, just continue with regular conversation
          break;
      }
    } catch (error) {
      console.error('Error handling intent:', error);
      const errorMessage: Message = {
        id: generateId(),
        content: "I encountered an error while processing your request. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleCreateEvent = async (response: GeminiResponse) => {
    if (response.entities.title && response.entities.date) {
      let startTime: Date;
      
      // Handle relative dates like "tomorrow", "today"
      if (response.entities.relativeTime === 'tomorrow') {
        startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);
      } else if (response.entities.relativeTime === 'today') {
        startTime = new Date();
      } else {
        startTime = new Date(response.entities.date);
      }
      
      // Set time if provided, otherwise default to 12:00
      if (response.entities.time) {
        const [hours, minutes] = response.entities.time.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        startTime.setHours(12, 0, 0, 0);
      }

      const eventData = {
        title: response.entities.title,
        description: response.entities.description || '',
        startTime,
        location: response.entities.location || '',
        reminderMinutes: response.entities.reminderMinutes || 15,
      };

      const result = await assistantCalendarService.createEvent(eventData);
      
      if (result.success) {
        const successMessage: Message = {
          id: generateId(),
          content: `✅ ${result.message}`,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
        
        // Send confirmation notification
        await notificationService.sendAssistantMessage(
          'Event Created',
          result.message
        );
      } else {
        const errorMessage: Message = {
          id: generateId(),
          content: `❌ ${result.message}`,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    }
  };

  const handleCreateReminder = async (response: GeminiResponse) => {
    if (response.entities.title && (response.entities.date || response.entities.relativeTime)) {
      let remindAt: Date;
      
      // Handle relative dates
      if (response.entities.relativeTime === 'tomorrow') {
        remindAt = new Date();
        remindAt.setDate(remindAt.getDate() + 1);
      } else if (response.entities.relativeTime === 'today') {
        remindAt = new Date();
      } else if (response.entities.date) {
        remindAt = new Date(response.entities.date);
      } else {
        remindAt = new Date();
      }
      
      // Set time if provided
      if (response.entities.time) {
        const [hours, minutes] = response.entities.time.split(':');
        remindAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      const reminderData = {
        title: response.entities.title,
        text: response.entities.reminderText || response.entities.description || response.entities.title,
        remindAt,
      };

      const result = await assistantCalendarService.createReminder(reminderData);
      
      if (result.success) {
        const successMessage: Message = {
          id: generateId(),
          content: `⏰ ${result.message}`,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        const errorMessage: Message = {
          id: generateId(),
          content: `❌ ${result.message}`,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    }
  };

  const handleGetEvents = async (response: GeminiResponse) => {
    const filters: any = {};
    
    if (response.entities.date) {
      const date = new Date(response.entities.date);
      filters.startDate = new Date(date.setHours(0, 0, 0, 0));
      filters.endDate = new Date(date.setHours(23, 59, 59, 999));
    }
    
    if (response.entities.limit) {
      filters.limit = parseInt(response.entities.limit);
    }

    const result = await assistantCalendarService.getEvents(filters);
    
    if (result.success && result.data) {
      let eventsList = `📅 **Your Events:**\n\n`;
      result.data.forEach((event: any, index: number) => {
        const startTime = new Date(event.start_time);
        eventsList += `${index + 1}. **${event.title}**\n`;
        eventsList += `   📍 ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}\n`;
        if (event.location) eventsList += `   🗺️ ${event.location}\n`;
        if (event.description) eventsList += `   📝 ${event.description}\n`;
        eventsList += '\n';
      });
      
      const eventsMessage: Message = {
        id: generateId(),
        content: eventsList,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, eventsMessage]);
    } else {
      const noEventsMessage: Message = {
        id: generateId(),
        content: result.data?.length === 0 ? "📅 No events found for the specified criteria." : `❌ ${result.message}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, noEventsMessage]);
    }
  };

  const handleGetReminders = async (response: GeminiResponse) => {
    const filters: any = { completed: false };
    
    if (response.entities.limit) {
      filters.limit = parseInt(response.entities.limit);
    }

    const result = await assistantCalendarService.getReminders(filters);
    
    if (result.success && result.data) {
      let remindersList = `⏰ **Your Reminders:**\n\n`;
      result.data.forEach((reminder: any, index: number) => {
        const remindTime = new Date(reminder.remind_at);
        remindersList += `${index + 1}. **${reminder.title}**\n`;
        remindersList += `   ⏰ ${remindTime.toLocaleDateString()} at ${remindTime.toLocaleTimeString()}\n`;
        if (reminder.text && reminder.text !== reminder.title) {
          remindersList += `   📝 ${reminder.text}\n`;
        }
        remindersList += '\n';
      });
      
      const remindersMessage: Message = {
        id: generateId(),
        content: remindersList,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, remindersMessage]);
    } else {
      const noRemindersMessage: Message = {
        id: generateId(),
        content: result.data?.length === 0 ? "⏰ No pending reminders found." : `❌ ${result.message}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, noRemindersMessage]);
    }
  };

  const handleUpdateEvent = async (response: GeminiResponse) => {
    try {
      let searchResults;
      
      // First, find the event(s) to update
      if (response.entities.searchQuery) {
        searchResults = await assistantCalendarService.findEventsByKeywords(response.entities.searchQuery);
      } else if (response.entities.title) {
        searchResults = await assistantCalendarService.findEventsByKeywords(response.entities.title);
      } else {
        // Show today's events if no specific search
        searchResults = await assistantCalendarService.findTodaysEventsByKeywords('');
      }

      if (!searchResults.success || !searchResults.data || searchResults.data.length === 0) {
        const notFoundMessage: Message = {
          id: generateId(),
          content: "❌ No matching events found to update. Please be more specific about which event you'd like to modify.",
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, notFoundMessage]);
        return;
      }

      if (searchResults.data.length > 1) {
        // Multiple events found - ask for clarification
        let eventsList = "🔍 **Found multiple events. Which one would you like to update?**\n\n";
        searchResults.data.forEach((event: any, index: number) => {
          const startTime = new Date(event.start_time);
          eventsList += `${index + 1}. **${event.title}** - ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}\n`;
        });
        eventsList += "\nPlease specify which event you'd like to update by mentioning its title or time.";

        const clarificationMessage: Message = {
          id: generateId(),
          content: eventsList,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, clarificationMessage]);
        return;
      }

      // Single event found - proceed with update
      const eventToUpdate = searchResults.data[0];
      const updateData: any = {};

      if (response.entities.title) updateData.title = response.entities.title;
      if (response.entities.description) updateData.description = response.entities.description;
      if (response.entities.location) updateData.location = response.entities.location;
      
      if (response.entities.time) {
        const [hours, minutes] = response.entities.time.split(':');
        const newStartTime = new Date(eventToUpdate.start_time);
        newStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        updateData.startTime = newStartTime;
      }

      if (response.entities.date) {
        let newStartTime: Date;
        if (response.entities.relativeTime === 'tomorrow') {
          newStartTime = new Date();
          newStartTime.setDate(newStartTime.getDate() + 1);
        } else if (response.entities.relativeTime === 'today') {
          newStartTime = new Date();
        } else {
          newStartTime = new Date(response.entities.date);
        }
        
        // Preserve the original time if no new time specified
        if (!response.entities.time) {
          const originalTime = new Date(eventToUpdate.start_time);
          newStartTime.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
        }
        updateData.startTime = newStartTime;
      }

      const result = await assistantCalendarService.updateEvent(eventToUpdate.id, updateData);
      
      const resultMessage: Message = {
        id: generateId(),
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, resultMessage]);

    } catch (error) {
      console.error('Error updating event:', error);
      const errorMessage: Message = {
        id: generateId(),
        content: "❌ Failed to update event. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleDeleteEvent = async (response: GeminiResponse) => {
    try {
      let searchResults;
      
      // Find the event(s) to delete
      if (response.entities.searchQuery) {
        searchResults = await assistantCalendarService.findEventsByKeywords(response.entities.searchQuery);
      } else if (response.entities.title) {
        searchResults = await assistantCalendarService.findEventsByKeywords(response.entities.title);
      } else {
        const notFoundMessage: Message = {
          id: generateId(),
          content: "❌ Please specify which event you'd like to delete (e.g., 'delete my lunch meeting' or 'cancel my 3pm appointment').",
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, notFoundMessage]);
        return;
      }

      if (!searchResults.success || !searchResults.data || searchResults.data.length === 0) {
        const notFoundMessage: Message = {
          id: generateId(),
          content: "❌ No matching events found to delete. Please check the event title and try again.",
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, notFoundMessage]);
        return;
      }

      if (searchResults.data.length > 1) {
        // Multiple events found - ask for clarification
        let eventsList = "🔍 **Found multiple events. Which one would you like to delete?**\n\n";
        searchResults.data.forEach((event: any, index: number) => {
          const startTime = new Date(event.start_time);
          eventsList += `${index + 1}. **${event.title}** - ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}\n`;
        });
        eventsList += "\nPlease be more specific about which event you'd like to delete.";

        const clarificationMessage: Message = {
          id: generateId(),
          content: eventsList,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, clarificationMessage]);
        return;
      }

      // Single event found - proceed with deletion
      const eventToDelete = searchResults.data[0];
      const result = await assistantCalendarService.deleteEvent(eventToDelete.id);
      
      const resultMessage: Message = {
        id: generateId(),
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, resultMessage]);

    } catch (error) {
      console.error('Error deleting event:', error);
      const errorMessage: Message = {
        id: generateId(),
        content: "❌ Failed to delete event. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleUpdateReminder = async (response: GeminiResponse) => {
    try {
      let searchResults;
      
      // Find the reminder(s) to update
      if (response.entities.searchQuery) {
        searchResults = await assistantCalendarService.findRemindersByKeywords(response.entities.searchQuery);
      } else if (response.entities.title || response.entities.reminderText) {
        const searchTerm = response.entities.title || response.entities.reminderText || '';
        searchResults = await assistantCalendarService.findRemindersByKeywords(searchTerm);
      } else {
        const notFoundMessage: Message = {
          id: generateId(),
          content: "❌ Please specify which reminder you'd like to update.",
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, notFoundMessage]);
        return;
      }

      if (!searchResults.success || !searchResults.data || searchResults.data.length === 0) {
        const notFoundMessage: Message = {
          id: generateId(),
          content: "❌ No matching reminders found to update. Please check the reminder title and try again.",
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, notFoundMessage]);
        return;
      }

      if (searchResults.data.length > 1) {
        // Multiple reminders found - ask for clarification
        let remindersList = "🔍 **Found multiple reminders. Which one would you like to update?**\n\n";
        searchResults.data.forEach((reminder: any, index: number) => {
          const remindTime = new Date(reminder.remind_at);
          remindersList += `${index + 1}. **${reminder.title}** - ${remindTime.toLocaleDateString()} at ${remindTime.toLocaleTimeString()}\n`;
        });
        remindersList += "\nPlease be more specific about which reminder you'd like to update.";

        const clarificationMessage: Message = {
          id: generateId(),
          content: remindersList,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, clarificationMessage]);
        return;
      }

      // Single reminder found - proceed with update
      const reminderToUpdate = searchResults.data[0];
      const updateData: any = {};

      if (response.entities.title) updateData.title = response.entities.title;
      if (response.entities.reminderText) updateData.text = response.entities.reminderText;
      
      if (response.entities.time || response.entities.date) {
        let newRemindTime: Date;
        
        if (response.entities.relativeTime === 'tomorrow') {
          newRemindTime = new Date();
          newRemindTime.setDate(newRemindTime.getDate() + 1);
        } else if (response.entities.relativeTime === 'today') {
          newRemindTime = new Date();
        } else if (response.entities.date) {
          newRemindTime = new Date(response.entities.date);
        } else {
          newRemindTime = new Date(reminderToUpdate.remind_at);
        }
        
        if (response.entities.time) {
          const [hours, minutes] = response.entities.time.split(':');
          newRemindTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        
        updateData.remindAt = newRemindTime;
      }

      const result = await assistantCalendarService.updateReminder(reminderToUpdate.id, updateData);
      
      const resultMessage: Message = {
        id: generateId(),
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, resultMessage]);

    } catch (error) {
      console.error('Error updating reminder:', error);
      const errorMessage: Message = {
        id: generateId(),
        content: "❌ Failed to update reminder. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleDeleteReminder = async (response: GeminiResponse) => {
    try {
      let searchResults;
      
      // Find the reminder(s) to delete
      if (response.entities.searchQuery) {
        searchResults = await assistantCalendarService.findRemindersByKeywords(response.entities.searchQuery);
      } else if (response.entities.title || response.entities.reminderText) {
        const searchTerm = response.entities.title || response.entities.reminderText || '';
        searchResults = await assistantCalendarService.findRemindersByKeywords(searchTerm);
      } else {
        const notFoundMessage: Message = {
          id: generateId(),
          content: "❌ Please specify which reminder you'd like to delete.",
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, notFoundMessage]);
        return;
      }

      if (!searchResults.success || !searchResults.data || searchResults.data.length === 0) {
        const notFoundMessage: Message = {
          id: generateId(),
          content: "❌ No matching reminders found to delete. Please check the reminder title and try again.",
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, notFoundMessage]);
        return;
      }

      if (searchResults.data.length > 1) {
        // Multiple reminders found - ask for clarification
        let remindersList = "🔍 **Found multiple reminders. Which one would you like to delete?**\n\n";
        searchResults.data.forEach((reminder: any, index: number) => {
          const remindTime = new Date(reminder.remind_at);
          remindersList += `${index + 1}. **${reminder.title}** - ${remindTime.toLocaleDateString()} at ${remindTime.toLocaleTimeString()}\n`;
        });
        remindersList += "\nPlease be more specific about which reminder you'd like to delete.";

        const clarificationMessage: Message = {
          id: generateId(),
          content: remindersList,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, clarificationMessage]);
        return;
      }

      // Single reminder found - proceed with deletion
      const reminderToDelete = searchResults.data[0];
      const result = await assistantCalendarService.deleteReminder(reminderToDelete.id);
      
      const resultMessage: Message = {
        id: generateId(),
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, resultMessage]);

    } catch (error) {
      console.error('Error deleting reminder:', error);
      const errorMessage: Message = {
        id: generateId(),
        content: "❌ Failed to delete reminder. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleSend = () => {
    processMessage(inputText);
    setInputText('');
  };

  const startListening = () => {
    if (!speechRecognitionService.isAvailable()) {
      showInfoModal('Voice Input', 'Voice input is not available on your device. Please type your message.');
      return;
    }

    setIsListening(true);
    
    speechRecognitionService.startListening({
      onSpeechStart: () => {
        console.log('Speech recognition started');
      },
      onSpeechResults: (text) => {
        setInputText(text);
      },
      onSpeechError: (error) => {
        console.error('Speech recognition error:', error);
        showInfoModal('Error', 'Failed to recognize speech. Please try again or type your message.');
        setIsListening(false);
      },
      onSpeechEnd: () => {
        setIsListening(false);
      },
    }).catch(error => {
      console.error('Failed to start speech recognition:', error);
      showInfoModal('Error', 'Failed to start speech recognition. Please try again.');
      setIsListening(false);
    });
  };
  
  const stopListening = () => {
    if (isListening) {
      speechRecognitionService.stopListening();
      setIsListening(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.foreground,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.mutedForeground,
      marginTop: 4,
    },
    messagesContainer: {
      flex: 1,
      padding: 16,
    },
    messageContainer: {
      marginBottom: 16,
      maxWidth: '80%',
    },
    userMessage: {
      alignSelf: 'flex-end',
    },
    assistantMessage: {
      alignSelf: 'flex-start',
    },
    messageBubble: {
      padding: 12,
      borderRadius: 16,
    },
    userBubble: {
      backgroundColor: colors.primary,
    },
    assistantBubble: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
    },
    userText: {
      color: colors.primaryForeground,
    },
    assistantText: {
      color: colors.cardForeground,
    },
    timestamp: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'flex-end',
    },
    textInput: {
      flex: 1,
      borderRadius: 20,
      backgroundColor: colors.input,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginRight: 8,
      maxHeight: 100,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    micButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    listeningButton: {
      backgroundColor: colors.error,
    },
    loadingText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontStyle: 'italic',
      textAlign: 'center',
      marginVertical: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.cardForeground,
    },
    closeButton: {
      padding: 4,
    },
    modalIcon: {
      marginBottom: 16,
    },
    modalMessage: {
      fontSize: 16,
      color: colors.cardForeground,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    modalButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 32,
      minWidth: 100,
      alignItems: 'center',
    },
    modalButtonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: '600',
    },
    quickActionsContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quickActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionText: {
      fontSize: 12,
      color: colors.foreground,
      marginLeft: 4,
      fontWeight: '500',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aura Assistant</Text>
        <Text style={styles.headerSubtitle}>
          How can I help you today?
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.role === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {message.content}
              </Text>
            </View>
            <Text style={styles.timestamp}>
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        ))}
        
        {isLoading && (
          <Text style={styles.loadingText}>Aura is thinking...</Text>
        )}
      </ScrollView>

      {/* Quick Action Buttons */}
      <View style={styles.quickActionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => processMessage("Show my events today")}
          >
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.quickActionText}>Today's Events</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => processMessage("Show my reminders")}
          >
            <Clock size={16} color={colors.primary} />
            <Text style={styles.quickActionText}>Reminders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setInputText("Create an event for ")}
          >
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.quickActionText}>New Event</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setInputText("Remind me to ")}
          >
            <Clock size={16} color={colors.primary} />
            <Text style={styles.quickActionText}>New Reminder</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your message..."
          placeholderTextColor={colors.mutedForeground}
          value={inputText}
          onChangeText={setInputText}
          multiline
          onSubmitEditing={handleSend}
        />
        
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.listeningButton]}
          onPress={isListening ? stopListening : startListening}
          disabled={isLoading}
        >
          {isListening ? (
            <MicOff size={20} color={colors.primaryForeground} />
          ) : (
            <Mic size={20} color={colors.primaryForeground} />
          )}
        </TouchableOpacity>

        {inputText.trim() ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={isLoading}
          >
            <Send size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Custom Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <X size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              <AlertCircle size={48} color={colors.primary} />
            </View>

            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
