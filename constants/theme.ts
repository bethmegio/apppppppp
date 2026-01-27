/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const darkBlue = '#00008B';
const skyBlue = '#87CEEB';
const white = '#FFFFFF';

export const Colors = {
  light: {
    text: darkBlue,
    background: white,
    tint: skyBlue,
    icon: darkBlue + '80', // Dark Blue with opacity
    tabIconDefault: darkBlue + '80',
    tabIconSelected: skyBlue,
    darkBlue: darkBlue,
    skyBlue: skyBlue,
    white: white,
  },
  dark: {
    text: white,
    background: darkBlue,
    tint: skyBlue,
    icon: skyBlue + '80',
    tabIconDefault: skyBlue + '80',
    tabIconSelected: white,
    darkBlue: darkBlue,
    skyBlue: skyBlue,
    white: white,
  },
};

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
