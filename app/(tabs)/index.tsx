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
  Clipboard,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Send, MicOff, X, AlertCircle, Calendar, Clock, Copy, Edit3, Trash2, CheckCircle, XCircle, Info } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/stores/useAuthStore';
import { geminiService } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { speechService } from '@/lib/speech';
import { speechRecognitionService } from '@/lib/speechRecognition';
import { notificationService } from '@/lib/notificationService';
import { assistantCalendarService } from '@/lib/assistantCalendarService';
import * as Notifications from 'expo-notifications';
import type { GeminiResponse } from '@/types/database';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isVoiceMessage?: boolean;
}

export default function AssistantTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showMessageActions, setShowMessageActions] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<any>(null);
  const [recordingTranscript, setRecordingTranscript] = useState('');
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [screenDimensions, setScreenDimensions] = useState(() => Dimensions.get('window'));
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const { user } = useAuthStore();
  const colors = useColors();
  
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = screenDimensions;
  const isTablet = screenWidth > 768;
  const isLargeScreen = screenWidth > 1024;
  const isPhonePortrait = screenWidth < 480 && screenHeight > screenWidth;
  const isPhoneLandscape = screenWidth >= 480 && screenWidth < 768 && screenWidth > screenHeight;

  useEffect(() => {
    loadChatHistory();
    loadUserProfile();
    initializeNotifications();
    
    // Listen for dimension changes (orientation, etc.)
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      // Update screen dimensions to trigger re-render with new responsive values
      setScreenDimensions(window);
    });
    
    return () => {
      // Clean up speech recognition resources
      if (speechRecognitionService && typeof speechRecognitionService.destroy === 'function') {
        speechRecognitionService.destroy();
      }
      
      // Clean up recording timer
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      
      // Clean up dimension listener
      subscription?.remove();
    };
  }, []);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

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
        // const replyMessage = `Replying to: "${data.body}"`;
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

  const getModalIconAndColor = (title: string) => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('success') || lowerTitle.includes('completed') || lowerTitle.includes('created') || lowerTitle.includes('updated') || lowerTitle.includes('saved')) {
      return { icon: CheckCircle, color: colors.success || '#22c55e' };
    } else if (lowerTitle.includes('error') || lowerTitle.includes('failed') || lowerTitle.includes('delete')) {
      return { icon: XCircle, color: colors.destructive || '#ef4444' };
    } else if (lowerTitle.includes('warning') || lowerTitle.includes('disabled')) {
      return { icon: AlertCircle, color: colors.warning || '#f59e0b' };
    } else {
      return { icon: Info, color: colors.primary };
    }
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

  const processMessage = async (text: string, isVoiceInput = false) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: generateId(),
      content: text,
      role: 'user',
      timestamp: new Date(),
      isVoiceMessage: isVoiceInput,
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
      
      // Debug: Log the complete Gemini response
      console.log('=== GEMINI RESPONSE DEBUG ===');
      console.log('User input:', text);
      console.log('Intent:', response.intent);
      console.log('Entities:', JSON.stringify(response.entities, null, 2));
      console.log('Response text:', response.responseText);
      console.log('============================');

      // Check if this is an action intent that will generate its own response
      const actionIntents = ['create_event', 'create_reminder', 'set_reminder', 'get_events', 'get_reminders', 
                           'update_event', 'delete_event', 'update_reminder', 'delete_reminder'];
      const isActionIntent = actionIntents.includes(response.intent);

      // Only add AI response message for non-action intents
      if (!isActionIntent) {
        const assistantMessage: Message = {
          id: generateId(),
          content: response.responseText,
          role: 'assistant',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        await saveMessage(response.responseText, 'assistant');
      }

      // Handle intents (this will add specific messages for action intents)
      await handleIntent(response);

      // For voice output, clean the text from markdown
      const responseTextForSpeech = isActionIntent ? 
        (response.responseText || "Action completed") : response.responseText;
      
      const cleanResponseForSpeech = responseTextForSpeech
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/`(.*?)`/g, '$1') // Remove code markdown
        .replace(/#{1,6}\s/g, '') // Remove heading markdown
        .trim();

      // Check if voice assistant is enabled and if this was a voice input or user prefers voice responses
      const shouldSpeak = profile?.settings?.voice_enabled !== false && 
                         (isVoiceInput || profile?.settings?.always_voice_response === true);

      if (shouldSpeak) {
        try {
          await speechService.speak(cleanResponseForSpeech, {
            language: 'en',
            pitch: 1.0,
            rate: 0.9,
          });
        } catch (speechError) {
          console.error('Error with text-to-speech:', speechError);
          // Don't show error to user for TTS failures, just log it
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: generateId(),
        content: "I&apos;m sorry, I encountered an error processing your request. Please try again.",
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
    console.log('Creating event with response:', JSON.stringify(response.entities, null, 2));
    
    // Add explicit debug for the exact case user is testing
    if (response.entities.title === "Project deadline") {
      console.log('🔍 SPECIFIC DEBUG FOR PROJECT DEADLINE:');
      console.log('multiDay:', response.entities.multiDay);
      console.log('dateRange:', response.entities.dateRange);
      console.log('date:', response.entities.date);
      console.log('relativeTime:', response.entities.relativeTime);
    }
    
    if (response.entities.title && (response.entities.date || response.entities.multiDay || response.entities.dateRange)) {
      let startTime: Date;
      let endTime: Date | undefined;
      
      // Handle multi-day events with date ranges FIRST
      if (response.entities.multiDay && response.entities.dateRange) {
        const today = new Date();
        console.log('Processing multi-day event with dateRange:', response.entities.dateRange);
        
        switch (response.entities.dateRange) {
          case 'this_week':
            // Start from Monday of current week
            const mondayThisWeek = new Date(today);
            mondayThisWeek.setDate(today.getDate() - today.getDay() + 1);
            startTime = mondayThisWeek;
            // End on Sunday
            endTime = new Date(mondayThisWeek);
            endTime.setDate(mondayThisWeek.getDate() + 6);
            console.log('This week dates:', { start: startTime, end: endTime });
            break;
            
          case 'next_week':
            // Start from Monday of next week
            const mondayNextWeek = new Date(today);
            mondayNextWeek.setDate(today.getDate() - today.getDay() + 8);
            startTime = mondayNextWeek;
            // End on Sunday
            endTime = new Date(mondayNextWeek);
            endTime.setDate(mondayNextWeek.getDate() + 6);
            console.log('Next week dates:', { start: startTime, end: endTime });
            break;
            
          case 'next_3_weeks':
            startTime = new Date(today);
            startTime.setDate(today.getDate() + 1); // Start tomorrow
            endTime = new Date(startTime);
            endTime.setDate(startTime.getDate() + 21); // 3 weeks later
            console.log('Next 3 weeks dates:', { start: startTime, end: endTime });
            break;
            
          case 'this_month':
            startTime = new Date(today.getFullYear(), today.getMonth(), 1);
            endTime = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            console.log('This month dates:', { start: startTime, end: endTime });
            break;
            
          case 'next_month':
            startTime = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            endTime = new Date(today.getFullYear(), today.getMonth() + 2, 0);
            console.log('Next month dates:', { start: startTime, end: endTime });
            break;
            
          default:
            // Use provided endDate if available
            if (response.entities.endDate) {
              startTime = response.entities.date ? new Date(response.entities.date) : new Date();
              endTime = new Date(response.entities.endDate);
              console.log('Using provided dates:', { start: startTime, end: endTime });
            } else {
              // Fallback to single day from current date
              startTime = response.entities.date ? new Date(response.entities.date) : new Date();
              console.log('Fallback to single day:', startTime);
            }
        }
      } else {
        // Handle single-day events or relative dates
        if (response.entities.relativeTime === 'tomorrow') {
          startTime = new Date();
          startTime.setDate(startTime.getDate() + 1);
        } else if (response.entities.relativeTime === 'today') {
          startTime = new Date();
        } else if (response.entities.date) {
          startTime = new Date(response.entities.date);
        } else {
          // Default to today if no date is provided
          startTime = new Date();
        }
        console.log('Single day event date:', startTime);
      }
      
      // Set time if provided, otherwise default to 12:00 for single-day events
      if (response.entities.time && !response.entities.multiDay) {
        const [hours, minutes] = response.entities.time.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else if (!response.entities.multiDay) {
        startTime.setHours(12, 0, 0, 0);
      }

      const eventData = {
        title: response.entities.title,
        description: response.entities.description || '',
        startTime,
        endTime,
        location: response.entities.location || '',
        reminderMinutes: response.entities.reminderMinutes || (response.entities.multiDay ? undefined : 15),
        multiDay: response.entities.multiDay || false,
        dateRange: response.entities.dateRange,
      };

      console.log('Final event data:', eventData);

      const result = await assistantCalendarService.createEvent(eventData);
      
      console.log('Calendar service result:', result);
      
      if (result.success) {
        const successMessage: Message = {
          id: generateId(),
          content: `✅ ${result.message}`,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
        
        // Save the success message to database
        await saveMessage(successMessage.content, 'assistant');
        
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
        
        // Save the error message to database
        await saveMessage(errorMessage.content, 'assistant');
      }
    } else {
      // Handle case where required fields are missing
      console.log('Event creation failed - missing required fields:', {
        title: response.entities.title,
        date: response.entities.date,
        multiDay: response.entities.multiDay,
        dateRange: response.entities.dateRange
      });
      
      const errorMessage: Message = {
        id: generateId(),
        content: `❌ Unable to create event. Please provide at least a title and when you want the event to be scheduled.`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Save the error message to database
      await saveMessage(errorMessage.content, 'assistant');
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
        
        // Save the success message to database
        await saveMessage(successMessage.content, 'assistant');
      } else {
        const errorMessage: Message = {
          id: generateId(),
          content: `❌ ${result.message}`,
          role: 'assistant',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        
        // Save the error message to database
        await saveMessage(errorMessage.content, 'assistant');
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
    
    if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
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
      
      // Save the events list message to database
      await saveMessage(eventsList, 'assistant');
    } else {
      const noEventsMessage: Message = {
        id: generateId(),
        content: result.success ? "📅 No events found for the specified criteria." : `❌ ${result.message}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, noEventsMessage]);
      
      // Save the no events message to database
      await saveMessage(noEventsMessage.content, 'assistant');
    }
  };

  const handleGetReminders = async (response: GeminiResponse) => {
    const filters: any = { completed: false };
    
    if (response.entities.limit) {
      filters.limit = parseInt(response.entities.limit);
    }

    const result = await assistantCalendarService.getReminders(filters);
    
    if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
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
      
      // Save the reminders list message to database
      await saveMessage(remindersList, 'assistant');
    } else {
      const noRemindersMessage: Message = {
        id: generateId(),
        content: result.success ? "⏰ No reminders found." : `❌ ${result.message}`,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, noRemindersMessage]);
      
      // Save the no reminders message to database
      await saveMessage(noRemindersMessage.content, 'assistant');
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
    processMessage(inputText, false);
    setInputText('');
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startListening = async () => {
    console.log('Starting voice recognition...');
    console.log('Platform:', Platform.OS);
    console.log('speechRecognitionService available:', !!speechRecognitionService);
    
    // Check if voice assistant is enabled
    if (profile?.settings?.voice_enabled === false) {
      showInfoModal('Voice Disabled', 'Voice assistant is disabled in settings. Please enable it in Settings > Voice Assistant.');
      return;
    }

    // Check if speechRecognitionService is available
    if (!speechRecognitionService) {
      console.error('speechRecognitionService is undefined');
      showInfoModal('Voice Input', 'Voice recognition service is not available. Please type your message.');
      return;
    }

    if (typeof speechRecognitionService.isAvailable !== 'function') {
      console.error('speechRecognitionService.isAvailable is not a function');
      showInfoModal('Voice Input', 'Voice recognition service is not properly initialized. Please type your message.');
      return;
    }

    const isAvailable = speechRecognitionService.isAvailable();
    console.log('Speech recognition available:', isAvailable);
    
    if (!isAvailable) {
      showInfoModal('Voice Input', 'Voice input is not available on your device. Please type your message.');
      return;
    }

    setIsListening(true);
    setRecordingTime(0);
    setRecordingTranscript('');
    setShowRecordingModal(true);
    startPulseAnimation();
    
    // Start recording timer
    const timer = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    setRecordingTimer(timer);
    
    try {
      console.log('Attempting to start speech recognition...');
      await speechRecognitionService.startListening({
        onSpeechStart: () => {
          console.log('Speech recognition started successfully');
        },
        onSpeechResults: (text: string) => {
          console.log('Speech recognition result:', text);
          setRecordingTranscript(text);
        },
        onSpeechError: (error: string) => {
          console.error('Speech recognition error:', error);
          let errorMessage = 'Failed to start speech recognition. Please try again or type your message.';
          
          if (error.toLowerCase().includes('permission')) {
            errorMessage = 'Microphone permission denied. Please enable microphone access in your device settings.';
          } else if (error.toLowerCase().includes('network')) {
            errorMessage = 'Network error during speech recognition. Please check your internet connection.';
          } else if (error.toLowerCase().includes('no match')) {
            errorMessage = 'Could not understand the speech. Please try speaking more clearly.';
          }
          
          showInfoModal('Speech Recognition Error', errorMessage);
          stopListening(false);
        },
        onSpeechEnd: () => {
          // Don't auto-process here, let user control when to send
          console.log('Speech recognition ended');
        },
      });
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      showInfoModal('Error', `Failed to start speech recognition: ${error}. Please check microphone permissions.`);
      stopListening(false);
    }
  };
  
  const stopListening = async (sendMessage = true) => {
    setIsListening(false);
    setShowRecordingModal(false);
    stopPulseAnimation();
    
    // Clear recording timer
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
    
    if (speechRecognitionService && typeof speechRecognitionService.stopListening === 'function') {
      speechRecognitionService.stopListening();
    }
    
    if (sendMessage && recordingTranscript.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: recordingTranscript.trim(),
        role: 'user' as const,
        timestamp: new Date(),
        isVoiceMessage: true,
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Save to database
      if (user) {
        await saveMessage(userMessage.content, 'user');
      }
      
      // Process the message and get AI response with voice
      await processMessage(recordingTranscript.trim(), true);
    }
    
    setRecordingTime(0);
    setRecordingTranscript('');
  };

  const cancelRecording = () => {
    setIsListening(false);
    setShowRecordingModal(false);
    stopPulseAnimation();
    
    // Clear recording timer
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
    
    if (speechRecognitionService && typeof speechRecognitionService.stopListening === 'function') {
      speechRecognitionService.stopListening();
    }
    
    setRecordingTime(0);
    setRecordingTranscript('');
  };

  const copyMessage = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      await Clipboard.setString(message.content);
      showInfoModal('Copied', 'Message copied to clipboard');
    }
    setShowMessageActions(null);
  };

  const startEditMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.role === 'user') {
      setEditingMessage(messageId);
      setEditText(message.content);
      setShowMessageActions(null);
    }
  };

  const saveEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessage 
          ? { ...msg, content: editText.trim() }
          : msg
      ));

      await supabase
        .from('chat_messages')
        .update({ content: editText.trim() })
        .eq('id', editingMessage);

      setEditingMessage(null);
      setEditText('');
      
      showInfoModal('Updated', 'Message updated successfully');
    } catch (error) {
      console.error('Error updating message:', error);
      showInfoModal('Error', 'Failed to update message');
    }
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const renderMarkdownText = (text: string, textStyle: any) => {
    // Safety check for text
    if (!text || typeof text !== 'string') {
      return text || '';
    }

    // Split text by markdown patterns and render accordingly
    const parts = [];
    let lastIndex = 0;
    
    // Regex to match **bold**, *italic*, and `code` patterns
    const markdownRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
    let match;
    
    while ((match = markdownRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push(
            <Text key={`text-${lastIndex}`} style={textStyle}>
              {beforeText}
            </Text>
          );
        }
      }
      
      // Add the formatted text
      if (match[2]) {
        // Bold text (**text**)
        parts.push(
          <Text key={`bold-${match.index}`} style={[textStyle, { fontWeight: 'bold' }]}>
            {match[2]}
          </Text>
        );
      } else if (match[3]) {
        // Italic text (*text*)
        parts.push(
          <Text key={`italic-${match.index}`} style={[textStyle, { fontStyle: 'italic' }]}>
            {match[3]}
          </Text>
        );
      } else if (match[4]) {
        // Code text (`text`)
        parts.push(
          <Text key={`code-${match.index}`} style={[textStyle, { 
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            backgroundColor: colors.muted,
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 4,
            fontSize: (textStyle.fontSize || 16) - 1
          }]}>
            {match[4]}
          </Text>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={textStyle}>
            {remainingText}
          </Text>
        );
      }
    }
    
    // If no markdown was found, return the original text with proper styling
    if (parts.length === 0) {
      return (
        <Text style={textStyle}>
          {text}
        </Text>
      );
    }
    
    return parts;
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const messageToDelete = messages.find(msg => msg.id === messageId);
      if (!messageToDelete) return;

      let messagesToDelete = [messageId];

      // If deleting a user message, also delete the AI response that follows
      if (messageToDelete.role === 'user') {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex !== -1 && messageIndex < messages.length - 1) {
          const nextMessage = messages[messageIndex + 1];
          if (nextMessage.role === 'assistant') {
            messagesToDelete.push(nextMessage.id);
          }
        }
      }

      // If deleting an assistant message, also delete the user message that preceded it
      if (messageToDelete.role === 'assistant') {
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex > 0) {
          const prevMessage = messages[messageIndex - 1];
          if (prevMessage.role === 'user') {
            messagesToDelete.push(prevMessage.id);
          }
        }
      }

      // Remove from state first (optimistic update)
      setMessages(prev => prev.filter(msg => !messagesToDelete.includes(msg.id)));

      // Remove from database
      if (user) {
        await supabase
          .from('chat_messages')
          .delete()
          .in('id', messagesToDelete);
      }

      setShowMessageActions(null);
      const deletedCount = messagesToDelete.length;
      
      if (deletedCount > 1) {
        showInfoModal('Deleted', `User message and assistant response deleted successfully`);
      } else {
        showInfoModal('Deleted', 'Message deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      showInfoModal('Error', 'Failed to delete message');
      
      // Reload messages from database on error to revert optimistic update
      loadChatHistory();
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
      paddingHorizontal: isTablet ? 24 : 16,
      paddingTop: isTablet ? 24 : 16,
      paddingBottom: isTablet ? 24 : 16,
    },
    messageContainer: {
      marginBottom: isTablet ? 20 : 16,
      maxWidth: isLargeScreen ? '55%' : isTablet ? '65%' : '80%',
      minWidth: isLargeScreen ? '20%' : isTablet ? '25%' : '35%',
      width: 'auto',
      flexShrink: 1,
      minHeight: isTablet ? 52 : 44,
      justifyContent: 'center',
    },
    userMessage: {
      alignSelf: 'flex-end',
    },
    assistantMessage: {
      alignSelf: 'flex-start',
    },
    messageBubble: {
      padding: isLargeScreen ? 24 : isTablet ? 20 : 16,
      borderRadius: isLargeScreen ? 28 : isTablet ? 24 : 20,
      flex: 1,
      maxWidth: '100%',
      minHeight: isLargeScreen ? 60 : isTablet ? 52 : 44,
      minWidth: isLargeScreen ? 100 : isTablet ? 80 : 60,
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    userBubble: {
      backgroundColor: colors.primary,
      marginLeft: isLargeScreen ? 60 : isTablet ? 40 : 20,
    },
    assistantBubble: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: isLargeScreen ? 60 : isTablet ? 40 : 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    messageText: {
      fontSize: isLargeScreen ? 20 : isTablet ? 18 : 16,
      lineHeight: isLargeScreen ? 32 : isTablet ? 28 : 24,
      flexWrap: 'wrap',
      flexShrink: 1,
      textAlign: 'left',
      minHeight: isLargeScreen ? 32 : isTablet ? 28 : 24,
      letterSpacing: 0.2,
    },
    userText: {
      color: colors.primaryForeground,
    },
    assistantText: {
      color: colors.cardForeground,
    },
    timestamp: {
      fontSize: isLargeScreen ? 16 : isTablet ? 14 : isPhoneLandscape ? 11 : 12,
      color: colors.mutedForeground,
      marginTop: isLargeScreen ? 12 : isTablet ? 8 : isPhoneLandscape ? 3 : 4,
      paddingHorizontal: isLargeScreen ? 24 : isTablet ? 20 : isPhoneLandscape ? 14 : 16,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: isTablet ? 20 : 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'flex-end',
      maxWidth: isLargeScreen ? 800 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    textInput: {
      flex: 1,
      borderRadius: isTablet ? 24 : 20,
      backgroundColor: colors.input,
      paddingHorizontal: isTablet ? 20 : 16,
      paddingVertical: isTablet ? 16 : 12,
      marginRight: isTablet ? 12 : 8,
      maxHeight: isTablet ? 120 : 100,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: isTablet ? 18 : 16,
    },
    micButton: {
      width: isTablet ? 52 : 44,
      height: isTablet ? 52 : 44,
      borderRadius: isTablet ? 26 : 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: isTablet ? 12 : 8,
    },
    sendButton: {
      width: isTablet ? 52 : 44,
      height: isTablet ? 52 : 44,
      borderRadius: isTablet ? 26 : 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: isTablet ? 12 : 8,
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
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isTablet ? 32 : 20,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: isTablet ? 24 : 20,
      padding: isTablet ? 32 : 24,
      width: '100%',
      maxWidth: isTablet ? 480 : 400,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 20,
      },
      shadowOpacity: 0.25,
      shadowRadius: 25,
      elevation: 25,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: isTablet ? 24 : 20,
    },
    modalTitle: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: '700',
      color: colors.cardForeground,
      flex: 1,
    },
    closeButton: {
      padding: isTablet ? 12 : 8,
      borderRadius: isTablet ? 24 : 20,
      backgroundColor: colors.muted + '20',
      marginLeft: 16,
    },
    modalIcon: {
      marginBottom: isTablet ? 24 : 20,
      padding: isTablet ? 20 : 16,
      borderRadius: isTablet ? 60 : 50,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.border,
    },
    modalMessage: {
      fontSize: isTablet ? 18 : 16,
      color: colors.cardForeground,
      textAlign: 'center',
      lineHeight: isTablet ? 28 : 24,
      marginBottom: isTablet ? 32 : 24,
      opacity: 0.9,
    },
    modalButton: {
      backgroundColor: colors.primary,
      borderRadius: isTablet ? 16 : 12,
      paddingVertical: isTablet ? 16 : 14,
      paddingHorizontal: isTablet ? 40 : 32,
      minWidth: isTablet ? 140 : 120,
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    modalButtonText: {
      color: colors.primaryForeground,
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
      letterSpacing: 0.5,
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
    actionsMenu: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
      padding: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
      minWidth: 140,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
      borderRadius: 8,
      minHeight: 44,
    },
    actionText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.foreground,
      flex: 1,
    },
    editContainer: {
      width: '100%',
      maxWidth: '100%',
      flexShrink: 1,
    },
    editInput: {
      backgroundColor: colors.input,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 60,
    },
    editActions: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'flex-end',
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    saveButtonText: {
      color: colors.primaryForeground,
      fontSize: 12,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    cancelButtonText: {
      color: colors.mutedForeground,
      fontSize: 12,
      fontWeight: '600',
    },
    voiceIndicator: {
      fontSize: 12,
      opacity: 0.7,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    welcomeContainer: {
      alignItems: 'center',
      maxWidth: 300,
    },
    welcomeTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 12,
      textAlign: 'center',
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 16,
    },
    welcomeHint: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: 20,
    },
    // Recording Modal Styles
    recordingModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isTablet ? 32 : 20,
    },
    recordingModalContent: {
      backgroundColor: colors.card,
      borderRadius: isTablet ? 32 : 24,
      padding: isTablet ? 40 : 32,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 25,
      },
      shadowOpacity: 0.35,
      shadowRadius: 35,
      elevation: 35,
      width: '100%',
      maxWidth: isTablet ? 520 : 420,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recordingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: isTablet ? 32 : 24,
    },
    recordingTitle: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: '700',
      color: colors.cardForeground,
      flex: 1,
    },
    recordingCloseButton: {
      padding: isTablet ? 12 : 8,
      borderRadius: isTablet ? 24 : 20,
      backgroundColor: colors.muted + '20',
      marginLeft: 16,
    },
    recordingAnimation: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isTablet ? 32 : 24,
    },
    microphoneIcon: {
      width: isTablet ? 100 : 80,
      height: isTablet ? 100 : 80,
      borderRadius: isTablet ? 50 : 40,
      backgroundColor: colors.background,
      borderWidth: 3,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 12,
    },
    microphoneActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
      shadowColor: colors.primary,
    },
    pulseAnimation: {
      position: 'absolute',
      width: isTablet ? 100 : 80,
      height: isTablet ? 100 : 80,
    },
    pulseRing: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 50,
      opacity: 0.4,
    },
    pulseRing1: {
      width: isTablet ? 120 : 100,
      height: isTablet ? 120 : 100,
      top: isTablet ? -10 : -10,
      left: isTablet ? -10 : -10,
    },
    pulseRing2: {
      width: isTablet ? 150 : 120,
      height: isTablet ? 150 : 120,
      top: isTablet ? -25 : -20,
      left: isTablet ? -25 : -20,
    },
    pulseRing3: {
      width: isTablet ? 180 : 140,
      height: isTablet ? 180 : 140,
      top: isTablet ? -40 : -30,
      left: isTablet ? -40 : -30,
    },
    recordingTime: {
      fontSize: isTablet ? 32 : 24,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: isTablet ? 24 : 20,
      fontVariant: ['tabular-nums'],
      letterSpacing: 1,
    },
    transcriptContainer: {
      width: '100%',
      marginBottom: isTablet ? 32 : 24,
    },
    transcriptLabel: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '600',
      color: colors.cardForeground,
      marginBottom: isTablet ? 12 : 8,
    },
    transcriptText: {
      fontSize: isTablet ? 18 : 16,
      color: colors.mutedForeground,
      backgroundColor: colors.background,
      padding: isTablet ? 20 : 16,
      borderRadius: isTablet ? 16 : 12,
      minHeight: isTablet ? 80 : 60,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.border,
      lineHeight: isTablet ? 26 : 22,
    },
    recordingActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      gap: isTablet ? 16 : 12,
    },
    recordingCancelButton: {
      flex: 1,
      backgroundColor: colors.secondary,
      padding: isTablet ? 18 : 14,
      borderRadius: isTablet ? 16 : 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    recordingCancelButtonText: {
      color: colors.secondaryForeground,
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
    },
    recordingSendButton: {
      flex: 1,
      backgroundColor: colors.primary,
      padding: isTablet ? 18 : 14,
      borderRadius: isTablet ? 16 : 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: isTablet ? 10 : 8,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    recordingSendButtonDisabled: {
      backgroundColor: colors.muted,
      shadowOpacity: 0,
      elevation: 0,
    },
    recordingSendButtonText: {
      color: '#fff',
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
    },
    recordingSendButtonTextDisabled: {
      color: colors.mutedForeground,
    },
    modalActions: {
      flexDirection: 'row',
      gap: isTablet ? 16 : 12,
      justifyContent: 'space-between',
      width: '100%',
    },
    modalCancelButton: {
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    modalCancelButtonText: {
      color: colors.secondaryForeground,
    },
    modalDeleteButton: {
      backgroundColor: colors.destructive,
      shadowColor: colors.destructive,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
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
        contentContainerStyle={messages.length === 0 ? styles.emptyContainer : undefined}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>👋 Hello! I&apos;m Aura</Text>
            <Text style={styles.welcomeSubtitle}>
              Your AI-powered personal assistant. I can help you manage your calendar, set reminders, and much more!
            </Text>
            <Text style={styles.welcomeHint}>
              Try saying: &quot;Schedule a meeting tomorrow&quot; or &quot;Remind me to call mom&quot;
            </Text>
          </View>
        )}
        
        {messages.map((message) => {
          // Safety check for message content
          if (!message || !message.id) {
            return null;
          }
          
          return (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.role === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <TouchableOpacity
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
                onLongPress={() => setShowMessageActions(showMessageActions === message.id ? null : message.id)}
                delayLongPress={300}
              >
                {editingMessage === message.id ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.editInput}
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                      autoFocus
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.saveButton} onPress={saveEditMessage}>
                        <Text style={styles.saveButtonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelButton} onPress={cancelEditMessage}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ 
                    minHeight: isTablet ? 28 : 22, 
                    justifyContent: 'center',
                    width: '100%',
                    paddingVertical: 2
                  }}>
                    <Text
                      style={[
                        styles.messageText,
                        message.role === 'user' ? styles.userText : styles.assistantText,
                      ]}
                    >
                      {message.role === 'assistant' ? 
                        renderMarkdownText(message.content || 'Message content not available', styles.assistantText) :
                        (message.content || 'Message content not available')
                      }
                      {message.isVoiceMessage && (
                        <Text style={styles.voiceIndicator}> 🎤</Text>
                      )}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

            {/* Message Actions Menu */}
            {showMessageActions === message.id && (
              <View style={styles.actionsMenu}>
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => copyMessage(message.id)}
                >
                  <Copy size={16} color={colors.foreground} />
                  <Text style={styles.actionText}>Copy</Text>
                </TouchableOpacity>
                
                {message.role === 'user' && (
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={() => startEditMessage(message.id)}
                  >
                    <Edit3 size={16} color={colors.foreground} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => {
                    setShowMessageActions(null);
                    setShowDeleteConfirm(message.id);
                  }}
                >
                  <Trash2 size={16} color={colors.destructive} />
                  <Text style={[styles.actionText, { color: colors.destructive }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <Text style={styles.timestamp}>
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
          );
        })}
        
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
            <Text style={styles.quickActionText}>Today&apos;s Events</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => processMessage("Show my reminders")}
          >
            <Clock size={16} color={colors.primary} />
            <Text style={styles.quickActionText}>My Reminders</Text>
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

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => processMessage("Show my events this week")}
          >
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.quickActionText}>This Week</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => processMessage("What do I have tomorrow")}
          >
            <Clock size={16} color={colors.primary} />
            <Text style={styles.quickActionText}>Tomorrow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setInputText("Schedule a meeting with ")}
          >
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.quickActionText}>New Meeting</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => processMessage("Cancel my next meeting")}
          >
            <X size={16} color={colors.destructive} />
            <Text style={[styles.quickActionText, { color: colors.destructive }]}>Cancel Event</Text>
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
          onPress={isListening ? () => stopListening() : startListening}
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
                <X size={isTablet ? 24 : 20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              {(() => {
                const { icon: IconComponent, color } = getModalIconAndColor(modalTitle);
                return <IconComponent size={isTablet ? 56 : 48} color={color} />;
              })()}
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

      {/* Recording Modal */}
      <Modal
        visible={showRecordingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelRecording}
      >
        <View style={styles.recordingModalOverlay}>
          <View style={styles.recordingModalContent}>
            <View style={styles.recordingHeader}>
              <Text style={styles.recordingTitle}>Recording Voice Message</Text>
              <TouchableOpacity
                style={styles.recordingCloseButton}
                onPress={cancelRecording}
              >
                <X size={isTablet ? 24 : 20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.recordingAnimation}>
              <View style={[styles.microphoneIcon, isListening && styles.microphoneActive]}>
                <Mic size={isTablet ? 56 : 48} color={isListening ? colors.primary : colors.muted} />
              </View>
              {isListening && (
                <Animated.View style={[styles.pulseAnimation, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={[styles.pulseRing, styles.pulseRing1]} />
                  <View style={[styles.pulseRing, styles.pulseRing2]} />
                  <View style={[styles.pulseRing, styles.pulseRing3]} />
                </Animated.View>
              )}
            </View>

            <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>

            <View style={styles.transcriptContainer}>
              <Text style={styles.transcriptLabel}>Live Transcript:</Text>
              <Text style={styles.transcriptText}>
                {recordingTranscript || "Start speaking..."}
              </Text>
            </View>

            <View style={styles.recordingActions}>
              <TouchableOpacity
                style={styles.recordingCancelButton}
                onPress={cancelRecording}
              >
                <Text style={styles.recordingCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.recordingSendButton, !recordingTranscript.trim() && styles.recordingSendButtonDisabled]}
                onPress={() => stopListening(true)}
                disabled={!recordingTranscript.trim()}
              >
                <Send size={isTablet ? 24 : 20} color={recordingTranscript.trim() ? '#fff' : colors.muted} />
                <Text style={[styles.recordingSendButtonText, !recordingTranscript.trim() && styles.recordingSendButtonTextDisabled]}>
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Message</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDeleteConfirm(null)}
              >
                <X size={isTablet ? 24 : 20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              <Trash2 size={isTablet ? 56 : 48} color={colors.destructive} />
            </View>

            <Text style={styles.modalMessage}>
              {showDeleteConfirm && messages.find(m => m.id === showDeleteConfirm)?.role === 'user'
                ? 'This will delete your message and the assistant\'s response. Are you sure?'
                : 'Are you sure you want to delete this message?'
              }
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDeleteConfirm(null)}
              >
                <Text style={[styles.modalButtonText, styles.modalCancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={() => {
                  if (showDeleteConfirm) {
                    deleteMessage(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
