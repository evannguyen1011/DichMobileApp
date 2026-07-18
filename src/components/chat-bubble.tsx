import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type ChatBubbleEntry = {
  id: string;
  sourceLang: string;
  targetLang: string;
  source: string;
  translated: string;
  time?: string;
};

function Line({
  langLabel,
  text,
  time,
  tinted,
}: {
  langLabel: string;
  text: string;
  time?: string;
  tinted: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.line,
        { backgroundColor: tinted ? theme.chatBubbleMine : theme.chatBubbleTheirs, borderColor: theme.border },
      ]}
    >
      <View style={styles.lineHeader}>
        <Text style={[styles.langLabel, { color: tinted ? theme.primary : theme.textSecondary }]}>
          {langLabel}
        </Text>
        {time ? <Text style={[styles.time, { color: theme.textSecondary }]}>{time}</Text> : null}
      </View>
      <View style={styles.lineBody}>
        <Text style={[styles.text, { color: theme.text, fontWeight: tinted ? '600' : '400' }]}>{text}</Text>
        <SymbolView
          name={{ ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' }}
          tintColor={theme.textSecondary}
          size={14}
        />
      </View>
    </View>
  );
}

export function ChatBubble({ entry }: { entry: ChatBubbleEntry }) {
  return (
    <View style={styles.pair}>
      <Line langLabel={entry.sourceLang} text={entry.source} time={entry.time} tinted={false} />
      <Line langLabel={entry.targetLang} text={entry.translated} time={entry.time} tinted />
    </View>
  );
}

const styles = StyleSheet.create({
  pair: {
    gap: 6,
    marginBottom: 12,
  },
  line: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  langLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
  },
  lineBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
});
