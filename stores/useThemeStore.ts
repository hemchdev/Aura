import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  updateResolvedTheme: (systemTheme: ResolvedTheme | null) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'light',

  setTheme: (theme: Theme) => {
    set({ theme });
    // Immediately update resolved theme
    const { updateResolvedTheme } = get();
    updateResolvedTheme(null);
  },

  updateResolvedTheme: (systemTheme: ResolvedTheme | null) => {
    const { theme } = get();
    let resolved: ResolvedTheme;
    
    if (theme === 'system') {
      resolved = systemTheme || 'light';
    } else {
      resolved = theme as ResolvedTheme;
    }
    
    set({ resolvedTheme: resolved });
  },
}));