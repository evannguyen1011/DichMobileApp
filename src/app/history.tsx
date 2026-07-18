import { useCallback, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { SavedTranslationRow, SessionCard, type HistorySession } from '@/components/session-card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';
import { deleteSession, listSessions, type StoredSession } from '@/lib/history-storage';

// Real per-session "save a translation snippet" feature doesn't exist yet (the storage model
// only has whole sessions, not individually-starred entries) - this list stays a UI-only mock
// matching the mockup's shape until that's built.
const SAVED_TRANSLATIONS = [
  { id: 's1', title: 'Electric height and current', time: 'Jul 16, 10:31 AM', langPair: 'VI → EN' },
  { id: 's2', title: 'Interface design discussion', time: 'Jul 16, 10:25 AM', langPair: 'VI → EN' },
  { id: 's3', title: 'Asian current overview', time: 'Jul 16, 10:20 AM', langPair: 'VI → EN' },
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatDuration(ms: number, inProgressLabel: string) {
  if (ms <= 0) return inProgressLabel;
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function toHistorySession(s: StoredSession, inProgressLabel: string, untitledLabel: string): HistorySession {
  const first = s.entries[0];
  const last = s.entries[s.entries.length - 1];
  const langPair = first ? `${first.sourceLang.toUpperCase()} → ${first.targetLang.toUpperCase()}` : '—';
  const speakerCount = new Set(s.entries.map((e) => e.speaker)).size;
  const duration = s.endedAt ? formatDuration(s.endedAt - s.startedAt, inProgressLabel) : inProgressLabel;
  const now = new Date();
  const startedAt = new Date(s.startedAt);
  const time = isSameDay(now, startedAt) ? formatTime(s.startedAt) : formatDate(s.startedAt);
  return {
    id: s.id,
    title: first?.source.slice(0, 60) || untitledLabel,
    time,
    langPair,
    peopleCount: Math.max(1, speakerCount),
    duration,
  };
}

export default function HistoryScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<'all' | 'saved'>('all');
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [selected, setSelected] = useState<StoredSession | null>(null);

  useFocusEffect(
    useCallback(() => {
      listSessions().then(setSessions);
    }, [])
  );

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const now = new Date();
  const todaySessions = sessions.filter((s) => isSameDay(new Date(s.startedAt), now));
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdaySessions = sessions.filter((s) => isSameDay(new Date(s.startedAt), yesterday));
  const earlierSessions = sessions.filter(
    (s) => !isSameDay(new Date(s.startedAt), now) && !isSameDay(new Date(s.startedAt), yesterday)
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>{t('history')}</Text>
      </View>

      <View style={styles.tabsWrap}>
        <SegmentedTabs
          options={[
            { value: 'all', label: t('allSessions') },
            { value: 'saved', label: t('saved') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'all' ? (
          <>
            {sessions.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noSessionsYet')}</Text>
            )}
            <Section
              title={t('today')}
              sessions={todaySessions}
              onOpen={setSelected}
              onDelete={handleDelete}
              inProgressLabel={t('inProgress')}
              untitledLabel={t('untitledSession')}
            />
            <Section
              title={t('yesterday')}
              sessions={yesterdaySessions}
              onOpen={setSelected}
              onDelete={handleDelete}
              inProgressLabel={t('inProgress')}
              untitledLabel={t('untitledSession')}
            />
            <Section
              title={t('earlier')}
              sessions={earlierSessions}
              onOpen={setSelected}
              onDelete={handleDelete}
              inProgressLabel={t('inProgress')}
              untitledLabel={t('untitledSession')}
            />
          </>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t('savedTranslations')}
            </Text>
            {SAVED_TRANSLATIONS.map((item) => (
              <SavedTranslationRow key={item.id} title={item.title} time={item.time} langPair={item.langPair} />
            ))}
          </View>
        )}

        {tab === 'all' && sessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.savedHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {t('savedTranslations')}
              </Text>
              <Text style={[styles.seeAll, { color: theme.primary }]}>{t('seeAll')}</Text>
            </View>
            {SAVED_TRANSLATIONS.map((item) => (
              <SavedTranslationRow key={item.id} title={item.title} time={item.time} langPair={item.langPair} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              maxHeight: '80%',
              backgroundColor: theme.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
            }}
          >
            <View style={styles.detailHeader}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
                {selected ? formatDate(selected.startedAt) : ''}
              </Text>
              <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  tintColor={theme.textSecondary}
                  size={20}
                />
              </Pressable>
            </View>
            <ScrollView>
              {selected?.summary ? (
                <View
                  style={[
                    styles.summaryBox,
                    { backgroundColor: theme.primarySoft, borderColor: theme.primarySoftBorder },
                  ]}
                >
                  <Text style={{ color: theme.primary, fontWeight: '700', marginBottom: 4 }}>
                    {t('summary')}
                  </Text>
                  <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>{selected.summary}</Text>
                </View>
              ) : null}
              {selected?.entries.map((e) => (
                <View key={e.id} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>
                    {e.speaker}
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.text }}>
                    {e.sourceLang.toUpperCase()}: {e.source}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.primary }}>
                    {e.targetLang.toUpperCase()}: {e.translated}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({
  title,
  sessions,
  onOpen,
  onDelete,
  inProgressLabel,
  untitledLabel,
}: {
  title: string;
  sessions: StoredSession[];
  onOpen: (session: StoredSession) => void;
  onDelete: (id: string) => void;
  inProgressLabel: string;
  untitledLabel: string;
}) {
  const theme = useTheme();
  if (sessions.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={toHistorySession(session, inProgressLabel, untitledLabel)}
          onPress={() => onOpen(session)}
          onDelete={() => onDelete(session.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    // The web-only floating pill tab bar (app-tabs.web.tsx) is absolutely positioned
    // over the page content, so this header needs extra clearance on web or its title
    // renders underneath it - same pattern src/app/explore.tsx used to use.
    paddingTop: Platform.select({ web: 64, default: 16 }),
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  tabsWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  savedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
});
