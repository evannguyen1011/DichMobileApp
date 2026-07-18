import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: SymbolViewProps['name'];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, icon, disabled, style }: ButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: disabled ? theme.border : pressed ? theme.primaryPressed : theme.primary,
        },
        style,
      ]}
    >
      {icon ? <SymbolView name={icon} tintColor="#FFFFFF" size={18} /> : null}
      <Text style={[styles.label, { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, icon, disabled, style }: ButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles.outlined,
        {
          borderColor: theme.border,
          backgroundColor: pressed ? theme.card : theme.background,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon ? <SymbolView name={icon} tintColor={theme.text} size={18} /> : null}
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, icon, disabled, style }: ButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? theme.card : 'transparent', opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {icon ? <SymbolView name={icon} tintColor={theme.textSecondary} size={18} /> : null}
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  outlined: {
    borderWidth: 1.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
});
