import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SavedTranslationRow, SessionCard, type HistorySession } from '@/components/session-card';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';

// Static sample data - there is no persistence layer in this app yet, so this screen is a
// UI-only mock matching the mockup's shape (grouped by date + a saved-translations list).
const TODAY: HistorySession[] = [
  { id: '1', title: 'Design Meeting', time: '10:30 AM', langPair: 'VI → EN', peopleCount: 8, duration: '2h 15m' },
];
const YESTERDAY: HistorySession[] = [
  { id: '2', title: 'Project Briefing', time: '3:45 PM', langPair: 'EN → VI', peopleCount: 6, duration: '1h 05m' },
  { id: '3', title: 'Daily Standup', time: '9:00 AM', langPair: 'VI → EN', peopleCount: 6, duration: '45m' },
];
const THIS_WEEK: HistorySession[] = [
  { id: '4', title: 'Weekly All Hands', time: 'Jul 15, 2025', langPair: 'VI → EN', peopleCount: 12, duration: '52m' },
];
const SAVED_TRANSLATIONS = [
  { id: 's1', title: 'Electric height and current', time: 'Jul 16, 10:31 AM', langPair: 'VI → EN' },
  { id: 's2', title: 'Interface design discussion', time: 'Jul 16, 10:25 AM', langPair: 'VI → EN' },
  { id: 's3', title: 'Asian current overview', time: 'Jul 16, 10:20 AM', langPair: 'VI → EN' },
];

export default function HistoryScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<'all' | 'saved'>('all');

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
            <Section title={t('today')} sessions={TODAY} />
            <Section title={t('yesterday')} sessions={YESTERDAY} />
            <Section title={t('thisWeek')} sessions={THIS_WEEK} />
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

        {tab === 'all' && (
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
    </SafeAreaView>
  );
}

function Section({ title, sessions }: { title: string; sessions: HistorySession[] }) {
  const theme = useTheme();
  if (sessions.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
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
});
