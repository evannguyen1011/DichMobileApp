import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';

type Props = {
  visible: boolean;
  selectedText: string;
  explanation: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(340, SCREEN_WIDTH * 0.85);

/** Right-side slide-in panel (like GitHub Copilot Chat) showing a Gemini explanation. */
export function ExplainPanel({ visible, selectedText, explanation, loading, error, onClose }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const [translateX] = useState(() => new Animated.Value(PANEL_WIDTH));

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : PANEL_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {visible && <TouchableOpacity style={styles.scrim} onPress={onClose} activeOpacity={1} />}
      <Animated.View
        style={[styles.panel, { backgroundColor: theme.background, transform: [{ translateX }] }]}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerText, { color: theme.text }]}>{t('explainTitle')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text style={[styles.closeText, { color: theme.primary }]}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body}>
          <View style={[styles.quoteBox, { borderLeftColor: theme.primary }]}>
            <Text style={[styles.quoteText, { color: theme.textSecondary }]}>"{selectedText}"</Text>
          </View>
          {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />}
          {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
          {explanation && <Text style={[styles.explanationText, { color: theme.text }]}>{explanation}</Text>}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeText: {
    fontSize: 14,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  quoteBox: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 16,
  },
  quoteText: {
    fontStyle: 'italic',
  },
  errorText: {},
  explanationText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
