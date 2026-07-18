import * as Clipboard from 'expo-clipboard';
import { SelectableTextView } from '@rob117/react-native-selectable-text';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';

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
  menuOptions,
  onSelection,
}: {
  langLabel: string;
  text: string;
  time?: string;
  tinted: boolean;
  menuOptions: string[];
  onSelection: (chosenOption: string, highlightedText: string) => void;
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
        <SelectableTextView
          menuOptions={menuOptions}
          onSelection={({ chosenOption, highlightedText }) => {
            if (highlightedText?.trim()) onSelection(chosenOption, highlightedText);
          }}
          style={styles.selectable}
        >
          <Text style={[styles.text, { color: theme.text, fontWeight: tinted ? '600' : '400' }]}>{text}</Text>
        </SelectableTextView>
        <SymbolView
          name={{ ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' }}
          tintColor={theme.textSecondary}
          size={14}
        />
      </View>
    </View>
  );
}

type Props = {
  entry: ChatBubbleEntry;
  /** Selecting text and choosing "Explain" from the native text-selection menu. */
  onExplain?: (selectedText: string, contextText: string) => void;
};

export function ChatBubble({ entry, onExplain }: Props) {
  const { t } = useI18n();
  const menuOptions = [t('copy'), t('explain')];

  const handleSelection = (contextText: string) => (chosenOption: string, highlightedText: string) => {
    if (chosenOption === t('copy')) {
      Clipboard.setStringAsync(highlightedText);
    } else if (chosenOption === t('explain')) {
      onExplain?.(highlightedText, contextText);
    }
  };

  return (
    <View style={styles.pair}>
      <Line
        langLabel={entry.sourceLang}
        text={entry.source}
        time={entry.time}
        tinted={false}
        menuOptions={menuOptions}
        onSelection={handleSelection(entry.source)}
      />
      <Line
        langLabel={entry.targetLang}
        text={entry.translated}
        time={entry.time}
        tinted
        menuOptions={menuOptions}
        onSelection={handleSelection(entry.translated)}
      />
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
  selectable: {
    flex: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
});
