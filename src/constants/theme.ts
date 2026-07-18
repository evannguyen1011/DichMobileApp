/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1220',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    primary: '#1657F0',
    primaryPressed: '#1148CC',
    primarySoft: '#EAF1FE',
    primarySoftBorder: '#D3E3FD',
    success: '#22C55E',
    border: '#E5E7EB',
    card: '#F7F8FA',
    chatBubbleMine: '#EAF1FE',
    chatBubbleTheirs: '#F7F8FA',
    danger: '#EF4444',
    star: '#F5A623',
  },
  dark: {
    text: '#F2F4F8',
    background: '#0B0D10',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: '#4C82F7',
    primaryPressed: '#6E99F8',
    primarySoft: '#152238',
    primarySoftBorder: '#233657',
    success: '#34D399',
    border: '#2A2D33',
    card: '#16181C',
    chatBubbleMine: '#152238',
    chatBubbleTheirs: '#16181C',
    danger: '#F87171',
    star: '#F5C24C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
