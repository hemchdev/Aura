import { Colors, type ColorScheme } from '@/constants/Colors';
import { useThemeStore } from '@/stores/useThemeStore';

export function useColors() {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  return Colors[resolvedTheme as ColorScheme];
}