import { useEffect, useState } from 'react';
import { Animated, Button, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StoredSession } from '@/lib/history-storage';

type Props = {
  visible: boolean;
  sessions: StoredSession[];
  onClose: () => void;
  onDelete: (sessionId: string) => void;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(320, SCREEN_WIDTH * 0.85);

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/** ChatGPT-style left drawer: list of past sessions, tap one to view its transcript. */
export function HistoryDrawer({ visible, sessions, onClose, onDelete }: Props) {
  const [translateX] = useState(() => new Animated.Value(-DRAWER_WIDTH));
  const [selected, setSelected] = useState<StoredSession | null>(null);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
    if (!visible) setSelected(null);
  }, [visible]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {visible && <TouchableOpacity style={styles.scrim} onPress={onClose} activeOpacity={1} />}
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {selected ? (
          <>
            <View style={styles.header}>
              <Text style={styles.headerText}>{formatDate(selected.startedAt)}</Text>
              <Button title="Quay lai" onPress={() => setSelected(null)} />
            </View>
            <ScrollView style={styles.body}>
              {selected.summary && (
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryTitle}>Tom tat (Gemini)</Text>
                  <Text style={styles.summaryText}>{selected.summary}</Text>
                </View>
              )}
              {selected.entries.map((e) => (
                <View key={e.id} style={styles.entry}>
                  <Text style={styles.entrySpeaker}>{e.speaker}</Text>
                  <Text style={styles.entrySource}>
                    {e.sourceLang.toUpperCase()}: {e.source}
                  </Text>
                  <Text style={styles.entryTranslated}>
                    {e.targetLang.toUpperCase()}: {e.translated}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerText}>Lich su</Text>
              <Button title="Dong" onPress={onClose} />
            </View>
            <ScrollView style={styles.body}>
              {sessions.length === 0 && <Text style={styles.emptyText}>Chua co phien nao.</Text>}
              {sessions.map((s) => (
                <TouchableOpacity key={s.id} style={styles.sessionRow} onPress={() => setSelected(s)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionDate}>{formatDate(s.startedAt)}</Text>
                    <Text style={styles.sessionPreview} numberOfLines={1}>
                      {s.entries[0]?.source ?? '(trong)'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onDelete(s.id)} hitSlop={10}>
                    <Text style={styles.deleteText}>Xoa</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
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
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#1A1A1A',
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    color: '#888888',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  sessionDate: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  sessionPreview: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 2,
  },
  deleteText: {
    color: '#E57373',
    fontSize: 13,
    marginLeft: 8,
  },
  summaryBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#5B9BD5',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryText: {
    color: '#DDDDDD',
    fontSize: 13,
  },
  entry: {
    marginBottom: 12,
  },
  entrySpeaker: {
    color: '#888888',
    fontSize: 11,
  },
  entrySource: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  entryTranslated: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
});
