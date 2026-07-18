import * as Clipboard from 'expo-clipboard';
import { SelectableTextView } from '@rob117/react-native-selectable-text';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n';

export type ChatBubbleEntry = {
  id: string;
  sourceLang: string;
  targetLang: string;
  source: string;
  translated: string;
  speaker?: string;
  time?: string;
};

type Props = {
  entry: ChatBubbleEntry;
  /** Selecting text and choosing "Explain" from the native text-selection menu. */
  onExplain?: (selectedText: string, contextText: string) => void;
};

/** Plain-text transcript line (old style) - no bubble box/background, just colored text. */
export function ChatBubble({ entry, onExplain }: Props) {
  const { t } = useI18n();
  const menuOptions = [t('copy'), t('explain')];

  const handleSelection = (contextText: string) => ({ chosenOption, highlightedText }: { chosenOption: string; highlightedText: string }) => {
    if (!highlightedText?.trim()) return;
    if (chosenOption === t('copy')) {
      Clipboard.setStringAsync(highlightedText);
    } else if (chosenOption === t('explain')) {
      onExplain?.(highlightedText, contextText);
    }
  };

  return (
    <View style={styles.entry}>
      {entry.speaker ? <Text style={styles.speaker}>{entry.speaker}</Text> : null}
      <SelectableTextView menuOptions={menuOptions} onSelection={handleSelection(entry.source)}>
        <Text style={styles.source}>
          {entry.sourceLang}: {entry.source}
        </Text>
      </SelectableTextView>
      <SelectableTextView menuOptions={menuOptions} onSelection={handleSelection(entry.translated)}>
        <Text style={styles.translated}>
          {entry.targetLang}: {entry.translated}
        </Text>
      </SelectableTextView>
    </View>
  );
}

const styles = StyleSheet.create({
  entry: {
    marginBottom: 12,
  },
  speaker: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },
  source: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  translated: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
});
