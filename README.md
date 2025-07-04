# Aura - AI-Powered Personal Assistant

<div align="center">

![Aura Logo](./assets/images/icon.png)

*An intelligent, voice-controlled personal assistant app*

[![Made with Expo](https://img.shields.io/badge/Made%20with-Expo-000000.svg?style=flat&logo=expo&labelColor=000000&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.79.5-blue.svg?style=flat&logo=react&logoColor=white)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

An intelligent mobile assistant app built with React Native and Expo that provides voice-controlled calendar management, reminders, and smart notifications with cross-platform compatibility. Powered by Google Gemini AI for natural language processing and featuring a modern, responsive UI with dark/light mode support.

## 🌟 Features

### 🎙️ Voice Assistant
- **Natural Language Processing**: Powered by Google Gemini AI for intelligent conversation
- **Cross-Platform Speech Recognition**: Works on Android, iOS, and Web
- **Voice Commands**: Create, update, and delete events/reminders using voice
- **Speech Feedback**: Text-to-speech responses for accessibility

### 📅 Calendar Management
- **Smart Event Creation**: AI-powered event scheduling with natural language
- **Calendar Integration**: Seamless integration with device calendar
- **Conflict Detection**: Intelligent scheduling to avoid overlapping events
- **Event CRUD Operations**: Full create, read, update, delete functionality

### 🔔 Smart Notifications
- **Intelligent Scheduling**: Automated reminder notifications
- **Interactive Notifications**: Reply and interact directly from notifications
- **Background Processing**: Reliable notification delivery
- **Custom Categories**: Organized notification types

### 🎨 User Experience
- **Dark/Light Mode**: Automatic theme switching with system preference
- **Responsive Design**: Optimized for all screen sizes and orientations
- **Smooth Animations**: Polished UI transitions and interactions
- **Error Boundaries**: Graceful error handling with user-friendly messages

### 🔐 Authentication & Security
- **OTP-Based Authentication**: Secure email-based sign-in/sign-up
- **Profile Management**: Customizable user profiles with settings
- **Session Management**: Secure session handling across devices
- **Privacy-First**: No password storage, secure token-based auth

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React Native with Expo SDK 53 |
| **Navigation** | Expo Router with typed routes |
| **Database** | Supabase (PostgreSQL) with RLS |
| **AI/ML** | Google Gemini Pro API |
| **Speech** | @react-native-voice/voice |
| **Notifications** | expo-notifications |
| **State Management** | Zustand |
| **Styling** | React Native StyleSheet + Custom Theme |
| **Development** | TypeScript, ESLint, Metro |
| **Build/Deploy** | EAS Build, Expo Dev Client |

## 📋 Prerequisites

Before getting started, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Package Manager**: npm, yarn, or pnpm
- **Expo CLI**: Install globally with `npm install -g @expo/cli`
- **Git**: For version control
- **Code Editor**: VS Code recommended with React Native extensions

### For Local Development:
- **Android**: Android Studio + Android SDK 34+ (for Android builds)
- **iOS**: Xcode 15+ and Command Line Tools (macOS only, for iOS builds)
- **EAS Account**: [Sign up](https://expo.dev/) for cloud builds (recommended)

### For Testing:
- **Physical Device**: Expo Go app for quick testing
- **Emulator/Simulator**: Android Virtual Device (AVD) or iOS Simulator

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd Aura

# Install dependencies
npm install
# or
yarn install
```

### 2. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

> ⚠️ **Important**: Never commit your `.env` file to version control. Add it to `.gitignore`.

**Getting Your API Keys:**

- **Supabase**: 
  1. Create account at [supabase.com](https://supabase.com)
  2. Create new project
  3. Go to Settings → API to find your URL and anon key
  
- **Google Gemini**: 
  1. Visit [Google AI Studio](https://makersuite.google.com/)
  2. Create API key for Gemini Pro
  3. Enable Generative Language API in Google Cloud Console

### 3. Supabase Database Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Set up database schema** by running the SQL migrations:
   ```sql
   -- Navigate to Supabase Dashboard → SQL Editor
   -- Copy and execute the SQL from supabase/migrations/ files:
   
   -- 1. First run: 20250629140123_muddy_sound.sql
   -- 2. Then run: fix_delete_policies.sql
   ```

3. **Configure Row Level Security (RLS)**:
   - Tables `profiles`, `events`, `reminders` should have RLS enabled
   - Policies allow users to access only their own data
   - Authentication required for all operations

4. **Test the connection**:
   ```bash
   # Verify connection in your app
   npx expo start
   # Check for connection errors in development tools
   ```

### 4. Google Gemini API Setup

1. **Get API Key** from [Google AI Studio](https://makersuite.google.com/)
2. **Enable APIs** in Google Cloud Console:
   - Generative Language API
   - (Optional) Cloud Translation API for multi-language support
3. **Set usage quotas** to prevent unexpected charges
4. **Test API access**:
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"
   ```

### 5. Run the App

```bash
# Start development server
npx expo start
# or with yarn
yarn expo start

# Run on specific platforms
npx expo start --android     # Android emulator/device
npx expo start --ios         # iOS simulator/device  
npx expo start --web         # Web browser

# Build and run locally (requires native setup)
npx expo run:android         # Local Android build
npx expo run:ios            # Local iOS build (macOS only)

# Clear cache if needed
npx expo start --clear
```

#### First Time Setup
1. **Install Expo Go** app on your mobile device
2. **Scan QR code** from the terminal
3. **Or use emulator/simulator** for testing
4. **Enable permissions** when prompted (microphone, notifications)

#### Troubleshooting First Run
- If you see metro bundler errors, try `npx expo install --fix`
- For Android: Ensure USB debugging is enabled
- For iOS: Trust the developer certificate in Settings
- For web: Use a modern browser (Chrome, Firefox, Safari)

## 🏗️ Project Structure

```
Aura/
├── 📱 app/                          # App screens (Expo Router)
│   ├── (auth)/                      # Authentication flow
│   │   ├── index.tsx               # Sign-in screen
│   │   └── sign-up.tsx             # Sign-up screen
│   ├── (tabs)/                      # Main app tabs
│   │   ├── index.tsx               # AI Assistant tab
│   │   ├── calendar.tsx            # Calendar management
│   │   ├── reminders.tsx           # Reminders list
│   │   └── settings.tsx            # User settings
│   ├── auth/
│   │   └── confirm.tsx             # OTP confirmation
│   ├── _layout.tsx                 # Root layout with providers
│   ├── index.tsx                   # App entry point
│   └── +not-found.tsx              # 404 error page
│
├── 🧩 components/                   # Reusable UI components
│   └── ErrorBoundary.tsx           # Error boundary component
│
├── 🎨 constants/                    # App constants
│   └── Colors.ts                   # Theme color definitions
│
├── 🪝 hooks/                       # Custom React hooks
│   ├── useColors.ts                # Theme color hook
│   ├── useFrameworkReady.ts        # Framework initialization
│   └── useResponsiveScreen.ts      # Responsive design utilities
│
├── 📚 lib/                         # Core business logic
│   ├── assistantCalendarService.ts # AI calendar operations
│   ├── gemini.ts                   # Google Gemini integration
│   ├── notificationService.ts      # Notification management
│   ├── platformUtils.ts            # Platform-specific utilities
│   ├── speech.ts                   # Text-to-speech service
│   ├── speechRecognition.ts        # Speech-to-text service
│   └── supabase.ts                 # Supabase client
│
├── 🔌 plugins/                     # Expo config plugins
│   └── withAndroidManifestFix.js   # Android build fixes
│
├── 🏪 stores/                      # State management (Zustand)
│   ├── useAuthStore.ts             # Authentication state
│   └── useThemeStore.ts            # Theme state
│
├── 🗄️ supabase/                    # Database schema
│   └── migrations/                 # SQL migration files
│
├── 📝 types/                       # TypeScript definitions
│   ├── database.ts                 # Database types
│   └── web-speech.d.ts            # Speech API types
│
├── 🎯 assets/                      # Static assets
│   └── images/                     # App icons and images
│
├── ⚙️ Configuration Files
├── app.json                        # Expo configuration
├── eas.json                        # EAS Build configuration
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── metro.config.js                 # Metro bundler configuration
```

## 🔧 Development

### Available Scripts

```bash
# Development
yarn dev                    # Start Expo dev server (alias for expo start)
yarn expo start            # Start development server
yarn android               # Run on Android device/emulator
yarn ios                   # Run on iOS device/simulator

# Building & Deployment
yarn build:web             # Build optimized web bundle
yarn lint                  # Run ESLint code analysis

# EAS Build (Cloud Building)
eas build --platform android    # Build Android APK/AAB
eas build --platform ios        # Build iOS IPA
eas build --platform all        # Build for both platforms
eas submit                       # Submit to app stores

# Development Tools
expo doctor                      # Check development environment
expo install --fix              # Fix dependency compatibility
npx expo start --clear          # Clear Metro cache and restart
```

### EAS Build Configuration

The project includes optimized EAS build profiles in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "aab" }
    }
  }
}
```

### Key Development Features

- **Hot Reloading**: Instant code updates during development
- **TypeScript**: Full type safety and IntelliSense
- **Error Boundaries**: Graceful error handling in production
- **Cross-Platform**: Single codebase for Android, iOS, and Web
- **EAS Build**: Cloud-based building and deployment

## 📊 Core Features Deep Dive

### 🤖 AI Assistant

The AI assistant uses Google Gemini Pro for natural language understanding:

```typescript
// Example AI interaction
const response = await gemini.generateContent({
  prompt: "Create a meeting with John tomorrow at 2 PM",
  context: userCalendarData
});
```

**Capabilities:**
- Event creation from natural language
- Smart scheduling with conflict detection
- Reminder management
- Calendar query and search
- Multi-turn conversations

### 🗣️ Voice Recognition

Cross-platform speech-to-text implementation:

```typescript
// Speech recognition example
const transcription = await speechRecognition.startListening();
await assistantService.processCommand(transcription);
```

**Features:**
- Real-time speech-to-text
- Noise cancellation
- Multiple language support
- Platform-specific optimizations

### 📅 Calendar Integration

Smart calendar management with AI assistance:

```typescript
// AI-powered event creation
const event = await assistantCalendarService.createEvent({
  description: "Team standup meeting",
  naturalLanguage: "Every weekday at 9 AM",
  duration: 30
});
```

**Capabilities:**
- Natural language event parsing
- Recurring event support
- Conflict detection and resolution
- Integration with device calendar
- Smart time zone handling

### 🔔 Notification System

Intelligent notification management:

```typescript
// Smart notification scheduling
await notificationService.scheduleEventReminder({
  eventId: event.id,
  reminderTime: "15 minutes before",
  isRecurring: true
});
```

**Features:**
- AI-powered reminder suggestions
- Interactive notifications
- Background processing
- Custom notification categories
- Cross-platform delivery

## 🔒 Security & Privacy

### Authentication Flow
1. **Email Input**: User enters email address
2. **OTP Generation**: Secure 6-digit code sent via email
3. **Verification**: Code verification creates secure session
4. **Profile Creation**: User profile with preferences
5. **Session Management**: Automatic token refresh

### Data Protection
- **Row Level Security (RLS)**: Database-level access control
- **Client-Side Validation**: Input sanitization and validation
- **Secure Token Storage**: Platform-specific secure storage
- **No Password Storage**: OTP-only authentication
- **Encrypted Communications**: HTTPS/WSS for all API calls

## 🌐 Cross-Platform Support

### Platform-Specific Features

| Feature | Android | iOS | Web |
|---------|---------|-----|-----|
| Voice Recognition | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ⚠️* |
| Background Tasks | ✅ | ✅ | ❌ |
| File System Access | ✅ | ✅ | ⚠️* |
| Device Calendar | ✅ | ✅ | ❌ |

*Limited functionality on web platform

### Responsive Design
- **Mobile-First**: Optimized for smartphone screens
- **Tablet Support**: Enhanced layouts for larger screens
- **Desktop Web**: Responsive design for desktop browsers
- **Adaptive UI**: Dynamic layouts based on screen size

## 🚀 Deployment

### Development Build
```bash
# Install on device for testing
eas build --profile development --platform android
eas device:create  # Register test devices
```

### Production Build
```bash
# Build for app stores
eas build --profile production --platform android
eas build --profile production --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

### Environment Configuration
- **Development**: Local development with hot reloading
- **Preview**: Internal testing builds
- **Production**: App store releases

## 🧪 Testing & Quality Assurance

### Manual Testing Checklist

#### 🔐 Authentication Flow
- [ ] Sign-up with valid email address
- [ ] Receive OTP code via email
- [ ] Verify OTP and complete profile setup
- [ ] Sign-in with existing account
- [ ] Handle invalid/expired OTP codes
- [ ] Profile name saves correctly after sign-up
- [ ] Session persistence across app restarts

#### 🎙️ Voice Recognition
- [ ] Microphone permission granted
- [ ] Speech-to-text accuracy (90%+ for clear speech)
- [ ] Background noise handling
- [ ] Multiple language support
- [ ] Voice commands trigger correct actions
- [ ] Fallback to text input when speech fails

#### 📅 Calendar Management
- [ ] Create events with natural language
- [ ] Edit existing events
- [ ] Delete events with confirmation
- [ ] View calendar in different formats
- [ ] Recurring event creation
- [ ] Conflict detection works correctly
- [ ] Time zone handling

#### 🔔 Notifications
- [ ] Notification permissions enabled
- [ ] Scheduled reminders arrive on time
- [ ] Interactive notification actions
- [ ] Background notification delivery
- [ ] Notification sound and vibration
- [ ] Notification categories work correctly

#### 🎨 User Interface
- [ ] Dark/light mode switching
- [ ] Responsive design on different screen sizes
- [ ] Smooth animations and transitions
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Accessibility features (screen readers)

#### 🌐 Cross-Platform
- [ ] Android functionality (API 24+)
- [ ] iOS functionality (iOS 13+)
- [ ] Web functionality (modern browsers)
- [ ] Feature parity across platforms
- [ ] Platform-specific optimizations

### Automated Testing Framework

The project supports automated testing with Jest and React Native Testing Library:

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### Example Test Structure
```typescript
// __tests__/auth.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignInScreen from '../app/(auth)/index';

describe('Authentication', () => {
  it('should handle valid email input', async () => {
    const { getByPlaceholderText, getByText } = render(<SignInScreen />);
    
    fireEvent.changeText(
      getByPlaceholderText('Enter your email'),
      'test@example.com'
    );
    
    fireEvent.press(getByText('Send OTP'));
    
    await waitFor(() => {
      expect(getByText('OTP sent successfully')).toBeTruthy();
    });
  });
});
```

### Performance Testing

#### Performance Metrics
- **Cold Start**: < 3 seconds on mid-range devices
- **Hot Reload**: < 1 second during development
- **Bundle Size**: < 25 MB total app size
- **Memory Usage**: < 150 MB on average
- **Battery Usage**: Minimal impact during background operation

#### Performance Monitoring
```typescript
// Performance tracking
import { Performance } from 'react-native-performance';

// Measure component render time
const renderStart = Performance.now();
// Component render logic
const renderTime = Performance.now() - renderStart;
console.log(`Render time: ${renderTime}ms`);
```

### Testing on Different Devices

#### Recommended Test Devices
- **Android**: Pixel 6/7, Samsung Galaxy S21+, OnePlus 9
- **iOS**: iPhone 12/13/14, iPad Air, iPad Pro
- **Web**: Chrome 100+, Firefox 95+, Safari 15+

#### Device-Specific Testing
- **Low-end devices**: Test performance on older hardware
- **Different screen sizes**: Tablet and phone layouts
- **Operating system versions**: Minimum supported versions
- **Network conditions**: Test offline/poor connectivity

### Quality Gates

Before releasing, ensure all quality gates pass:

1. **✅ All tests pass** (unit, integration, E2E)
2. **✅ Code coverage** > 80%
3. **✅ ESLint checks** pass with no errors
4. **✅ TypeScript compilation** successful
5. **✅ Bundle size** within limits
6. **✅ Performance benchmarks** met
7. **✅ Security scan** passed
8. **✅ Accessibility audit** completed

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 🔴 Build Errors

**Metro bundler issues:**
```bash
# Clear all caches
npx expo start --clear
rm -rf node_modules
npm install

# Check for conflicting dependencies
expo doctor
npx expo install --fix
```

**Android build failures:**
```bash
# Common Android fixes
cd android && ./gradlew clean && cd ..
expo run:android --clear

# Check Android SDK and build tools
# Ensure ANDROID_HOME is set correctly
echo $ANDROID_HOME  # Should point to Android SDK
```

**iOS build failures (macOS only):**
```bash
# Clear Xcode cache
rm -rf ~/Library/Developer/Xcode/DerivedData
cd ios && xcodebuild clean && cd ..

# Update CocoaPods
cd ios && pod deintegrate && pod install && cd ..
```

#### 🔴 Runtime Errors

**Authentication issues:**
1. Verify Supabase URL and anon key in `.env`
2. Check RLS policies are configured correctly
3. Ensure email service is enabled in Supabase Auth settings

**Voice recognition not working:**
1. Grant microphone permissions in device settings
2. Test on physical device (simulators may have limitations)
3. Check `@react-native-voice/voice` installation

**Notifications not appearing:**
1. Enable notification permissions in device settings
2. Test on physical device (not simulator)
3. Check `expo-notifications` configuration in app.json

**Gemini AI errors:**
1. Verify API key is valid and active
2. Check API quotas in Google Cloud Console
3. Ensure Generative Language API is enabled

#### 🔴 Development Environment

**Expo Go connection issues:**
```bash
# Ensure devices are on same network
# Use tunnel mode if local network doesn't work
npx expo start --tunnel

# For Windows/corporate networks
npx expo start --localhost
```

**TypeScript errors:**
```bash
# Regenerate types
npx expo customize tsconfig.json
npm run type-check

# Fix common type issues
npx expo install --fix
```

#### 🔴 Platform-Specific Issues

**Android-specific:**
- Enable Developer Options and USB Debugging
- Check Android SDK version (requires SDK 34+)
- Verify device supports API level 24+

**iOS-specific:**
- Ensure Xcode 15+ is installed
- iOS deployment target set to 13.0+
- Valid Apple Developer account for device testing

**Web-specific:**
- Use modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- Enable microphone permissions in browser
- Some features limited on web platform

### Debug Mode & Logging

Enable comprehensive logging for troubleshooting:

```typescript
// In development, enable debug logs
if (__DEV__) {
  console.log('Debug mode enabled');
  // Add detailed logging in your services
}
```

**Flipper Integration** (for advanced debugging):
```bash
# Install Flipper desktop app
# Enable Flipper in your Expo development build
eas build --profile development --platform android
```

### Performance Issues

**App running slowly:**
1. Check for memory leaks in React components
2. Optimize image sizes and formats
3. Use React.memo() for expensive components
4. Implement lazy loading for large lists

**Bundle size too large:**
```bash
# Analyze bundle size
npx expo export --source-maps
npx react-native-bundle-visualizer

# Remove unused dependencies
npm uninstall <unused-package>
```

### Getting Help

If you're still experiencing issues:

1. **Check existing issues**: [GitHub Issues](https://github.com/your-repo/aura/issues)
2. **Expo documentation**: [docs.expo.dev](https://docs.expo.dev/)
3. **React Native troubleshooting**: [reactnative.dev/docs/troubleshooting](https://reactnative.dev/docs/troubleshooting)
4. **Community support**: [Expo Discord](https://chat.expo.dev/) or [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

**When reporting issues, please include:**
- Operating system and version
- Node.js and Expo CLI versions
- Complete error messages
- Steps to reproduce the issue
- Device/emulator information

## 📈 Performance Metrics

### App Performance
- **Cold Start**: < 3 seconds
- **Hot Reload**: < 1 second
- **Bundle Size**: < 15 MB
- **Memory Usage**: < 100 MB average

### API Performance
- **Speech Recognition**: < 2 seconds
- **AI Response**: < 3 seconds
- **Database Queries**: < 500ms
- **Notification Delivery**: < 5 seconds

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help makes Aura better for everyone.

### 🚀 Quick Start for Contributors

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/aura.git
   cd aura
   ```
3. **Set up development environment** following the [Quick Start](#-quick-start) guide
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. **Make your changes** and test thoroughly
6. **Commit with conventional commits**:
   ```bash
   git commit -m "feat: add voice command for weather"
   ```
7. **Push to your fork** and create a pull request

### 📝 Development Guidelines

#### Code Style & Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Follow Expo recommended rules
- **Prettier**: Consistent code formatting
- **File naming**: Use kebab-case for files, PascalCase for components
- **Import order**: External libraries → Internal modules → Relative imports

#### Commit Message Convention
Use [Conventional Commits](https://conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
feat(auth): add biometric authentication
fix(calendar): resolve timezone display issue
docs(readme): update installation instructions
```

### 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected vs actual behavior**
4. **Environment details**:
   - Device/OS version
   - App version
   - Node.js and Expo CLI versions
5. **Screenshots or videos** (if applicable)
6. **Error logs** from console/crash reports

Use the bug report template:
```markdown
## Bug Description
[Clear description of the bug]

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: [iOS 16.1, Android 13, Windows 11]
- Device: [iPhone 14, Pixel 7, etc.]
- App Version: [1.0.0]
- Expo SDK: [53.0.17]

## Additional Context
[Any other relevant information]
```

### 💡 Feature Requests

We love hearing about new feature ideas! Please:

1. **Check existing issues** to avoid duplicates
2. **Describe the problem** you're trying to solve
3. **Propose a solution** with detailed explanation
4. **Consider alternatives** you've thought about
5. **Provide use cases** and examples

### 🔍 Code Review Process

All contributions go through code review:

1. **Automated checks** must pass (CI/CD pipeline)
2. **At least one maintainer** reviews the code
3. **Address feedback** and make requested changes
4. **Maintainer approval** required before merge

**What we look for:**
- Code quality and maintainability
- Adherence to coding standards
- Proper error handling
- Performance considerations
- Security implications
- Test coverage
- Documentation updates

### 🏗️ Development Areas

Here are some areas where we especially welcome contributions:

#### 🚧 High Priority
- [ ] **Accessibility improvements** (screen reader support, keyboard navigation)
- [ ] **Performance optimizations** (faster loading, reduced memory usage)
- [ ] **Test coverage** (unit tests, integration tests)
- [ ] **Documentation** (code comments, user guides, tutorials)

#### 🛠️ Medium Priority
- [ ] **New AI features** (natural language improvements, new commands)
- [ ] **Calendar integrations** (Google Calendar, Outlook, iCal)
- [ ] **Notification enhancements** (smart timing, priority management)
- [ ] **UI/UX improvements** (animations, micro-interactions)

#### 🔮 Future Enhancements
- [ ] **Multi-language support** (internationalization)
- [ ] **Team/shared calendars** (collaboration features)
- [ ] **Voice customization** (different voices, accents)
- [ ] **Advanced AI features** (context awareness, learning from habits)

### 🎯 Getting Started with Contributions

#### Good First Issues
Look for issues labeled `good first issue` - these are perfect for new contributors:
- Documentation improvements
- UI refinements
- Small bug fixes
- Adding tests

#### Setting Up Development Environment
1. Follow the [Quick Start](#-quick-start) guide
2. Install development tools:
   ```bash
   # Install recommended VS Code extensions
   code --install-extension ms-vscode.vscode-typescript-next
   code --install-extension bradlc.vscode-tailwindcss
   code --install-extension ms-vscode.vscode-react-native
   ```
3. Set up pre-commit hooks:
   ```bash
   npx husky install
   npx husky add .husky/pre-commit "npm run lint"
   ```

### 📚 Resources for Contributors

- **React Native Docs**: [reactnative.dev](https://reactnative.dev/)
- **Expo Docs**: [docs.expo.dev](https://docs.expo.dev/)
- **TypeScript Handbook**: [typescriptlang.org](https://www.typescriptlang.org/docs/)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Project Discussions**: [GitHub Discussions](https://github.com/your-repo/aura/discussions)

### 🏆 Recognition

Contributors are recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page
- **Special mentions** in project announcements

### 📞 Getting Help

Need help with contributing?
- 💬 Join our [Discord community](https://discord.gg/aura-dev)
- 🐛 Open a [discussion](https://github.com/your-repo/aura/discussions)
- 📧 Email maintainers: dev@aura-app.com
- 📖 Check our [development wiki](https://github.com/your-repo/aura/wiki)

Thank you for making Aura better! 🙏

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

### 📖 Documentation
- **README**: You're reading it! Complete setup and usage guide
- **API Reference**: [GitHub Wiki](https://github.com/your-repo/aura/wiki/API-Reference)
- **Architecture Guide**: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- **Feature Guides**:
  - [Calendar Features](./CALENDAR_FEATURES.md)
  - [Notification System](./NOTIFICATION_FEATURES.md)
  - [Android Crash Fix Guide](./ANDROID_CRASH_FIX.md)
  - [Sign-up Debug Guide](./SIGNUP_NAME_DEBUG.md)

### 🐛 Issues & Bug Reports
- **GitHub Issues**: [Report bugs or request features](https://github.com/your-repo/aura/issues)
- **Bug Report Template**: Use our template for faster resolution
- **Feature Requests**: [Discussions](https://github.com/your-repo/aura/discussions)

### 💬 Community Support
- **Discord Server**: [Join our community](https://discord.gg/aura-dev)
- **GitHub Discussions**: [Community Q&A](https://github.com/your-repo/aura/discussions)
- **Stack Overflow**: Tag questions with `aura-app`
- **Reddit**: [r/AuraApp](https://reddit.com/r/AuraApp)

### 📧 Direct Contact
- **General Support**: support@aura-app.com
- **Technical Issues**: tech@aura-app.com
- **Business Inquiries**: business@aura-app.com
- **Security Issues**: security@aura-app.com (PGP key available)

### 🚀 Enterprise Support
For businesses and organizations:
- **Priority support** with SLA guarantees
- **Custom feature development**
- **On-premise deployment** options
- **Integration assistance**
- **Training and consulting**

Contact: enterprise@aura-app.com

## 🙏 Acknowledgments

### 🛠️ Core Technologies
- **[Expo](https://expo.dev/)**: Amazing React Native platform and development tools
- **[React Native](https://reactnative.dev/)**: Cross-platform mobile development framework
- **[Supabase](https://supabase.com/)**: Open-source Firebase alternative with PostgreSQL
- **[Google Gemini](https://gemini.google.com/)**: Advanced AI for natural language processing
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe JavaScript development

### 📦 Key Dependencies
- **[@react-native-voice/voice](https://github.com/react-native-voice/voice)**: Cross-platform speech recognition
- **[Zustand](https://github.com/pmndrs/zustand)**: Lightweight state management
- **[React Navigation](https://reactnavigation.org/)**: Navigation library for React Native
- **[Lucide React Native](https://lucide.dev/)**: Beautiful icon library
- **[React Native Calendars](https://github.com/wix/react-native-calendars)**: Calendar components

### 🎨 Design & Assets
- **[Unsplash](https://unsplash.com/)**: High-quality stock photos
- **[Heroicons](https://heroicons.com/)**: Beautiful hand-crafted SVG icons
- **[Google Fonts](https://fonts.google.com/)**: Open-source font families
- **[Material Design](https://m3.material.io/)**: Design system inspiration

### 🌟 Community & Support
- **React Native Community**: For the amazing ecosystem and contributions
- **Expo Team**: For making React Native development accessible and enjoyable
- **Open Source Contributors**: All the maintainers of our dependencies
- **Beta Testers**: Early users who provided valuable feedback
- **Discord Community**: Active community members helping each other

### 📚 Learning Resources
- **[React Native Documentation](https://reactnative.dev/docs/getting-started)**
- **[Expo Documentation](https://docs.expo.dev/)**
- **[Supabase Learning Hub](https://supabase.com/docs)**
- **[React Navigation Docs](https://reactnavigation.org/docs/getting-started)**
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)**

### 🏆 Special Thanks
- **Early Adopters**: Users who trusted us from the beginning
- **Bug Reporters**: Community members who help improve the app
- **Feature Requesters**: Users who inspire new functionality
- **Code Contributors**: Developers who submit pull requests
- **Documentation Writers**: Contributors who improve our guides

### 💼 Business Support
- **Microsoft**: For GitHub and development tools
- **Google**: For Cloud Platform and AI services
- **Vercel**: For hosting our documentation
- **JetBrains**: For development IDE support

---

<div align="center">

**Built with ❤️ by the Aura Team and Community**

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=flat&logo=github)](https://github.com/your-repo/aura)
[![Discord](https://img.shields.io/badge/Discord-Community-7289da?style=flat&logo=discord&logoColor=white)](https://discord.gg/aura-dev)
[![Twitter](https://img.shields.io/badge/Twitter-Updates-1da1f2?style=flat&logo=twitter&logoColor=white)](https://twitter.com/aura_app)
[![Website](https://img.shields.io/badge/Website-aura--app.com-green?style=flat&logo=safari&logoColor=white)](https://aura-app.com)

*Making AI assistants more accessible and useful for daily life.*

**Last updated: January 2025 | Version 1.0.0**

</div>

## 🏛️ Architecture

### System Overview

```mermaid
graph TB
    A[React Native App] --> B[Expo Router]
    B --> C[Authentication Layer]
    C --> D[Main App Tabs]
    
    D --> E[AI Assistant]
    D --> F[Calendar]
    D --> G[Reminders]
    D --> H[Settings]
    
    E --> I[Speech Recognition]
    E --> J[Gemini AI]
    E --> K[Text-to-Speech]
    
    F --> L[Calendar Service]
    G --> M[Notification Service]
    
    I --> N[Voice Processing]
    J --> O[Natural Language Understanding]
    K --> P[Audio Output]
    
    L --> Q[Supabase Database]
    M --> Q
    C --> Q
    
    Q --> R[Row Level Security]
    Q --> S[Real-time Subscriptions]
```

### Data Flow

1. **User Input** → Voice or text input received
2. **Speech Processing** → Convert speech to text (if voice)
3. **AI Processing** → Gemini AI analyzes intent and entities
4. **Action Execution** → Perform calendar/reminder operations
5. **Database Update** → Store changes in Supabase
6. **UI Update** → Reflect changes in real-time
7. **Notification** → Schedule relevant reminders
8. **Voice Feedback** → Provide audio confirmation

### State Management

The app uses **Zustand** for lightweight, performant state management:

```typescript
// Auth Store
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Theme Store  
interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ColorScheme;
}
```

### Security Architecture

- **Authentication**: OTP-based, passwordless authentication
- **Authorization**: Row Level Security (RLS) in Supabase
- **Data Encryption**: HTTPS for all communications
- **Local Storage**: Expo SecureStore for sensitive data
- **API Security**: Environment variables for API keys
- **Input Validation**: Client and server-side validation

## 🔮 Roadmap

### 🚀 Current Version (v1.0.0)
- ✅ Voice-controlled AI assistant
- ✅ Calendar and reminder management
- ✅ Cross-platform support (Android, iOS, Web)
- ✅ Dark/light theme switching
- ✅ OTP-based authentication
- ✅ Smart notifications
- ✅ Natural language processing

### 🎯 Next Release (v1.1.0) - Q2 2025
- [ ] **Enhanced Voice Commands**
  - Multi-language support (Spanish, French, German)
  - Voice training for better accuracy
  - Custom wake word support
  
- [ ] **Calendar Integrations**
  - Google Calendar sync
  - Outlook integration
  - iCal import/export
  
- [ ] **Smart Features**
  - Meeting preparation suggestions
  - Travel time calculations
  - Weather-based event recommendations

### 🌟 Future Releases (v2.0.0+)
- [ ] **Team & Collaboration**
  - Shared calendars
  - Team meeting scheduling
  - Collaborative task management
  
- [ ] **Advanced AI**
  - Context-aware conversations
  - Learning from user patterns
  - Predictive scheduling
  
- [ ] **Extended Integrations**
  - Slack/Teams integration
  - Email client integration
  - Third-party app connections
  
- [ ] **Enterprise Features**
  - SSO authentication
  - Admin dashboard
  - Analytics and reporting

