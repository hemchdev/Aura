import React, { useState, useEffect } from 'react';
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
import { Plus, Clock, Check, X, Save, Edit } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import type { Reminder } from '@/types/database';

export default function RemindersTab() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState({ hour: '12', minute: '00', period: 'PM' });
  const [newReminder, setNewReminder] = useState({
    title: '',
    text: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00 PM',
  });
  const { user } = useAuthStore();
  const colors = useColors();

  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user]);

  // Reload reminders when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      loadReminders();
    }, [])
  );

  const loadReminders = async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    
    try {
      // Ensure user profile exists before loading reminders
      await useAuthStore.getState().ensureProfile();
      
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('remind_at', { ascending: true });

      if (error) {
        console.error('Error loading reminders:', error);
        setModalMessage('Failed to load reminders: ' + error.message);
        setShowErrorModal(true);
        return;
      }
      
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setModalMessage('Failed to load reminders');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async () => {
    if (!user || !newReminder.title.trim()) {
      setModalMessage('Please enter a reminder title');
      setShowErrorModal(true);
      return;
    }

    try {
      // Ensure user profile exists before creating reminder
      await useAuthStore.getState().ensureProfile();

      // Parse AM/PM time
      const { hours, minutes } = parseAMPMTime(newReminder.time);
      
      // Create date in IST
      const remindAt = new Date(newReminder.date);
      remindAt.setHours(hours, minutes, 0, 0);

      const { error } = await supabase.from('reminders').insert({
        user_id: user.id,
        title: newReminder.title,
        text: newReminder.text || newReminder.title,
        remind_at: remindAt.toISOString(),
        completed: false,
      });

      if (error) throw error;

      // Reset form and close modal
      setNewReminder({
        title: '',
        text: '',
        date: new Date().toISOString().split('T')[0],
        time: '12:00 PM',
      });
      setShowAddModal(false);
      
      // Reload reminders
      await loadReminders();
      
      setModalMessage('Reminder created successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating reminder:', error);
      setModalMessage('Failed to create reminder');
      setShowErrorModal(true);
    }
  };

  const editReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    // Pre-fill the form with existing reminder data
    const reminderDate = new Date(reminder.remind_at);
    const dateString = reminderDate.toISOString().split('T')[0];
    
    // Convert to AM/PM format
    const hours = reminderDate.getHours();
    const minutes = reminderDate.getMinutes();
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const timeString = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    setNewReminder({
      title: reminder.title,
      text: reminder.text || '',
      date: dateString,
      time: timeString,
    });
    setShowEditModal(true);
  };

  const updateReminder = async () => {
    if (!user || !selectedReminder || !newReminder.title.trim()) {
      setModalMessage('Please enter a reminder title');
      setShowErrorModal(true);
      return;
    }

    try {
      // Parse AM/PM time
      const { hours, minutes } = parseAMPMTime(newReminder.time);
      
      const remindAt = new Date(newReminder.date);
      remindAt.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('reminders')
        .update({
          title: newReminder.title,
          text: newReminder.text || newReminder.title,
          remind_at: remindAt.toISOString(),
        })
        .eq('id', selectedReminder.id);

      if (error) throw error;

      // Reset form and close modal
      setNewReminder({
        title: '',
        text: '',
        date: new Date().toISOString().split('T')[0],
        time: '12:00 PM',
      });
      setShowEditModal(false);
      setSelectedReminder(null);
      
      // Reload reminders
      await loadReminders();
      
      setModalMessage('Reminder updated successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating reminder:', error);
      setModalMessage('Failed to update reminder');
      setShowErrorModal(true);
    }
  };

  const toggleReminder = async (reminder: Reminder) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({
          completed: !reminder.completed,
          completed_at: !reminder.completed ? new Date().toISOString() : null,
        })
        .eq('id', reminder.id);

      if (error) throw error;
      await loadReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
      setModalMessage('Failed to update reminder');
      setShowErrorModal(true);
    }
  };

  const deleteReminder = (reminder: Reminder) => {
    setReminderToDelete(reminder);
    setShowDeleteModal(true);
  };

  const confirmDeleteReminder = async () => {
    if (!reminderToDelete) return;

    try {
      // Delete the reminder - RLS policies will ensure user can only delete their own reminders
      const { data, error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderToDelete.id)
        .select(); // Return the deleted record for confirmation

      if (error) {
        throw error;
      }

      // Check if anything was actually deleted
      if (!data || data.length === 0) {
        throw new Error('Reminder not found or you do not have permission to delete it');
      }
      
      // Update local state by removing the deleted reminder
      setReminders(prevReminders => prevReminders.filter(r => r.id !== reminderToDelete.id));
      
      setModalMessage('Reminder deleted successfully!');
      setShowDeleteModal(false);
      setReminderToDelete(null);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error deleting reminder:', error);
      setModalMessage(`Failed to delete reminder: ${error?.message || 'Unknown error'}`);
      setShowDeleteModal(false);
      setReminderToDelete(null);
      setShowErrorModal(true);
    }
  };

  // Helper functions for date and time
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
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

  const openDatePicker = () => {
    // For now, just show a simple date input - can be enhanced with a proper date picker later
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    // Parse current time to set temp values
    const [time, period] = newReminder.time.split(' ');
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
    setNewReminder(prev => ({ ...prev, time: timeString }));
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

  const renderModals = () => {
    return (
      <>
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

              <Text style={styles.modalMessage}>{modalMessage}</Text>

              <View style={styles.modalActions}>
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

              <Text style={styles.modalMessage}>{modalMessage}</Text>

              <View style={styles.modalActions}>
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
      </>
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    let datePrefix = '';
    if (isToday) {
      datePrefix = 'Today';
    } else if (isTomorrow) {
      datePrefix = 'Tomorrow';
    } else {
      datePrefix = date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });
    }

    const timeString = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${datePrefix} at ${timeString}`;
  };

  const getTimeUntil = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'now';
  };

  const pendingReminders = reminders.filter(r => !r.completed);
  const completedReminders = reminders.filter(r => r.completed);

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
    scrollContainer: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
      marginTop: 8,
    },
    reminderCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    completedCard: {
      opacity: 0.6,
    },
    overdueCard: {
      borderColor: colors.error,
      borderWidth: 2,
    },
    checkButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    checkedButton: {
      backgroundColor: colors.primary,
    },
    reminderContent: {
      flex: 1,
    },
    reminderTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.cardForeground,
      marginBottom: 4,
    },
    reminderText: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 8,
      lineHeight: 20,
    },
    reminderTime: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    reminderTimeText: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginLeft: 6,
    },
    timeUntil: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    overdueText: {
      color: colors.error,
    },
    deleteButton: {
      padding: 8,
      marginLeft: 8,
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    editButton: {
      padding: 8,
      marginLeft: 8,
    },
    noRemindersContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    noRemindersText: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    noRemindersSubtext: {
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
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.cardForeground,
    },
    closeButton: {
      padding: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
      color: colors.cardForeground,
      backgroundColor: colors.background,
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
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    saveButtonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: '600',
    },
    modalMessage: {
      fontSize: 16,
      color: colors.cardForeground,
      marginBottom: 24,
      lineHeight: 24,
      textAlign: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 12,
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
    datePickerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      backgroundColor: colors.background,
      justifyContent: 'center',
    },
    datePickerText: {
      fontSize: 16,
      color: colors.cardForeground,
    },
    timePickerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      backgroundColor: colors.background,
      justifyContent: 'center',
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

  if (reminders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reminders</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.noRemindersContainer}>
          <Text style={styles.noRemindersText}>No reminders yet</Text>
          <Text style={styles.noRemindersSubtext}>
            Tell Aura to remind you about something!
          </Text>
        </View>

        {/* Add Reminder Modal - Moved outside the early return */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Reminder</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <X size={24} color={colors.cardForeground} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={newReminder.title}
                onChangeText={(text) => setNewReminder(prev => ({ ...prev, title: text }))}
                placeholder="Enter reminder title"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={newReminder.text}
                onChangeText={(text) => setNewReminder(prev => ({ ...prev, text: text }))}
                placeholder="Enter description (optional)"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={openDatePicker}
              >
                <Text style={styles.datePickerText}>{formatDateForDisplay(newReminder.date)}</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Time</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={openTimePicker}
              >
                <Text style={styles.timePickerText}>{newReminder.time}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={createReminder}>
                <Text style={styles.saveButtonText}>Create Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Include all other modals */}
        {renderModals()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reminders</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {pendingReminders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {pendingReminders.map((reminder) => {
              const isOverdue = new Date(reminder.remind_at) < new Date();
              return (
                <View
                  key={reminder.id}
                  style={[
                    styles.reminderCard,
                    isOverdue && styles.overdueCard,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.checkButton,
                      reminder.completed && styles.checkedButton,
                    ]}
                    onPress={() => toggleReminder(reminder)}
                  >
                    {reminder.completed && (
                      <Check size={12} color={colors.primaryForeground} />
                    )}
                  </TouchableOpacity>

                  <View style={styles.reminderContent}>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    
                    {reminder.text ? (
                      <Text style={styles.reminderText}>{reminder.text}</Text>
                    ) : null}

                    <View style={styles.reminderTime}>
                      <Clock size={14} color={colors.mutedForeground} />
                      <Text style={styles.reminderTimeText}>
                        {formatDateTime(reminder.remind_at)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.timeUntil,
                        isOverdue && styles.overdueText,
                      ]}
                    >
                      {getTimeUntil(reminder.remind_at)}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => editReminder(reminder)}
                    >
                      <Edit size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteReminder(reminder)}
                    >
                      <X size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {completedReminders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedReminders.map((reminder) => (
              <View
                key={reminder.id}
                style={[styles.reminderCard, styles.completedCard]}
              >
                <TouchableOpacity
                  style={[styles.checkButton, styles.checkedButton]}
                  onPress={() => toggleReminder(reminder)}
                >
                  <Check size={12} color={colors.primaryForeground} />
                </TouchableOpacity>

                <View style={styles.reminderContent}>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  
                  {reminder.text ? (
                    <Text style={styles.reminderText}>{reminder.text}</Text>
                  ) : null}

                  <View style={styles.reminderTime}>
                    <Clock size={14} color={colors.mutedForeground} />
                    <Text style={styles.reminderTimeText}>
                      {formatDateTime(reminder.remind_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => editReminder(reminder)}
                  >
                    <Edit size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteReminder(reminder)}
                  >
                    <X size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Reminder</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddModal(false)}
              >
                <X size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={newReminder.title}
              onChangeText={(text) => setNewReminder(prev => ({ ...prev, title: text }))}
              placeholder="Enter reminder title"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={newReminder.text}
              onChangeText={(text) => setNewReminder(prev => ({ ...prev, text: text }))}
              placeholder="Enter description (optional)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={newReminder.date}
              onChangeText={(text) => setNewReminder(prev => ({ ...prev, date: text }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={styles.inputLabel}>Time</Text>
            <TextInput
              style={styles.input}
              value={newReminder.time}
              onChangeText={(text) => setNewReminder(prev => ({ ...prev, time: text }))}
              placeholder="HH:MM (24-hour format)"
              placeholderTextColor={colors.mutedForeground}
            />

            <TouchableOpacity style={styles.saveButton} onPress={createReminder}>
              <Text style={styles.saveButtonText}>Create Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Reminder Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Reminder</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={newReminder.title}
              onChangeText={(text) => setNewReminder(prev => ({ ...prev, title: text }))}
              placeholder="Enter reminder title"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newReminder.text}
              onChangeText={(text) => setNewReminder(prev => ({ ...prev, text: text }))}
              placeholder="Enter description (optional)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={openDatePicker}
            >
              <Text style={styles.datePickerText}>{formatDateForDisplay(newReminder.date)}</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Time</Text>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={openTimePicker}
            >
              <Text style={styles.timePickerText}>{newReminder.time}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={updateReminder}>
              <Text style={styles.saveButtonText}>Update Reminder</Text>
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
              <Text style={styles.modalTitle}>Delete Reminder</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setReminderToDelete(null);
                }}
              >
                <X size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMessage}>
              Are you sure you want to delete &quot;{reminderToDelete?.title}&quot;? This action cannot be undone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setReminderToDelete(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.cardForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.destructiveButton]}
                onPress={confirmDeleteReminder}
              >
                <Text style={[styles.modalButtonText, { color: colors.destructiveForeground }]}>
                  Delete
                </Text>
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

            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <View style={styles.modalActions}>
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

            <Text style={styles.modalMessage}>{modalMessage}</Text>

            <View style={styles.modalActions}>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}