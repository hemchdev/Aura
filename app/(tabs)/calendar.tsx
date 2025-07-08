import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Plus, Edit, Trash2, Clock, MapPin, X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { notificationService } from '@/lib/notificationService';
import type { Event } from '@/types/database';

// Helper function for IST timezone
const getISTDate = () => {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (5.5 * 3600000));
  return ist;
};

export default function CalendarTab() {
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isTablet = screenWidth > 768;
  const isLargeScreen = screenWidth > 1024;
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get current date in IST
    const istDate = getISTDate();
    return istDate.toISOString().split('T')[0];
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Get current date in IST for month tracking
    const istDate = getISTDate();
    return istDate.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  // Helper function to get current time in AM/PM format
  const getCurrentTimeAMPM = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    time: getCurrentTimeAMPM(),
    duration: '60', // minutes
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [tempTime, setTempTime] = useState({ hour: '12', minute: '00', period: 'PM' });
  const [tempDate, setTempDate] = useState({ day: '1', month: '1', year: '2025' });
  const [tempMonthYear, setTempMonthYear] = useState({ month: '1', year: '2025' });
  const { user } = useAuthStore();
  const colors = useColors();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  // Create calendar theme based on current theme
  const calendarTheme = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    
    return {
      backgroundColor: colors.background,
      calendarBackground: colors.background,
      // Header (month/year and navigation arrows) styling
      'stylesheet.calendar.header': {
        header: {
          backgroundColor: colors.background,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: 16,
          paddingRight: 16,
          marginTop: 8,
          marginBottom: 8,
          alignItems: 'center',
          height: 56,
        },
        monthText: {
          fontSize: isTablet ? 20 : 18,
          fontWeight: '700',
          color: colors.foreground,
          margin: 0,
        },
        arrow: {
          padding: 12,
          backgroundColor: colors.card,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
        },
        arrowText: {
          color: colors.foreground,
          fontSize: 16,
          fontWeight: '600',
        },
        week: {
          marginTop: 8,
          marginBottom: 8,
          flexDirection: 'row',
          justifyContent: 'space-around',
          backgroundColor: colors.background,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        dayHeader: {
          marginTop: 0,
          marginBottom: 0,
          width: 32,
          textAlign: 'center',
          fontSize: isTablet ? 14 : 12,
          fontWeight: '600',
          color: colors.mutedForeground,
        },
      },
      'stylesheet.day.basic': {
        base: {
          width: isTablet ? 40 : 32,
          height: isTablet ? 40 : 32,
          alignItems: 'center',
          justifyContent: 'center',
          margin: isTablet ? 4 : 2,
        },
        text: {
          marginTop: 0,
          fontSize: isTablet ? 16 : 14,
          fontWeight: '400',
          color: colors.foreground,
          backgroundColor: 'transparent',
        },
        today: {
          backgroundColor: colors.primary + '20',
          borderRadius: isTablet ? 20 : 16,
          borderWidth: 1,
          borderColor: colors.primary,
        },
        todayText: {
          color: colors.primary,
          fontWeight: '600',
        },
        selected: {
          backgroundColor: colors.primary,
          borderRadius: isTablet ? 20 : 16,
        },
        selectedText: {
          color: colors.primaryForeground,
          fontWeight: '600',
        },
        disabled: {
          backgroundColor: 'transparent',
        },
        disabledText: {
          color: colors.mutedForeground,
          opacity: 0.5,
        },
      },
      // Text colors
      textSectionTitleColor: colors.foreground,
      monthTextColor: colors.foreground,
      dayTextColor: colors.foreground,
      textDisabledColor: colors.mutedForeground,
      // Selected and interactive elements
      selectedDayBackgroundColor: colors.primary,
      selectedDayTextColor: colors.primaryForeground,
      todayTextColor: colors.primary,
      // Dots and indicators
      dotColor: colors.primary,
      selectedDotColor: colors.primaryForeground,
      // Navigation arrows
      arrowColor: colors.foreground,
      disabledArrowColor: colors.mutedForeground,
      indicatorColor: colors.primary,
      // Font configuration
      textMonthFontWeight: '700' as const,
      textDayFontWeight: '400' as const,
      textDayHeaderFontWeight: '600' as const,
      textDayFontSize: isTablet ? 16 : 14,
      textMonthFontSize: isTablet ? 20 : 18,
      textDayHeaderFontSize: isTablet ? 14 : 12,
    };
  }, [colors, resolvedTheme]);

  // Helper functions for time and timezone handling
  const formatTimeToAMPM = (timeString: string) => {
    // Convert 24-hour format to 12-hour AM/PM format
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatTimeFrom24Hour = (dateString: string) => {
    const date = new Date(dateString);
    // Convert to IST
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const istDate = new Date(utc + (5.5 * 3600000));
    return istDate.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const parseAMPMTime = (timeStr: string) => {
    try {
      // Convert "12:00 PM" format to 24-hour format
      const parts = timeStr.split(' ');
      
      // Default values in case parsing fails
      let hour24 = 12;
      let minutes = 0;
      
      if (parts.length >= 2) {
        const time = parts[0];
        const period = parts[1];
        
        if (time && time.includes(':')) {
          const [hours, mins] = time.split(':');
          
          if (hours && !isNaN(parseInt(hours))) {
            hour24 = parseInt(hours);
          }
          
          if (mins && !isNaN(parseInt(mins))) {
            minutes = parseInt(mins);
          }
          
          // Convert to 24-hour format
          if (period === 'AM' && hour24 === 12) {
            hour24 = 0;
          } else if (period === 'PM' && hour24 !== 12) {
            hour24 += 12;
          }
        }
      }
      
      return { hours: hour24, minutes };
    } catch (error) {
      console.error('Error parsing time:', error);
      // Return default values if parsing fails
      return { hours: 12, minutes: 0 };
    }
  };

  // Modal helper functions
  const displayErrorModal = (message: string) => {
    setModalMessage(message);
    setShowErrorModal(true);
  };

  const displaySuccessModal = (message: string) => {
    setModalMessage(message);
    setShowSuccessModal(true);
  };

  const getModalIconAndColor = (type: 'success' | 'error' | 'warning') => {
    switch (type) {
      case 'success':
        return { icon: CheckCircle, color: colors.success || '#22c55e' };
      case 'error':
        return { icon: XCircle, color: colors.destructive || '#ef4444' };
      case 'warning':
        return { icon: AlertCircle, color: colors.warning || '#f59e0b' };
      default:
        return { icon: Info, color: colors.primary };
    }
  };

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  // Reload events when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [])
  );

  const loadEvents = async () => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Ensure user profile exists before loading events
      await useAuthStore.getState().ensureProfile();
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading events:', error);
        displayErrorModal('Failed to load events: ' + error.message);
        return;
      }
      
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      displayErrorModal('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!user || !newEvent.title.trim()) {
      displayErrorModal('Please enter an event title');
      return;
    }

    try {
      // Ensure user profile exists before creating event
      await useAuthStore.getState().ensureProfile();

      // Parse AM/PM time
      const { hours, minutes } = parseAMPMTime(newEvent.time);
      
      // Create date in IST
      const selectedDateIST = new Date(selectedDate + 'T00:00:00');
      selectedDateIST.setHours(hours, minutes, 0, 0);
      
      // Calculate end time
      const endTime = new Date(selectedDateIST.getTime() + parseInt(newEvent.duration) * 60 * 1000);

      const { data, error } = await supabase.from('events').insert({
        user_id: user.id,
        title: newEvent.title,
        description: newEvent.description || '',
        start_time: selectedDateIST.toISOString(),
        end_time: endTime.toISOString(),
        location: newEvent.location || '',
        all_day: false,
      }).select().single();

      if (error) throw error;

      // Schedule event reminder notification (15 minutes before event)
      await notificationService.scheduleEventReminder(
        data.id,
        newEvent.title,
        selectedDateIST,
        15 // 15 minutes before
      );

      // Reset form and close modal
      setNewEvent({
        title: '',
        description: '',
        location: '',
        time: getCurrentTimeAMPM(),
        duration: '60',
      });
      setShowAddModal(false);
      
      // Reload events
      await loadEvents();
      
      displaySuccessModal('Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      displayErrorModal('Failed to create event');
    }
  };

  const editEvent = (event: Event) => {
    setSelectedEvent(event);
    // Pre-fill the form with existing event data
    const eventDate = new Date(event.start_time);
    const timeStringAMPM = formatTimeFrom24Hour(event.start_time);
    const durationMinutes = Math.round((new Date(event.end_time).getTime() - eventDate.getTime()) / (1000 * 60));
    
    setNewEvent({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      time: timeStringAMPM,
      duration: durationMinutes.toString(),
    });
    
    // Set the selected date to the event's date (in IST)
    const istDate = new Date(event.start_time);
    const eventDateString = istDate.toISOString().split('T')[0];
    setSelectedDate(eventDateString);
    
    setShowEditModal(true);
  };

  const updateEvent = async () => {
    if (!user || !selectedEvent || !newEvent.title.trim()) {
      displayErrorModal('Please enter an event title');
      return;
    }

    try {
      // Parse AM/PM time
      const { hours, minutes } = parseAMPMTime(newEvent.time);
      
      // Use the original event's date, not the selected date
      const originalEventDate = new Date(selectedEvent.start_time);
      const startTime = new Date(originalEventDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      // Calculate end time
      const endTime = new Date(startTime.getTime() + parseInt(newEvent.duration) * 60 * 1000);

      const { error } = await supabase
        .from('events')
        .update({
          title: newEvent.title,
          description: newEvent.description || '',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location: newEvent.location || '',
        })
        .eq('id', selectedEvent.id);

      if (error) throw error;

      // Schedule event reminder notification (15 minutes before event)
      await notificationService.scheduleEventReminder(
        selectedEvent.id,
        newEvent.title,
        startTime,
        15 // 15 minutes before
      );

      // Reset form and close modal
      setNewEvent({
        title: '',
        description: '',
        location: '',
        time: getCurrentTimeAMPM(),
        duration: '60',
      });
      setShowEditModal(false);
      setSelectedEvent(null);
      
      // Reload events
      await loadEvents();
      
      displaySuccessModal('Event updated successfully!');
    } catch (error) {
      console.error('Error updating event:', error);
      displayErrorModal('Failed to update event');
    }
  };

  const deleteEvent = (event: Event) => {
    if (deleting) return;
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    await performDelete(eventToDelete);
    setShowDeleteModal(false);
    setEventToDelete(null);
  };

  const performDelete = async (event: Event) => {
    if (deleting || !event?.id || !user) {
      return;
    }
    
    setDeleting(true);
    
    try {
      // Simple delete operation without .select() to avoid complications
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) {
        console.error('Delete error:', error);
        throw new Error(error.message);
      }
      
      // Remove from local state immediately for better UX
      setEvents(prevEvents => prevEvents.filter(e => e.id !== event.id));
      
      displaySuccessModal('Event deleted successfully!');
      
    } catch (error: any) {
      console.error('Delete failed:', error);
      displayErrorModal(`Failed to delete event: ${error?.message || 'Unknown error'}`);
      // Reload events in case of error to sync with database
      await loadEvents();
    } finally {
      setDeleting(false);
    }
  };

  const getMarkedDates = () => {
    const marked: { [key: string]: any } = {};
    
    events.forEach((event) => {
      const date = event.start_time.split('T')[0];
      marked[date] = {
        marked: true,
        dotColor: colors.primary,
      };
    });

    // Mark selected date
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: colors.primary,
    };

    return marked;
  };

  const getEventsForDate = (date: string) => {
    return events.filter((event) => {
      const eventDate = event.start_time.split('T')[0];
      return eventDate === date;
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  };

  const selectedEvents = getEventsForDate(selectedDate);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.foreground,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calendar: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: isTablet ? 16 : 12,
      marginHorizontal: isTablet ? 16 : 12,
      marginTop: isTablet ? 16 : 12,
      marginBottom: isTablet ? 16 : 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: resolvedTheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
      overflow: 'hidden',
    },
    eventsContainer: {
      flex: 1,
      padding: isTablet ? 20 : 16,
    },
    selectedDateText: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: isTablet ? 20 : 16,
    },
    eventCard: {
      backgroundColor: colors.card,
      borderRadius: isTablet ? 16 : 12,
      padding: isTablet ? 20 : 16,
      marginBottom: isTablet ? 16 : 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: resolvedTheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    eventActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: 8,
      marginLeft: 4,
      borderRadius: 8,
      minWidth: 32,
      minHeight: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    disabledButton: {
      opacity: 0.5,
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground, // Use theme foreground color for better contrast
      flex: 1,
      marginRight: 8,
    },
    eventDetail: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    eventDetailText: {
      fontSize: 14,
      color: colors.mutedForeground, // Use theme's mutedForeground for consistency
      marginLeft: 8,
    },
    eventDescription: {
      fontSize: 14,
      color: colors.mutedForeground, // Use theme's mutedForeground for consistency
      marginTop: 8,
      lineHeight: 20,
    },
    noEventsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    noEventsText: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    noEventsSubtext: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 8,
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
      maxWidth: isTablet ? 520 : 420,
      alignItems: 'stretch',
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
      marginBottom: isTablet ? 24 : 20,
      width: '100%',
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
    modalText: {
      fontSize: isTablet ? 18 : 16,
      color: colors.cardForeground,
      marginBottom: isTablet ? 32 : 24,
      lineHeight: isTablet ? 28 : 24,
      textAlign: 'center',
      opacity: 0.9,
    },
    modalMessage: {
      fontSize: isTablet ? 18 : 16,
      color: colors.cardForeground,
      textAlign: 'center',
      lineHeight: isTablet ? 28 : 24,
      marginBottom: isTablet ? 32 : 24,
      opacity: 0.9,
    },
    modalIcon: {
      marginBottom: isTablet ? 24 : 20,
      padding: isTablet ? 20 : 16,
      borderRadius: isTablet ? 60 : 50,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.border,
      alignSelf: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: isTablet ? 16 : 12,
      width: '100%',
      gap: isTablet ? 16 : 12,
    },
    modalButton: {
      borderRadius: isTablet ? 16 : 12,
      paddingVertical: isTablet ? 16 : 14,
      paddingHorizontal: isTablet ? 24 : 20,
      flex: 1,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    cancelButton: {
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    modalButtonText: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    destructiveButton: {
      backgroundColor: colors.destructive,
      shadowColor: colors.destructive,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: isTablet ? 12 : 8,
      padding: isTablet ? 16 : 12,
      marginBottom: isTablet ? 20 : 16,
      fontSize: isTablet ? 18 : 16,
      color: colors.cardForeground,
      backgroundColor: resolvedTheme === 'dark' ? '#1E293B' : '#FFFFFF',
      width: '100%',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    textArea: {
      height: isTablet ? 100 : 80,
      textAlignVertical: 'top',
    },
    inputLabel: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '600',
      color: colors.cardForeground,
      marginBottom: isTablet ? 12 : 8,
      alignSelf: 'flex-start',
      width: '100%',
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: isTablet ? 16 : 12,
      padding: isTablet ? 20 : 16,
      alignItems: 'center',
      marginTop: isTablet ? 12 : 8,
      width: '100%',
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    saveButtonText: {
      color: colors.primaryForeground,
      fontSize: isTablet ? 18 : 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    timePickerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: isTablet ? 12 : 8,
      padding: isTablet ? 16 : 12,
      marginBottom: isTablet ? 20 : 16,
      backgroundColor: resolvedTheme === 'dark' ? '#1E293B' : '#FFFFFF',
      justifyContent: 'center',
      width: '100%',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    timePickerText: {
      fontSize: isTablet ? 18 : 16,
      color: colors.cardForeground,
    },
    timePickerModal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    timePickerContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 300,
    },
    timePickerHeader: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.cardForeground,
      textAlign: 'center',
      marginBottom: 20,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    timeInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 18,
      textAlign: 'center',
      width: 60,
      color: colors.cardForeground,
    },
    timeSeparator: {
      fontSize: 18,
      color: colors.cardForeground,
      marginHorizontal: 10,
    },
    ampmContainer: {
      flexDirection: 'row',
      marginLeft: 20,
    },
    ampmButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    ampmButtonActive: {
      backgroundColor: colors.primary,
    },
    ampmButtonInactive: {
      backgroundColor: colors.muted,
    },
    ampmText: {
      fontSize: 16,
      fontWeight: '600',
    },
    ampmTextActive: {
      color: colors.primaryForeground,
    },
    ampmTextInactive: {
      color: colors.mutedForeground,
    },
    timePickerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    timeActionButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 5,
    },
    timePickerCancelButton: {
      backgroundColor: colors.muted,
    },
    timePickerConfirmButton: {
      backgroundColor: colors.primary,
    },
    timePickerButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    timePickerCancelText: {
      color: colors.mutedForeground,
    },
    timePickerConfirmText: {
      color: colors.primaryForeground,
    },
    datePickerModal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    datePickerContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 320,
      borderWidth: 1,
      borderColor: colors.border,
    },
    datePickerHeader: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.cardForeground,
      textAlign: 'center',
      marginBottom: 20,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    dateInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      textAlign: 'center',
      color: colors.cardForeground,
      backgroundColor: colors.background,
      marginHorizontal: 5,
    },
    dayInput: {
      width: 60,
    },
    monthInput: {
      width: 60,
    },
    yearInput: {
      width: 80,
    },
    dateSeparator: {
      fontSize: 16,
      color: colors.cardForeground,
      marginHorizontal: 5,
      fontWeight: '600',
    },
    datePickerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    dateActionButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 5,
    },
    datePickerCancelButton: {
      backgroundColor: colors.muted,
    },
    datePickerConfirmButton: {
      backgroundColor: colors.primary,
    },
    datePickerButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    datePickerCancelText: {
      color: colors.mutedForeground,
    },
    datePickerConfirmText: {
      color: colors.primaryForeground,
    },
    calendarHeader: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    calendarHeaderContainer: {
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarHeaderText: {
      fontSize: isTablet ? 20 : 18,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
    },
  });

  const openTimePicker = () => {
    // Parse current time to set temp values
    const [time, period] = newEvent.time.split(' ');
    const [hour, minute] = time.split(':');
    setTempTime({ hour, minute, period });
    setShowTimePicker(true);
  };

  const confirmTime = () => {
    // Validate hour and minute values before confirming
    let hour = tempTime.hour;
    let minute = tempTime.minute;
    
    // If hour is empty or invalid, set to default "12"
    if (hour === '' || isNaN(parseInt(hour)) || parseInt(hour) < 1 || parseInt(hour) > 12) {
      hour = '12';
    }
    
    // If minute is empty or invalid, set to default "00"
    if (minute === '' || isNaN(parseInt(minute)) || parseInt(minute) < 0 || parseInt(minute) > 59) {
      minute = '00';
    }
    
    // Ensure proper formatting with leading zeros
    const hourFormatted = hour.padStart(2, '0');
    const minuteFormatted = minute.padStart(2, '0');
    
    const timeString = `${hourFormatted}:${minuteFormatted} ${tempTime.period}`;
    setNewEvent(prev => ({ ...prev, time: timeString }));
    setShowTimePicker(false);
  };

  const updateTempHour = (hour: string) => {
    // Allow empty string for initial typing
    if (hour === '') {
      setTempTime(prev => ({ ...prev, hour: '' }));
      return;
    }
    
    // Allow single digits to be entered
    const hourNum = parseInt(hour);
    
    // Validate the hour value
    if (isNaN(hourNum)) {
      return; // Not a number, ignore
    }
    
    // Allow temporary values during typing (like single digit numbers)
    if (hour.length === 1) {
      setTempTime(prev => ({ ...prev, hour }));
      return;
    }
    
    // For final values, ensure they're in the 1-12 range
    if (hourNum >= 1 && hourNum <= 12) {
      setTempTime(prev => ({ ...prev, hour: hourNum.toString().padStart(2, '0') }));
    }
  };

  const updateTempMinute = (minute: string) => {
    // Allow empty string for initial typing
    if (minute === '') {
      setTempTime(prev => ({ ...prev, minute: '' }));
      return;
    }
    
    // Allow single digits to be entered
    const minuteNum = parseInt(minute);
    
    // Validate the minute value
    if (isNaN(minuteNum)) {
      return; // Not a number, ignore
    }
    
    // Allow temporary values during typing (like single digit numbers)
    if (minute.length === 1) {
      setTempTime(prev => ({ ...prev, minute }));
      return;
    }
    
    // For final values, ensure they're in the 0-59 range
    if (minuteNum >= 0 && minuteNum <= 59) {
      setTempTime(prev => ({ ...prev, minute: minuteNum.toString().padStart(2, '0') }));
    }
  };

  // Navigation functions for month changes
  const onMonthChange = (month: any) => {
    console.log('Month changed to:', month.dateString);
    setCurrentMonth(month.dateString);
  };

  const openDatePicker = () => {
    // Parse current selected date to set temp values
    const date = new Date(selectedDate);
    setTempDate({
      day: date.getDate().toString(),
      month: (date.getMonth() + 1).toString(),
      year: date.getFullYear().toString()
    });
    setShowDatePicker(true);
  };

  const confirmDate = () => {
    // Validate and format the date
    let day = parseInt(tempDate.day);
    let month = parseInt(tempDate.month);
    let year = parseInt(tempDate.year);

    // Validate year (reasonable range)
    if (isNaN(year) || year < 1900 || year > 2100) {
      year = new Date().getFullYear();
    }

    // Validate month (1-12)
    if (isNaN(month) || month < 1 || month > 12) {
      month = new Date().getMonth() + 1;
    }

    // Validate day based on month and year
    const daysInMonth = new Date(year, month, 0).getDate();
    if (isNaN(day) || day < 1 || day > daysInMonth) {
      day = Math.min(parseInt(tempDate.day) || 1, daysInMonth);
    }

    // Create the date string in YYYY-MM-DD format
    const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    setSelectedDate(dateString);
    setCurrentMonth(dateString); // Also update the current month to show this date
    setShowDatePicker(false);
  };

  const updateTempDay = (day: string) => {
    if (day === '') {
      setTempDate(prev => ({ ...prev, day: '' }));
      return;
    }
    
    const dayNum = parseInt(day);
    if (isNaN(dayNum)) return;
    
    if (day.length <= 2 && dayNum >= 1 && dayNum <= 31) {
      setTempDate(prev => ({ ...prev, day: dayNum.toString() }));
    }
  };

  const updateTempMonth = (month: string) => {
    if (month === '') {
      setTempDate(prev => ({ ...prev, month: '' }));
      return;
    }
    
    const monthNum = parseInt(month);
    if (isNaN(monthNum)) return;
    
    if (month.length <= 2 && monthNum >= 1 && monthNum <= 12) {
      setTempDate(prev => ({ ...prev, month: monthNum.toString() }));
    }
  };

  const updateTempYear = (year: string) => {
    if (year === '') {
      setTempDate(prev => ({ ...prev, year: '' }));
      return;
    }
    
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return;
    
    if (year.length <= 4 && yearNum >= 1900 && yearNum <= 2100) {
      setTempDate(prev => ({ ...prev, year: yearNum.toString() }));
    }
  };

  const openMonthYearPicker = () => {
    // Parse current selected date to set temp values
    const date = new Date(currentMonth);
    setTempMonthYear({
      month: (date.getMonth() + 1).toString(),
      year: date.getFullYear().toString()
    });
    setShowMonthYearPicker(true);
  };

  const confirmMonthYear = () => {
    // Validate and format the date
    let month = parseInt(tempMonthYear.month);
    let year = parseInt(tempMonthYear.year);

    // Validate year (reasonable range)
    if (isNaN(year) || year < 1900 || year > 2100) {
      year = new Date().getFullYear();
    }

    // Validate month (1-12)
    if (isNaN(month) || month < 1 || month > 12) {
      month = new Date().getMonth() + 1;
    }

    // Create the date string in YYYY-MM-DD format (use day 1 for month display)
    const dateString = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    setCurrentMonth(dateString);
    
    // Also update selected date to the first day of the selected month/year
    setSelectedDate(dateString);
    
    setShowMonthYearPicker(false);
  };

  const updateTempMonthPicker = (month: string) => {
    if (month === '') {
      setTempMonthYear(prev => ({ ...prev, month: '' }));
      return;
    }
    
    const monthNum = parseInt(month);
    if (isNaN(monthNum)) return;
    
    if (month.length <= 2 && monthNum >= 1 && monthNum <= 12) {
      setTempMonthYear(prev => ({ ...prev, month: monthNum.toString() }));
    }
  };

  const updateTempYearPicker = (year: string) => {
    if (year === '') {
      setTempMonthYear(prev => ({ ...prev, year: '' }));
      return;
    }
    
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return;
    
    // Allow any 4-digit year input while typing
    if (year.length <= 4) {
      setTempMonthYear(prev => ({ ...prev, year: year }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <Calendar
        key={`calendar-${resolvedTheme}-${currentMonth}`}
        style={styles.calendar}
        current={currentMonth}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        onMonthChange={onMonthChange}
        onPressArrowLeft={() => {
          const newMonth = new Date(currentMonth);
          newMonth.setMonth(newMonth.getMonth() - 1);
          const newDateString = newMonth.toISOString().split('T')[0];
          setCurrentMonth(newDateString);
        }}
        onPressArrowRight={() => {
          const newMonth = new Date(currentMonth);
          newMonth.setMonth(newMonth.getMonth() + 1);
          const newDateString = newMonth.toISOString().split('T')[0];
          setCurrentMonth(newDateString);
        }}
        renderHeader={(date) => (
          <View style={styles.calendarHeaderContainer}>
            <TouchableOpacity 
              style={styles.calendarHeader}
              onPress={() => {
                const currentDate = new Date(date);
                setTempMonthYear({
                  month: (currentDate.getMonth() + 1).toString(),
                  year: currentDate.getFullYear().toString()
                });
                setShowMonthYearPicker(true);
              }}
            >
              <Text style={styles.calendarHeaderText}>
                {new Date(date).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        markedDates={getMarkedDates()}
        theme={calendarTheme}
        hideArrows={false}
        hideExtraDays={true}
        disableMonthChange={false}
        firstDay={0}
        hideDayNames={false}
        showWeekNumbers={false}
        disableArrowLeft={false}
        disableArrowRight={false}
        disableAllTouchEventsForDisabledDays={true}
        enableSwipeMonths={true}
      />

      <ScrollView style={styles.eventsContainer}>
        {selectedEvents.length > 0 ? (
          selectedEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={styles.eventActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => editEvent(event)}
                  >
                    <Edit size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, deleting && styles.disabledButton]}
                    onPress={() => deleteEvent(event)}
                    activeOpacity={0.7}
                    disabled={deleting}
                  >
                    <Trash2 size={18} color={deleting ? colors.mutedForeground : colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.eventDetail}>
                <Clock size={16} color={colors.mutedForeground} />
                <Text style={styles.eventDetailText}>
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </Text>
              </View>

              {event.location ? (
                <View style={styles.eventDetail}>
                  <MapPin size={16} color={colors.mutedForeground} />
                  <Text style={styles.eventDetailText}>{event.location}</Text>
                </View>
              ) : null}

              {event.description ? (
                <Text style={styles.eventDescription}>{event.description}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <View style={styles.noEventsContainer}>
            <Text style={styles.noEventsText}>No events for this day</Text>
            <Text style={styles.noEventsSubtext}>
              Tell Aura to schedule something for you!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Event</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddModal(false)}
              >
                <X size={isTablet ? 24 : 20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
              placeholder="Enter event title"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
              placeholder="Enter description (optional)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={newEvent.location}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, location: text }))}
              placeholder="Enter location (optional)"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={styles.inputLabel}>Time</Text>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={openTimePicker}
            >
              <Text style={styles.timePickerText}>{newEvent.time}</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={newEvent.duration}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, duration: text }))}
              placeholder="60"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.saveButton} onPress={createEvent}>
              <Text style={styles.saveButtonText}>Create Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Event</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowEditModal(false)}
              >
                <X size={isTablet ? 24 : 20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
              placeholder="Enter event title"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
              placeholder="Enter event description (optional)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={newEvent.location}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, location: text }))}
              placeholder="Enter location (optional)"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={styles.inputLabel}>Time</Text>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={openTimePicker}
            >
              <Text style={styles.timePickerText}>{newEvent.time}</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={newEvent.duration}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, duration: text }))}
              placeholder="60"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.saveButton} onPress={updateEvent}>
              <Text style={styles.saveButtonText}>Update Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Event</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <X size={isTablet ? 24 : 20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              <Trash2 size={isTablet ? 56 : 48} color={colors.destructive} />
            </View>

            <Text style={styles.modalText}>
              Are you sure you want to delete &quot;{eventToDelete?.title}&quot;? This action cannot be undone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.cardForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.destructiveButton, deleting && styles.disabledButton]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                <Text style={[styles.modalButtonText, { color: colors.destructiveForeground }]}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.timePickerModal}>
          <View style={styles.timePickerContent}>
            <Text style={styles.timePickerHeader}>Select Time</Text>
            
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                value={tempTime.hour}
                onChangeText={updateTempHour}
                keyboardType="numeric"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.timeSeparator}>:</Text>
              <TextInput
                style={styles.timeInput}
                value={tempTime.minute}
                onChangeText={updateTempMinute}
                keyboardType="numeric"
                maxLength={2}
                selectTextOnFocus
              />
              
              <View style={styles.ampmContainer}>
                <TouchableOpacity
                  style={[
                    styles.ampmButton,
                    tempTime.period === 'AM' ? styles.ampmButtonActive : styles.ampmButtonInactive
                  ]}
                  onPress={() => setTempTime(prev => ({ ...prev, period: 'AM' }))}
                >
                  <Text style={[
                    styles.ampmText,
                    tempTime.period === 'AM' ? styles.ampmTextActive : styles.ampmTextInactive
                  ]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.ampmButton,
                    tempTime.period === 'PM' ? styles.ampmButtonActive : styles.ampmButtonInactive
                  ]}
                  onPress={() => setTempTime(prev => ({ ...prev, period: 'PM' }))}
                >
                  <Text style={[
                    styles.ampmText,
                    tempTime.period === 'PM' ? styles.ampmTextActive : styles.ampmTextInactive
                  ]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timePickerActions}>
              <TouchableOpacity
                style={[styles.timeActionButton, styles.timePickerCancelButton]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={[styles.timePickerButtonText, styles.timePickerCancelText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeActionButton, styles.timePickerConfirmButton]}
                onPress={confirmTime}
              >
                <Text style={[styles.timePickerButtonText, styles.timePickerConfirmText]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Error</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowErrorModal(false)}
              >
                <X size={isTablet ? 24 : 20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              {(() => {
                const { icon: IconComponent, color } = getModalIconAndColor('error');
                return <IconComponent size={isTablet ? 56 : 48} color={color} />;
              })()}
            </View>

            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.primaryButton]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Success</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSuccessModal(false)}
              >
                <X size={isTablet ? 24 : 20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              {(() => {
                const { icon: IconComponent, color } = getModalIconAndColor('success');
                return <IconComponent size={isTablet ? 56 : 48} color={color} />;
              })()}
            </View>

            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.primaryButton]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerModal}>
          <View style={styles.datePickerContent}>
            <Text style={styles.datePickerHeader}>Select Date (DD/MM/YYYY)</Text>
            
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.dateInput, styles.dayInput]}
                value={tempDate.day}
                onChangeText={updateTempDay}
                placeholder="DD"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.dateSeparator}>/</Text>
              <TextInput
                style={[styles.dateInput, styles.monthInput]}
                value={tempDate.month}
                onChangeText={updateTempMonth}
                placeholder="MM"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.dateSeparator}>/</Text>
              <TextInput
                style={[styles.dateInput, styles.yearInput]}
                value={tempDate.year}
                onChangeText={updateTempYear}
                placeholder="YYYY"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={4}
                selectTextOnFocus
              />
            </View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={[styles.dateActionButton, styles.datePickerCancelButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.datePickerButtonText, styles.datePickerCancelText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateActionButton, styles.datePickerConfirmButton]}
                onPress={confirmDate}
              >
                <Text style={[styles.datePickerButtonText, styles.datePickerConfirmText]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Month/Year Picker Modal */}
      <Modal
        visible={showMonthYearPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthYearPicker(false)}
      >
        <View style={styles.datePickerModal}>
          <View style={styles.datePickerContent}>
            <Text style={styles.datePickerHeader}>Select Month and Year</Text>
            
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.dateInput, styles.monthInput]}
                value={tempMonthYear.month}
                onChangeText={updateTempMonthPicker}
                placeholder="MM"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.dateSeparator}>/</Text>
              <TextInput
                style={[styles.dateInput, styles.yearInput]}
                value={tempMonthYear.year}
                onChangeText={updateTempYearPicker}
                placeholder="YYYY"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={4}
                selectTextOnFocus
              />
            </View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={[styles.dateActionButton, styles.datePickerCancelButton]}
                onPress={() => setShowMonthYearPicker(false)}
              >
                <Text style={[styles.datePickerButtonText, styles.datePickerCancelText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateActionButton, styles.datePickerConfirmButton]}
                onPress={confirmMonthYear}
              >
                <Text style={[styles.datePickerButtonText, styles.datePickerConfirmText]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}