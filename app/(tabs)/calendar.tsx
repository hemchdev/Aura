import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Plus, Edit, Trash2, Clock, MapPin, X, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
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
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Get current date in IST
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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    time: '12:00 PM',
    duration: '60', // minutes
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [tempTime, setTempTime] = useState({ hour: '12', minute: '00', period: 'PM' });
  const { user } = useAuthStore();
  const colors = useColors();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);

  // Create calendar theme based on current theme
  const calendarTheme = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    
    // Using color system for better theme integration
    // For dark mode: Use a slightly lighter shade than the background for better visibility
    // For light mode: Use pure white for clean appearance
    const backgroundColor = isDark ? colors.card : '#FFFFFF';
    const textColor = colors.foreground;
    
    return {
      backgroundColor: backgroundColor,
      calendarBackground: backgroundColor,
      // Header (month/year and navigation arrows) styling
      'stylesheet.calendar.header': {
        header: {
          backgroundColor: backgroundColor, // Explicit header background
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingLeft: 10,
          paddingRight: 10,
          marginTop: 6,
          alignItems: 'center',
        },
        monthText: {
          fontSize: 18,
          fontWeight: '600',
          color: textColor, // Explicit month text color
          margin: 10,
        },
        arrow: {
          padding: 10,
          backgroundColor: 'transparent', // Ensure arrow background is transparent
        },
        arrowText: {
          color: textColor, // Explicit arrow color
          fontSize: 18,
        },
        week: {
          marginTop: 7,
          flexDirection: 'row',
          justifyContent: 'space-around',
          backgroundColor: backgroundColor, // Week header background
        },
        dayHeader: {
          marginTop: 2,
          marginBottom: 7,
          width: 32,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: '600',
          color: textColor, // Day header color
        },
      },
      // Text colors - comprehensive coverage
      textSectionTitleColor: textColor, // Month/year and day headers (S M T W T F S)
      monthTextColor: textColor, // Month/year text
      dayTextColor: textColor, // Day numbers
      textDisabledColor: colors.mutedForeground, // Use theme's muted color
      // Selected and interactive elements
      selectedDayBackgroundColor: colors.primary,
      selectedDayTextColor: colors.primaryForeground, // Text on selected day
      todayTextColor: colors.primary, // Today's date
      // Dots and indicators
      dotColor: colors.primary,
      selectedDotColor: colors.primaryForeground, // Dot on selected day
      // Navigation arrows
      arrowColor: textColor, // Left/right navigation arrows
      disabledArrowColor: colors.mutedForeground, // Use theme's muted color
      indicatorColor: colors.primary,
      // Font weights and sizes
      textMonthFontWeight: '600' as const,
      textDayFontWeight: '400' as const,
      textDayHeaderFontWeight: '600' as const,
      textDayFontSize: 16,
      textMonthFontSize: 18,
      textDayHeaderFontSize: 14,
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

      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        title: newEvent.title,
        description: newEvent.description || '',
        start_time: selectedDateIST.toISOString(),
        end_time: endTime.toISOString(),
        location: newEvent.location || '',
        all_day: false,
      });

      if (error) throw error;

      // Reset form and close modal
      setNewEvent({
        title: '',
        description: '',
        location: '',
        time: '12:00 PM',
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

      // Reset form and close modal
      setNewEvent({
        title: '',
        description: '',
        location: '',
        time: '12:00 PM',
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
      borderColor: colors.border, // Use theme border color
      backgroundColor: 'transparent', // Use transparent to let theme handle background
      borderRadius: 16, // Modern card look
      marginHorizontal: 10, // Add some margin for better appearance
      marginTop: 10,
      marginBottom: 10,
      shadowColor: '#000', // Use default black shadow
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: resolvedTheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    eventsContainer: {
      flex: 1,
      padding: 16,
    },
    selectedDateText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 16,
    },
    eventCard: {
      // In dark mode, use a slightly lighter color than the card background
      // In light mode, use a slightly off-white for subtle distinction
      backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#F8FAFC', // Slate-700 for dark, slate-50 for light
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: resolvedTheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
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
      alignItems: 'center', // Center align content for better modal appearance
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      width: '100%', // Ensure header takes full width
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.cardForeground,
    },
    closeButton: {
      padding: 8,
    },
    modalText: {
      fontSize: 16,
      color: colors.cardForeground,
      marginBottom: 24,
      lineHeight: 24,
      textAlign: 'center',
    },
    modalMessage: {
      fontSize: 16,
      color: colors.cardForeground,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    modalIcon: {
      marginBottom: 16,
      alignSelf: 'center', // Center the icon
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      width: '100%', // Ensure actions take full width
    },
    modalButton: {
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      marginLeft: 12,
      flex: 1,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.muted,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    destructiveButton: {
      backgroundColor: colors.destructive,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
      color: colors.cardForeground,
      backgroundColor: resolvedTheme === 'dark' ? '#1E293B' : '#FFFFFF', // Custom background for inputs
      width: '100%', // Ensure inputs take full width
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.cardForeground,
      marginBottom: 8,
      alignSelf: 'flex-start', // Left align labels even with centered modal
      width: '100%', // Ensure labels take full width
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
      width: '100%', // Full width button
    },
    saveButtonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: '600',
    },
    timePickerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      backgroundColor: resolvedTheme === 'dark' ? '#1E293B' : '#FFFFFF',
      justifyContent: 'center',
      width: '100%', // Full width
    },
    timePickerText: {
      fontSize: 16,
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
        style={styles.calendar}
        current={selectedDate}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={getMarkedDates()}
        theme={calendarTheme}
      />

      <ScrollView style={styles.eventsContainer}>
        <Text style={styles.selectedDateText}>
          {formatDate(selectedDate)}
        </Text>

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
                <X size={24} color={colors.cardForeground} />
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
                <X size={24} color={colors.cardForeground} />
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
                <X size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Are you sure you want to delete "{eventToDelete?.title}"? This action cannot be undone.
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
                <X size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              <AlertCircle size={48} color={colors.destructive} />
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
                <X size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalIcon}>
              <CheckCircle size={48} color={colors.primary} />
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
    </SafeAreaView>
  );
}