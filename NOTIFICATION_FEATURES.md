# Notification Features Documentation

## Overview
The Aura app now includes a comprehensive notification system that allows users to interact with events, reminders, and assistant messages directly from notifications.

## Notification Types

### 1. Event Reminders (`event_reminder`)
- **Trigger**: Scheduled before events based on reminder time (default: 15 minutes)
- **Actions**:
  - **Snooze 5min**: Reschedules the reminder for 5 minutes later
  - **View Event**: Opens the app and shows event details

### 2. Reminder Notifications (`reminder`)
- **Trigger**: At the specified reminder time
- **Actions**:
  - **Mark Done**: Marks the reminder as completed
  - **Snooze**: Reschedules the reminder for 10 minutes later

### 3. Assistant Messages (`assistant_message`)
- **Trigger**: When the assistant sends proactive messages or notifications
- **Actions**:
  - **Reply**: Opens the app and allows direct reply to the assistant
  - **Dismiss**: Dismisses the notification

## Notification Data Structure

All notifications include structured data:
```typescript
interface NotificationData {
  type: 'event_reminder' | 'event_upcoming' | 'reminder' | 'assistant_message';
  eventId?: string;
  reminderId?: string;
  title: string;
  body: string;
  conversationId?: string;
}
```

## Implementation Details

### Setup
1. **Permissions**: Automatic request for notification permissions on app start
2. **Categories**: Pre-configured notification categories with action buttons
3. **Channels**: Android notification channels for different types

### Response Handling
The app handles notification responses through:
- `handleNotificationResponse()` function in the assistant tab
- Type-safe data access with proper string conversion
- Automatic UI updates and user feedback

### Integration Points
- **Calendar Service**: Creates/updates events and schedules notifications
- **Reminder Service**: Manages reminder lifecycle and notifications  
- **Assistant Chat**: Seamless integration between notifications and chat interface

## Usage Examples

### Creating Events with Notifications
```typescript
// Assistant command: "Schedule meeting with team tomorrow at 2pm"
// Results in:
// 1. Event created in calendar
// 2. Notification scheduled for 1:45pm (15min before)
// 3. User can snooze or view from notification
```

### Managing Reminders
```typescript
// Assistant command: "Remind me to call mom at 5pm"
// Results in:
// 1. Reminder created in database
// 2. Notification scheduled for 5pm
// 3. User can mark done or snooze from notification
```

### Assistant Conversations
```typescript
// Assistant sends proactive reminder about upcoming events
// User can reply directly from notification
// Conversation continues seamlessly in chat interface
```

## Platform Support

### iOS
- Native notification categories with action buttons
- Background notification handling
- Proper permission management

### Android
- Custom notification channels
- Action buttons with proper theming
- Background/foreground handling

### Web
- Basic notification support where available
- Graceful fallback for unsupported features

## Testing

### Manual Testing Steps
1. **Event Reminders**:
   - Create event via assistant: "Schedule lunch tomorrow at 12pm"
   - Wait for reminder notification (or set short reminder time)
   - Test "Snooze 5min" and "View Event" actions

2. **Reminder Notifications**:
   - Create reminder: "Remind me to take medicine in 1 minute"
   - Wait for notification
   - Test "Mark Done" and "Snooze" actions

3. **Assistant Messages**:
   - Trigger assistant notification (can be simulated)
   - Test "Reply" action
   - Verify conversation continues in chat

### Automated Testing
- Notification scheduling and cancellation
- Data type safety and conversion
- Error handling for missing notification data

## Troubleshooting

### Common Issues
1. **Permissions not granted**: Check device notification settings
2. **Notifications not appearing**: Verify proper initialization and platform support
3. **Actions not working**: Check notification category setup

### Debug Information
- Use `notificationService.getScheduledNotifications()` to check pending notifications
- Monitor console logs for notification errors
- Test in development and production builds

## Future Enhancements

### Planned Features
1. **Smart Reminders**: AI-powered reminder suggestions
2. **Location-Based**: Geofenced reminders and events
3. **Voice Replies**: Voice-to-text responses from notifications
4. **Rich Notifications**: Images, progress bars, and interactive elements
5. **Cross-Device Sync**: Notification state sync across devices

### Technical Improvements
1. **Better Error Handling**: More robust error recovery
2. **Performance**: Optimized notification scheduling
3. **Analytics**: Track notification engagement
4. **Personalization**: Adaptive notification timing and content
