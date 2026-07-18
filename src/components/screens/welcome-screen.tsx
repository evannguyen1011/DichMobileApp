import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HintBanner } from '@/components/ui/hint-banner';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';

type Props = {
  nameInput: string;
  onNameChange: (name: string) => void;
  onJoinQr: () => void;
  onJoinCode: () => void;
  onPresenter: () => void;
  onSolo: () => void;
  statusMessage?: string;
};

export function WelcomeScreen({
  nameInput,
  onNameChange,
  onJoinQr,
  onJoinCode,
  onPresenter,
  onSolo,
  statusMessage,
}: Props) {
  const theme = useTheme();
  const { t, lang, setLang } = useI18n();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={[styles.logoCircle, { backgroundColor: theme.primarySoft }]}>
          <SymbolView
            name={{ ios: 'globe', android: 'language', web: 'language' }}
            tintColor={theme.primary}
            size={40}
          />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{t('welcomeTitle')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('welcomeSubtitle')}</Text>
      </View>

      <HintBanner
        icon={{ ios: 'wifi', android: 'wifi', web: 'wifi' }}
        title={t('sameWifiTitle')}
        body={t('sameWifiBody')}
        trailingIcon={{ ios: 'checkmark.shield.fill', android: 'verified', web: 'verified' }}
      />

      <TextInput
        style={[styles.nameInput, { borderColor: theme.border, color: theme.text }]}
        value={nameInput}
        onChangeText={onNameChange}
        placeholder={t('displayName')}
        placeholderTextColor={theme.textSecondary}
      />

      <View style={styles.buttonGroup}>
        <PrimaryButton
          label={t('joinWithQr')}
          onPress={onJoinQr}
          icon={{ ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }}
        />
        <SecondaryButton
          label={t('joinWithCode')}
          onPress={onJoinCode}
          icon={{ ios: 'square.grid.3x3.fill', android: 'dialpad', web: 'dialpad' }}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textSecondary }]}>{t('or')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <SecondaryButton
          label={t('imPresenter')}
          onPress={onPresenter}
          icon={{ ios: 'person.wave.2.fill', android: 'record_voice_over', web: 'record_voice_over' }}
        />
      </View>

      <GhostButton label={t('soloMode')} onPress={onSolo} style={styles.soloButton} />

      {statusMessage ? (
        <Text style={[styles.status, { color: theme.textSecondary }]}>{statusMessage}</Text>
      ) : null}

      <Pressable
        style={[styles.languageRow, { borderColor: theme.border }]}
        onPress={() => setLang(lang === 'en' ? 'vi' : 'en')}
      >
        <SymbolView
          name={{ ios: 'globe', android: 'language', web: 'language' }}
          tintColor={theme.textSecondary}
          size={18}
        />
        <Text style={[styles.languageLabel, { color: theme.text }]}>{t('language')}</Text>
        <Text style={[styles.languageValue, { color: theme.textSecondary }]}>
          {lang === 'en' ? 'English' : 'Tiếng Việt'}
        </Text>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={theme.textSecondary}
          size={16}
        />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  buttonGroup: {
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
  },
  soloButton: {
    alignSelf: 'center',
  },
  status: {
    fontSize: 13,
    textAlign: 'center',
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 'auto',
  },
  languageLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  languageValue: {
    fontSize: 14,
  },
});
