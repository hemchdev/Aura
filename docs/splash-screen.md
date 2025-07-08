# Splash Screen Implementation

This document explains how the splash screen is implemented in the Aura personal assistant app.

## Overview

The splash screen provides a smooth loading experience while the app initializes its core services, loads user authentication state, and prepares the UI.

## Configuration

### App Config (app.json)

The splash screen is configured using the `expo-splash-screen` plugin in `app.json`:

```json
[
  "expo-splash-screen",
  {
    "backgroundColor": "#8B5CF6",
    "image": "./assets/images/icon.png",
    "dark": {
      "image": "./assets/images/icon.png",
      "backgroundColor": "#1a1a1a"
    },
    "imageWidth": 200,
    "resizeMode": "contain"
  }
]
```

### Features:
- **Light Theme**: Purple background (#8B5CF6) with app icon
- **Dark Theme**: Dark background (#1a1a1a) with app icon
- **Responsive**: 200px image width with contain resize mode
- **Animation**: 1000ms fade out duration

## Implementation Details

### Root Layout (`app/_layout.tsx`)

The splash screen logic is implemented in the root layout:

1. **Prevent Auto Hide**: `SplashScreen.preventAutoHideAsync()` prevents the splash screen from hiding automatically
2. **Animation Config**: `SplashScreen.setOptions()` configures fade animation
3. **Loading State**: App tracks loading state with `appIsReady` 
4. **Initialization**: Performs async initialization tasks:
   - Auth store initialization
   - Screen info logging
   - Simulated loading delay (removable in production)
5. **Layout Callback**: Uses `onLayoutRootView` to hide splash screen when UI is ready

### Key Functions:

```typescript
// Configure animation
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

// Hide when app is ready and layout is complete
const onLayoutRootView = useCallback(() => {
  if (appIsReady) {
    SplashScreen.hide();
  }
}, [appIsReady]);
```

## Custom Splash Screen Component

A custom splash screen component is available at `components/SplashScreen.tsx` for additional customization needs:

- Uses app's theme colors
- Displays app logo and branding
- Shows loading indicator
- Supports custom onReady callback

## Testing

### Development
- **Expo Go**: Shows app icon instead of full splash screen
- **Development Builds**: Limited splash screen property support
- **Web**: Full splash screen experience

### Production
- **Release Builds**: Complete splash screen experience
- Test on actual devices for accurate representation

## Customization

### Colors
Update the `backgroundColor` values in `app.json` to match your brand:

```json
{
  "backgroundColor": "#your-color",
  "dark": {
    "backgroundColor": "#your-dark-color"
  }
}
```

### Image
Replace `./assets/images/icon.png` with your custom splash screen image:

```json
{
  "image": "./assets/images/your-splash-image.png"
}
```

### Animation Duration
Adjust the fade duration in `app/_layout.tsx`:

```typescript
SplashScreen.setOptions({
  duration: 2000, // 2 seconds
  fade: true,
});
```

### Loading Time
Modify or remove the simulated loading delay:

```typescript
// Remove this line for instant loading
await new Promise(resolve => setTimeout(resolve, 1500));
```

## Best Practices

1. **Quick Loading**: Keep initialization tasks lightweight
2. **Error Handling**: Wrap initialization in try/catch blocks
3. **User Feedback**: Show loading indicators for longer operations
4. **Theme Consistency**: Match splash colors with app theme
5. **Testing**: Always test on release builds for production experience

## Troubleshooting

### Common Issues:
- **Splash screen doesn't hide**: Check `appIsReady` state and `onLayoutRootView` callback
- **White flash**: Ensure `onLayoutRootView` is called after UI is ready
- **Wrong colors**: Verify `backgroundColor` settings in config
- **Image not showing**: Check image path and file existence

### Debug Steps:
1. Check console logs for initialization errors
2. Verify `appIsReady` state changes
3. Confirm `SplashScreen.hide()` is called
4. Test on physical device for accurate experience
