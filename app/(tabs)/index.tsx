import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Send, MicOff } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/stores/useAuthStore';
import { geminiService } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { speechService } from '@/lib/speech';
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
  const scrollViewRef = useRef<ScrollView>(null);
  const { user } = useAuthStore();
  const colors = useColors();

  useEffect(() => {
    loadChatHistory();
  }, []);

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
            
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

            const { error } = await supabase.from('events').insert({
              user_id: user.id,
              title: response.entities.title,
              description: response.entities.description || '',
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              location: response.entities.location || '',
              all_day: false,
            });
            
            if (error) {
              console.error('Error creating event:', error);
            }
          }
          break;

        case 'set_reminder':
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
            
            // Set time if provided, otherwise default to 12:00
            if (response.entities.time) {
              const [hours, minutes] = response.entities.time.split(':');
              remindAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            } else {
              remindAt.setHours(12, 0, 0, 0);
            }

            const { error } = await supabase.from('reminders').insert({
              user_id: user.id,
              title: response.entities.title,
              text: response.entities.reminderText || response.entities.title,
              remind_at: remindAt.toISOString(),
              completed: false,
            });
            
            if (error) {
              console.error('Error creating reminder:', error);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error handling intent:', error);
    }
  };

  const handleSend = () => {
    processMessage(inputText);
    setInputText('');
  };

  const startListening = () => {
    if (Platform.OS === 'web') {
      Alert.alert('Voice Input', 'Voice input is not available on web. Please type your message.');
      return;
    }

    // In a real app, you would implement speech-to-text here
    setIsListening(true);
    
    // Simulate listening for demo
    setTimeout(() => {
      setIsListening(false);
      Alert.alert('Voice Input', 'Voice input would be implemented here with a speech-to-text library.');
    }, 2000);
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
          onPress={startListening}
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
    </SafeAreaView>
  );
}