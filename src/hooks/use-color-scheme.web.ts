import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Web color scheme hook — mirrors native API for shared theming.
 */
export function useColorScheme() {
  return useRNColorScheme() ?? 'light';
}
