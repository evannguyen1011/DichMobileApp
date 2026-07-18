import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: SymbolViewProps['name'];
  title?: string;
  body: string;
  trailingIcon?: SymbolViewProps['name'];
};

export function HintBanner({ icon, title, body, trailingIcon }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.primarySoft, borderColor: theme.primarySoftBorder },
      ]}
    >
      <SymbolView name={icon} tintColor={theme.primary} size={20} style={styles.leadingIcon} />
      <View style={styles.textColumn}>
        {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
        <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      </View>
      {trailingIcon ? <SymbolView name={trailingIcon} tintColor={theme.success} size={18} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  leadingIcon: {
    marginTop: 1,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    fontSize: 12.5,
    lineHeight: 17,
  },
});
