import * as Clipboard from 'expo-clipboard';
import { SelectableTextView } from '@rob117/react-native-selectable-text';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { useTheme } from '@/hooks/use-theme';
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

/**
 * ChatGPT/Gemini-style conversation turn: the spoken line renders as a right-aligned
 * "user message" bubble; the translation renders like an AI reply underneath - no bubble,
 * plain text with a small sparkle mark, same convention Gemini uses for its responses.
 */
export function ChatBubble({ entry, onExplain }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const menuOptions = [t('copy'), t('explain')];
  const speakerName = entry.speaker ?? t('you');

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
      <View style={styles.metaRow}>
        <Text style={[styles.speaker, { color: theme.textSecondary }]} numberOfLines={1}>
          {speakerName}
        </Text>
        {entry.time ? <Text style={[styles.time, { color: theme.textSecondary }]}>{entry.time}</Text> : null}
      </View>
      <View style={styles.sourceRow}>
        <View style={[styles.sourceBubble, { backgroundColor: theme.chatBubbleMine }]}>
          <SelectableTextView menuOptions={menuOptions} onSelection={handleSelection(entry.source)}>
            <Text style={[styles.sourceText, { color: theme.text }]}>{entry.source}</Text>
          </SelectableTextView>
        </View>
        <Avatar name={speakerName} size={24} />
      </View>

      <View style={styles.replyRow}>
        <SymbolView
          name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
          tintColor={theme.primary}
          size={16}
          style={styles.sparkle}
        />
        <View style={styles.replyBody}>
          <Text style={[styles.langLabel, { color: theme.primary }]}>{entry.targetLang}</Text>
          <SelectableTextView menuOptions={menuOptions} onSelection={handleSelection(entry.translated)}>
            <Text style={[styles.replyText, { color: theme.text }]}>{entry.translated}</Text>
          </SelectableTextView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  entry: {
    marginBottom: 18,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    gap: 6,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 8,
  },
  sourceBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  speaker: {
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    fontSize: 10,
  },
  sourceText: {
    fontSize: 15,
    lineHeight: 20,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingRight: 32,
  },
  sparkle: {
    marginTop: 3,
  },
  replyBody: {
    flex: 1,
    gap: 2,
  },
  langLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  replyText: {
    fontSize: 15,
    lineHeight: 21,
  },
});
