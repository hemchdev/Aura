import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

interface ScreenData {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

interface ResponsiveData {
  screen: ScreenData;
  window: ScreenData;
  isSmallScreen: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  responsiveHeight: (height: number) => number;
  responsiveWidth: (width: number) => number;
  responsiveFontSize: (size: number) => number;
}

export const useResponsiveScreen = (): ResponsiveData => {
  const [screenData, setScreenData] = useState(() => {
    const screen = Dimensions.get('screen');
    const window = Dimensions.get('window');
    return { screen, window };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ screen, window }) => {
      setScreenData({ screen, window });
    });

    return () => subscription?.remove();
  }, []);

  const { screen, window } = screenData;
  
  // Screen classification
  const isSmallScreen = window.width < 375;
  const isTablet = window.width >= 768;
  const isLandscape = window.width > window.height;

  // Responsive functions
  const responsiveHeight = (height: number) => {
    const baseHeight = 812; // iPhone X height as base
    return (window.height / baseHeight) * height;
  };

  const responsiveWidth = (width: number) => {
    const baseWidth = 375; // iPhone X width as base
    return (window.width / baseWidth) * width;
  };

  const responsiveFontSize = (size: number) => {
    const scale = Math.min(window.width / 375, window.height / 812);
    return Math.max(12, size * scale * window.fontScale);
  };

  return {
    screen: {
      width: screen.width,
      height: screen.height,
      scale: screen.scale,
      fontScale: screen.fontScale,
    },
    window: {
      width: window.width,
      height: window.height,
      scale: window.scale,
      fontScale: window.fontScale,
    },
    isSmallScreen,
    isTablet,
    isLandscape,
    responsiveHeight,
    responsiveWidth,
    responsiveFontSize,
  };
};
