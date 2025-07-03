# Aura - AI Assistant Mobile App

An intelligent mobile assistant app built with React Native and Expo that provides voice-controlled calendar management, reminders, and smart notifications.

## Features

- **Voice Recognition**: Cross-platform speech-to-text functionality
- **AI Assistant**: Powered by Google Gemini for natural language processing
- **Calendar Management**: Create, update, and delete events with voice commands
- **Smart Reminders**: Set and manage reminders with AI assistance
- **Notifications**: Intelligent notification system with interactive responses
- **Dark Mode**: Full dark/light theme support
- **Authentication**: Secure OTP-based authentication via Supabase

## Tech Stack

- **Framework**: React Native with Expo
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Navigation**: Expo Router
- **Speech**: @react-native-voice/voice
- **Notifications**: expo-notifications
- **State Management**: Zustand
- **Styling**: React Native StyleSheet with custom theme system

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Aura
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Configure Supabase**
   - Create a new Supabase project
   - Run the SQL migrations from `supabase/migrations/`
   - Update the environment variables with your project credentials

5. **Set up Google Gemini API**
   - Get an API key from Google AI Studio
   - Add it to your environment variables

## Development

### Running the App

```bash
# Start the development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios

# Run on web
npx expo start --web
```

### Building for Production

```bash
# Build for Android
npx expo build:android

# Build for iOS
npx expo build:ios

# EAS Build (recommended)
npx eas build --platform android
npx eas build --platform ios
```

## Project Structure

```
app/
├── (auth)/           # Authentication screens
├── (tabs)/           # Main tab navigation screens
├── auth/             # Additional auth screens
├── _layout.tsx       # Root layout
├── index.tsx         # Home screen
└── onboarding.tsx    # Onboarding flow

lib/
├── assistantCalendarService.ts  # AI calendar operations
├── gemini.ts                    # Google Gemini integration
├── notificationService.ts       # Notification management
├── speech.ts                    # Text-to-speech
├── speechRecognition.ts         # Speech-to-text
├── supabase.ts                  # Database client
└── platformUtils.ts             # Platform utilities

components/
├── ui/               # Reusable UI components
└── ...

stores/
├── useAuthStore.ts   # Authentication state
└── useThemeStore.ts  # Theme state

types/
├── database.ts       # Database types
└── web-speech.d.ts   # Speech API types
```

## Key Features

### Voice Assistant
- Natural language processing for calendar and reminder commands
- Cross-platform speech recognition
- Voice feedback and confirmations

### Calendar Management
- Create events with voice commands
- Smart scheduling and conflict detection
- Integration with device calendar

### Notifications
- Smart notification scheduling
- Interactive notification responses
- Background notification handling

### Authentication
- OTP-based sign-in/sign-up
- Secure session management
- Profile management

## Environment Configuration

The app requires the following environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `EXPO_PUBLIC_GEMINI_API_KEY`: Your Google Gemini API key

## Database Schema

The app uses Supabase with the following main tables:

- `profiles`: User profiles
- `events`: Calendar events
- `reminders`: User reminders
- `notifications`: Notification logs

See `supabase/migrations/` for the complete schema.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Acknowledgments

- Google Gemini for AI capabilities
- Supabase for backend services
- Expo team for the excellent development platform
- React Native community for the ecosystem
