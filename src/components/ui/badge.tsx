import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'neutral' | 'outline';

type Props = {
  label: string;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
};

export function Badge({ label, variant = 'primary', style }: Props) {
  const theme = useTheme();

  const backgroundColor =
    variant === 'primary' ? theme.primarySoft : variant === 'neutral' ? theme.card : 'transparent';
  const borderColor =
    variant === 'outline' ? theme.border : variant === 'primary' ? theme.primarySoftBorder : theme.border;
  const textColor = variant === 'primary' ? theme.primary : theme.textSecondary;

  return (
    <Text
      style={[
        styles.badge,
        { backgroundColor, borderColor, color: textColor },
        style,
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
});
