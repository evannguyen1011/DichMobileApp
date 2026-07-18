import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { onTranslateTask } from 'expo-translate-text';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Network from 'expo-network';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { SelectableTextView } from '@rob117/react-native-selectable-text';
import { Waveform } from '@/components/waveform';
import { SensitivitySlider } from '@/components/sensitivity-slider';
import { HistoryDrawer } from '@/components/history-drawer';
import { ExplainPanel } from '@/components/explain-panel';
import {
  startHost,
  joinHost,
  type HostSession,
  type JoinSession,
  type CaptionMessage,
  type NetMessage,
} from '@/lib/session-network';
import {
  createSessionId,
  saveSessionEntries,
  endSession,
  listSessions,
  deleteSession,
  type StoredSession,
} from '@/lib/history-storage';
import { explainText, summarizeSession, MissingApiKeyError, type GeminiConfig } from '@/lib/gemini';
import { getGeminiConfig, setGeminiConfig } from '@/lib/api-key-storage';
import { getGeminiConsent, setGeminiConsent } from '@/lib/consent-storage';

/**
 * Spike: validates the "stream raw EN text immediately, batch-translate to VI at a
 * sentence/word-count boundary" pipeline using stock APIs (SpeechRecognizer via
 * expo-speech-recognition + ML Kit Translate via expo-translate-text), before investing
 * in a custom sherpa-onnx + Qwen stack. Also supports a multi-device "workshop" session:
 * one Host device runs a small TCP server on the LAN, Join devices connect to it, and
 * every device's own locally-finalized captions get relayed to everyone else.
 */

const RESTART_DELAY_AFTER_END_MS = 0;
// How long volume has to stay below PAUSE_VOLUME_THRESHOLD before we treat it as "user
// paused speaking" and cut the segment there. Fixed - not user-configurable, unrelated to
// the mic sensitivity slider below.
const SILENCE_CUT_DURATION_MS = 400;
const PAUSE_VOLUME_THRESHOLD = 0.12;

type Lang = 'en' | 'vi';
type LogEntry = {
  id: string;
  speaker: string;
  sourceLang: Lang;
  targetLang: Lang;
  source: string;
  translated: string;
};

type Role = 'solo' | 'host' | 'join';
type SetupStep = 'select' | 'host-qr' | 'join-scan';

export default function HomeScreen() {
  // ---- Session setup (solo / host / join) ----------------------------------------------
  const [role, setRole] = useState<Role | null>(null);
  const [setupStep, setSetupStep] = useState<SetupStep>('select');
  const [nameInput, setNameInput] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [hostAddress, setHostAddress] = useState<{ host: string; port: number } | null>(null);
  const [joinStatus, setJoinStatus] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  // Solo/Host can always speak; Join must request and wait for the Host to approve.
  const [micApproved, setMicApproved] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<{ deviceId: string; name: string }[]>([]);

  const sessionRef = useRef<HostSession | JoinSession | null>(null);
  const scannedRef = useRef(false);
  const deviceIdRef = useRef(`dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // ---- History + explain (Gemini) ---------------------------------------------------------
  const [historyVisible, setHistoryVisible] = useState(false);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [explainVisible, setExplainVisible] = useState(false);
  const [explainSelectedText, setExplainSelectedText] = useState('');
  const [explainResult, setExplainResult] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  // Gemini is always reached via the small shared proxy server (see /server), which holds
  // one Gemini key server-side - the app itself never handles a raw key. Requires explicit
  // consent since the transcript/selection gets sent through it to Google.
  const [geminiConfig, setGeminiConfigState] = useState<GeminiConfig | null>(null);
  const [geminiConsent, setGeminiConsentState] = useState<boolean | null>(null);
  const [apiKeySettingsVisible, setApiKeySettingsVisible] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [consentInput, setConsentInput] = useState(false);

  const geminiReady = geminiConsent === true && geminiConfig !== null;

  const currentSessionIdRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef(0);

  // ---- Main transcript state -------------------------------------------------------------
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [partialText, setPartialText] = useState('');
  const [draftTranslated, setDraftTranslated] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  // 0..1 noise-gate sensitivity - NOT related to pause/cut detection. A segment's peak
  // volume must clear (1 - micSensitivity) or it's discarded as background noise/cross-talk.
  // Higher = picks up quieter voices too (more noise gets through). Lower = requires louder,
  // more deliberate speech - turn this down in a noisy room and speak up.
  const [micSensitivity, setMicSensitivity] = useState(0.5);

  const isRunningRef = useRef(false);
  const useOnDeviceRef = useRef(true);
  // Best-effort guess of who's currently talking; updated by the native 'languagedetection'
  // event. Only actually switches mid-session on Android 14+ on-device recognition - see
  // startSegment() below.
  const currentSourceLangRef = useRef<Lang>('en');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cutRequestedRef = useRef(false);
  const micSensitivityRef = useRef(micSensitivity);
  micSensitivityRef.current = micSensitivity;
  // Tracks the loudest volume seen during the current in-progress utterance, to decide at
  // finalize time whether it was the user talking or just background noise/cross-talk.
  const segmentPeakVolumeRef = useRef(0);
  const translateChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const logIdRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const volumeLevel = useSharedValue(0);
  // Some recognizer implementations never emit isFinal=true, even after stop() -
  // they just go straight to 'end'. Track the latest partial so 'end' can promote it.
  const lastPartialRef = useRef('');

  // Local-agreement incremental translation: the prefix that's stayed identical across
  // consecutive partial hypotheses is treated as "confirmed" and translated+locked; only
  // the still-changing tail is retranslated as a cheap draft. Reset per utterance.
  const stableWordsRef = useRef<string[]>([]);
  const stableTranslatedRef = useRef('');
  const tentativeTranslatedRef = useRef('');
  const previousPartialWordsRef = useRef<string[]>([]);
  const lastTentativeThrottleRef = useRef(0);

  // Pre-warm the ML Kit EN->VI model once at startup so the first real segment doesn't stall.
  // Goes through translateChainRef so it can't race with a real segment's translate call -
  // expo-translate-text throws TRANSLATION_IN_PROGRESS on overlapping calls.
  useEffect(() => {
    translateChainRef.current = translateChainRef.current
      .then(() =>
        onTranslateTask({
          input: 'hello',
          sourceLangCode: 'en',
          targetLangCode: 'vi',
          // expo-translate-text forwards every field as-is to the native bridge, and the
          // Android side chokes converting an `undefined` value to its Kotlin Map<String, Any> -
          // so every field must be given a concrete value, not omitted.
          preferredStrategy: 'lowLatency',
          requiresWifi: false,
          requireCharging: false,
        })
      )
      .then(() => setStatus('San sang. Nhan Start de bat dau.'))
      .catch((error: any) => setStatus(`Loi tai model dich: ${error?.message ?? error}`));

    if (Platform.OS === 'android') {
      // Calling start({ requiresOnDeviceRecognition: true }) when the device truly has no
      // on-device recognizer throws an uncaught native UnsupportedOperationException that
      // crashes the whole app (not a catchable JS error event) - check support up front and
      // never attempt the on-device path at all if it's not there.
      const supportsOnDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
      useOnDeviceRef.current = supportsOnDevice;
      console.log(`[LiveTranslate] supportsOnDeviceRecognition() = ${supportsOnDevice}`);

      for (const locale of ['en-US', 'vi-VN']) {
        ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale }).catch(() => {
          // Best-effort only; start() will still fall back to the network recognizer.
        });
      }
    }
  }, []);

  // Load the Gemini config + consent decision from device storage once at startup.
  useEffect(() => {
    getGeminiConfig().then((config) => {
      if (config?.mode === 'server') {
        setGeminiConfigState(config);
        setServerUrlInput(config.serverUrl);
      }
    });
    getGeminiConsent().then((consent) => {
      setGeminiConsentState(consent);
      setConsentInput(consent === true);
    });
  }, []);

  const saveGeminiSettings = async () => {
    await setGeminiConsent(consentInput);
    setGeminiConsentState(consentInput);

    if (!consentInput) {
      // Declined - don't persist a config even if a URL was filled in, keep it fully off.
      setApiKeySettingsVisible(false);
      return;
    }

    const config: GeminiConfig = { mode: 'server', serverUrl: serverUrlInput.trim() };
    await setGeminiConfig(config);
    setGeminiConfigState(config);
    setApiKeySettingsVisible(false);
  };

  // Persist every finalized entry (local or from the network) into the current session's
  // history record, so it survives app restarts and shows up in the history drawer.
  useEffect(() => {
    if (!currentSessionIdRef.current || log.length === 0) return;
    saveSessionEntries(currentSessionIdRef.current, sessionStartedAtRef.current, log);
  }, [log]);

  const beginPersistedSession = () => {
    currentSessionIdRef.current = createSessionId();
    sessionStartedAtRef.current = Date.now();
  };

  // Fire-and-forget: summarize the just-finished session via Gemini and mark it ended in
  // storage. Runs after the UI has already moved on, so a slow/failed API call never blocks
  // leaving the session.
  const endPersistedSession = async () => {
    const sessionId = currentSessionIdRef.current;
    currentSessionIdRef.current = null;
    if (!sessionId || log.length === 0) return;
    if (!geminiReady || !geminiConfig) {
      console.log('[LiveTranslate] Gemini not configured/consented, skipping summary');
      await endSession(sessionId);
      return;
    }
    const transcript = log
      .map((e) => `${e.speaker} (${e.sourceLang}): ${e.source}\n-> (${e.targetLang}): ${e.translated}`)
      .join('\n\n');
    try {
      const summary = await summarizeSession(geminiConfig, transcript);
      await endSession(sessionId, summary);
    } catch (err: any) {
      console.log(`[LiveTranslate] summarizeSession failed: ${err?.message ?? err}`);
      await endSession(sessionId);
    }
  };

  const openHistory = async () => {
    setSessions(await listSessions());
    setHistoryVisible(true);
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleExplain = async (selectedText: string, contextText: string) => {
    if (!selectedText.trim()) return;
    setExplainSelectedText(selectedText);
    setExplainResult(null);
    setExplainError(null);
    setExplainVisible(true);
    if (!geminiReady || !geminiConfig) {
      setExplainError(
        geminiConsent === false
          ? 'Ban chua dong y chia se du lieu voi Gemini. Bam "API key" o thanh tren neu muon doi y.'
          : 'Chua thiet lap Gemini. Bam "API key" o thanh tren de dong y va cau hinh.'
      );
      return;
    }
    setExplainLoading(true);
    try {
      const result = await explainText(geminiConfig, selectedText, contextText);
      setExplainResult(result);
    } catch (err: any) {
      if (err instanceof MissingApiKeyError) {
        setExplainError('Chua thiet lap Gemini. Bam "API key" o thanh tren de cau hinh.');
      } else {
        setExplainError(err?.message ?? String(err));
      }
    } finally {
      setExplainLoading(false);
    }
  };

  // ---- Session (host/join) wiring ---------------------------------------------------------

  const handleIncomingMessage = (msg: NetMessage) => {
    if (msg.kind === 'caption') {
      console.log(`[LiveTranslate] handleIncomingMessage(caption): ${msg.speaker} - ${msg.source}`);
      setLog((prev) => [
        ...prev,
        {
          id: msg.id,
          speaker: msg.speaker,
          sourceLang: msg.sourceLang,
          targetLang: msg.targetLang,
          source: msg.source,
          translated: msg.translated,
        },
      ]);
      return;
    }
    if (msg.kind === 'request-speak') {
      console.log(`[LiveTranslate] handleIncomingMessage(request-speak): ${msg.name}`);
      setPendingRequests((prev) =>
        prev.some((r) => r.deviceId === msg.deviceId)
          ? prev
          : [...prev, { deviceId: msg.deviceId, name: msg.name }]
      );
      return;
    }
    if (msg.kind === 'speak-decision') {
      if (msg.deviceId === deviceIdRef.current) {
        console.log(`[LiveTranslate] handleIncomingMessage(speak-decision): approved=${msg.approved}`);
        setMicApproved(msg.approved);
      }
      return;
    }
    // 'hello' - only the host's network layer needs this (to map deviceId -> socket).
  };

  const enterSolo = () => {
    setMicApproved(true);
    beginPersistedSession();
    setRole('solo');
  };

  const startHostMode = async () => {
    const host = await Network.getIpAddressAsync().catch(() => '0.0.0.0');
    const session = startHost(
      (msg) => handleIncomingMessage(msg),
      (count) => setPeerCount(count),
      (error) => setJoinStatus(`Loi server: ${error.message}`)
    );
    sessionRef.current = session;
    setMicApproved(true);
    setHostAddress({ host, port: session.port });
    setSetupStep('host-qr');
  };

  const startJoinScan = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        setJoinStatus('Chua duoc cap quyen camera.');
        return;
      }
    }
    scannedRef.current = false;
    setJoinStatus('');
    setSetupStep('join-scan');
  };

  const onQrScanned = (data: string) => {
    if (scannedRef.current) return;
    let parsed: { host: string; port: number };
    try {
      parsed = JSON.parse(data);
    } catch {
      setJoinStatus('Ma QR khong hop le.');
      return;
    }
    scannedRef.current = true;
    setJoinStatus(`Dang ket noi toi ${parsed.host}:${parsed.port}...`);
    const session = joinHost(parsed.host, parsed.port, {
      onConnected: () => {
        sessionRef.current = session;
        session.send({
          kind: 'hello',
          deviceId: deviceIdRef.current,
          name: nameInput.trim() || 'Nguoi tham gia',
        });
        setMicApproved(false);
        beginPersistedSession();
        setRole('join');
      },
      onMessage: handleIncomingMessage,
      onDisconnect: (error) => {
        sessionRef.current = null;
        setJoinStatus(error ? `Mat ket noi: ${error.message}` : 'Mat ket noi toi host.');
        scannedRef.current = false;
      },
    });
  };

  const enterHostSession = () => {
    beginPersistedSession();
    setRole('host');
  };

  const leaveSession = () => {
    void endPersistedSession();
    sessionRef.current?.close();
    sessionRef.current = null;
    setRole(null);
    setSetupStep('select');
    setPeerCount(0);
    setHostAddress(null);
    setJoinStatus('');
    setLog([]);
    setPendingRequests([]);
    setMicApproved(true);
  };

  const requestToSpeak = () => {
    if (!sessionRef.current || role !== 'join') return;
    (sessionRef.current as JoinSession).send({
      kind: 'request-speak',
      deviceId: deviceIdRef.current,
      name: nameInput.trim() || 'Nguoi tham gia',
    });
    setJoinStatus('Da gui yeu cau, dang cho host duyet...');
  };

  const decideSpeakRequest = (deviceId: string, approved: boolean) => {
    if (!sessionRef.current || role !== 'host') return;
    (sessionRef.current as HostSession).sendTo(deviceId, {
      kind: 'speak-decision',
      deviceId,
      approved,
    });
    setPendingRequests((prev) => prev.filter((r) => r.deviceId !== deviceId));
  };

  const broadcastCaption = (entry: LogEntry) => {
    console.log(
      `[LiveTranslate] broadcastCaption called: role=${role} hasSession=${!!sessionRef.current} text="${entry.source}"`
    );
    if (!sessionRef.current || !role) return;
    const msg: CaptionMessage = {
      kind: 'caption',
      id: entry.id,
      speaker: entry.speaker,
      sourceLang: entry.sourceLang,
      targetLang: entry.targetLang,
      source: entry.source,
      translated: entry.translated,
    };
    if (role === 'host') {
      (sessionRef.current as HostSession).broadcast(msg);
    } else if (role === 'join') {
      (sessionRef.current as JoinSession).send(msg);
    }
  };

  // ---- Speech pipeline (unchanged from solo mode, just tags + broadcasts entries) --------

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const forceCheckpoint = () => {
    if (!isRunningRef.current || cutRequestedRef.current) return;
    console.log('[LiveTranslate] forceCheckpoint -> stop()');
    cutRequestedRef.current = true;
    ExpoSpeechRecognitionModule.stop();
  };

  const startSegment = () => {
    cutRequestedRef.current = false;
    clearSilenceTimer();
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      // Keeps the recognizer alive across natural pauses instead of stopping after every
      // isFinal result - avoids the stop()->start() dead zone that was dropping words right
      // at the cut point. We still restart manually when our own silence detection forces
      // a stop() (see the 'volumechange' handler below).
      continuous: true,
      requiresOnDeviceRecognition: useOnDeviceRef.current,
      androidIntentOptions: {
        // Loose fallback thresholds for the recognizer's own (often-ignored) endpointing;
        // our 'volumechange'-based silence detection below is the real cut mechanism now.
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 900,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 700,
        // Auto-detect EN vs VI mid-session and switch the recognizer language.
        // Android 14+ only, requires the "com.google.android.as" on-device service with
        // both en-US and vi-VN offline packs downloaded - falls back to fixed EN-only
        // detection (no effect) on older Android or the network recognizer.
        EXTRA_ENABLE_LANGUAGE_DETECTION: true,
        EXTRA_ENABLE_LANGUAGE_SWITCH: 'balanced',
        EXTRA_LANGUAGE_SWITCH_ALLOWED_LANGUAGES: ['en-US', 'vi-VN'],
        EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES: ['en-US', 'vi-VN'],
      },
      volumeChangeEventOptions: {
        enabled: true,
        intervalMillis: 100,
      },
    });
  };

  const restartSegment = () => {
    if (!isRunningRef.current) return;
    setTimeout(() => {
      if (isRunningRef.current) startSegment();
    }, RESTART_DELAY_AFTER_END_MS);
  };

  const resetIncrementalTranslation = () => {
    stableWordsRef.current = [];
    stableTranslatedRef.current = '';
    tentativeTranslatedRef.current = '';
    previousPartialWordsRef.current = [];
    setDraftTranslated('');
  };

  const updateDraftDisplay = () => {
    setDraftTranslated(`${stableTranslatedRef.current} ${tentativeTranslatedRef.current}`.trim());
  };

  // Best-effort draft translation for a chunk of the in-progress utterance. Failures are
  // silently ignored - the confident translate in finalizeSegment is what actually counts.
  const translateDraftChunk = (chunkText: string, kind: 'stable' | 'tentative') => {
    if (!chunkText.trim()) return;
    const sourceLang = currentSourceLangRef.current;
    const targetLang: Lang = sourceLang === 'vi' ? 'en' : 'vi';
    translateChainRef.current = translateChainRef.current
      .then(() =>
        onTranslateTask({
          input: chunkText,
          sourceLangCode: sourceLang,
          targetLangCode: targetLang,
          preferredStrategy: 'lowLatency',
          requiresWifi: false,
          requireCharging: false,
        })
      )
      .then((result) => {
        const translated = Array.isArray(result.translatedTexts)
          ? result.translatedTexts.join(' ')
          : String(result.translatedTexts);
        if (kind === 'stable') {
          stableTranslatedRef.current = translated;
        } else {
          tentativeTranslatedRef.current = translated;
        }
        updateDraftDisplay();
      })
      .catch(() => {});
  };

  const queueTranslate = (
    entryId: string,
    text: string,
    sourceLang: Lang,
    targetLang: Lang,
    speaker: string
  ) => {
    console.log(`[LiveTranslate] queueTranslate: enqueue id=${entryId} ${sourceLang}->${targetLang}`);
    translateChainRef.current = translateChainRef.current
      .then(() =>
        onTranslateTask({
          input: text,
          sourceLangCode: sourceLang,
          targetLangCode: targetLang,
          preferredStrategy: 'lowLatency',
          requiresWifi: false,
          requireCharging: false,
        })
      )
      .then((result) => {
        const translated = Array.isArray(result.translatedTexts)
          ? result.translatedTexts.join(' ')
          : String(result.translatedTexts);
        console.log(`[LiveTranslate] translate OK id=${entryId} -> "${translated}"`);
        setLog((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, translated } : e))
        );
        // Built directly from values already in scope here, rather than pulled out of the
        // setLog updater as a side effect - React doesn't guarantee that updater runs
        // synchronously, so relying on it left broadcastCaption silently never firing.
        broadcastCaption({ id: entryId, speaker, sourceLang, targetLang, source: text, translated });
      })
      .catch((error: any) => {
        console.log(`[LiveTranslate] translate FAILED id=${entryId}: ${error?.code ?? ''} ${error?.message ?? error}`);
        setLog((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, translated: `[loi dich: ${error?.message ?? error}]` }
              : e
          )
        );
      });
  };

  const finalizeSegment = (text: string) => {
    setPartialText('');
    resetIncrementalTranslation();
    const peakVolume = segmentPeakVolumeRef.current;
    segmentPeakVolumeRef.current = 0;
    if (!text.trim()) {
      console.log('[LiveTranslate] finalizeSegment: blank text, skipping');
      return;
    }
    const noiseGateThreshold = 1 - micSensitivityRef.current;
    if (peakVolume < noiseGateThreshold) {
      console.log(
        `[LiveTranslate] finalizeSegment: discarded as noise (peak=${peakVolume.toFixed(2)} < gate=${noiseGateThreshold.toFixed(2)}): "${text}"`
      );
      return;
    }
    const id = `me-${Date.now()}-${++logIdRef.current}`;
    console.log(`[LiveTranslate] finalizeSegment: id=${id} text="${text}"`);
    const sourceLang = currentSourceLangRef.current;
    const targetLang: Lang = sourceLang === 'vi' ? 'en' : 'vi';
    const speaker = nameInput.trim() || (role === 'host' ? 'Host' : 'Toi');
    setLog((prev) => [
      ...prev,
      { id, speaker, sourceLang, targetLang, source: text, translated: '...dang dich...' },
    ]);
    queueTranslate(id, text, sourceLang, targetLang, speaker);
  };

  useSpeechRecognitionEvent('start', () => {
    console.log('[LiveTranslate] event: start');
    setStatus('Dang nghe...');
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('[LiveTranslate] event: end');
    clearSilenceTimer();
    volumeLevel.value = withTiming(0, { duration: 300 });
    if (lastPartialRef.current.trim()) {
      console.log(`[LiveTranslate] end: promoting last partial to final: "${lastPartialRef.current}"`);
      finalizeSegment(lastPartialRef.current);
      lastPartialRef.current = '';
    }
    restartSegment();
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    // event.value ranges roughly -2 (inaudible) to 10; normalize to 0..1.
    const normalized = Math.max(0, Math.min(1, (event.value + 2) / 12));
    volumeLevel.value = withTiming(normalized, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });

    segmentPeakVolumeRef.current = Math.max(segmentPeakVolumeRef.current, normalized);

    // Silence-based cut: once volume dips below a fixed threshold and stays there for
    // SILENCE_CUT_DURATION_MS, treat it as the end of the thought and cut there. Any volume
    // back above threshold cancels a pending cut. Uses a fixed threshold, not the mic
    // sensitivity slider (that's a separate noise-gate concern - see finalizeSegment).
    if (normalized < PAUSE_VOLUME_THRESHOLD) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          console.log('[LiveTranslate] silence detected, forcing checkpoint');
          forceCheckpoint();
        }, SILENCE_CUT_DURATION_MS);
      }
    } else {
      clearSilenceTimer();
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    console.log(
      `[LiveTranslate] result isFinal=${event.isFinal} len=${text.length} text="${text}"`
    );
    if (event.isFinal) {
      lastPartialRef.current = '';
      finalizeSegment(text);
      return;
    }
    // Some results come back blank mid-session (e.g. around a language switch) - ignore
    // those rather than clobbering the last good transcript we're buffering for 'end'.
    if (!text.trim()) {
      return;
    }
    setPartialText(text);
    lastPartialRef.current = text;

    const words = text.trim().split(/\s+/).filter(Boolean);
    const prevWords = previousPartialWordsRef.current;
    let commonLen = 0;
    while (
      commonLen < words.length &&
      commonLen < prevWords.length &&
      words[commonLen] === prevWords[commonLen]
    ) {
      commonLen++;
    }
    previousPartialWordsRef.current = words;

    if (commonLen > stableWordsRef.current.length) {
      stableWordsRef.current = words.slice(0, commonLen);
      translateDraftChunk(stableWordsRef.current.join(' '), 'stable');
    }

    const tentativeWords = words.slice(stableWordsRef.current.length);
    const now = Date.now();
    if (tentativeWords.length > 0 && now - lastTentativeThrottleRef.current > 400) {
      lastTentativeThrottleRef.current = now;
      translateDraftChunk(tentativeWords.join(' '), 'tentative');
    }
  });

  useSpeechRecognitionEvent('languagedetection', (event) => {
    console.log(
      `[LiveTranslate] event: languagedetection detected=${event.detectedLanguage} confidence=${event.confidence}`
    );
    const lang: Lang = event.detectedLanguage.toLowerCase().startsWith('vi') ? 'vi' : 'en';
    currentSourceLangRef.current = lang;
    setStatus(
      `Dang nghe (${lang === 'vi' ? 'Tieng Viet' : 'English'}, ${Math.round(
        event.confidence * 100
      )}%)...`
    );
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log(`[LiveTranslate] event: error code=${event.error} message=${event.message}`);
    // On-device pack missing -> fall back to the network recognizer so the demo still works.
    if (
      useOnDeviceRef.current &&
      (event.error === 'language-not-supported' || event.error === 'service-not-allowed')
    ) {
      useOnDeviceRef.current = false;
      setStatus('Khong co goi offline, chuyen sang online...');
      return;
    }
    setStatus(`Loi: ${event.error} - ${event.message}`);
  });

  const onToggle = async () => {
    if (isRunning) {
      isRunningRef.current = false;
      setIsRunning(false);
      clearSilenceTimer();
      ExpoSpeechRecognitionModule.stop();
      setStatus('Da dung.');
      setPartialText('');
      resetIncrementalTranslation();
      volumeLevel.value = withTiming(0, { duration: 300 });
      return;
    }

    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setStatus('Chua duoc cap quyen microphone.');
      return;
    }

    isRunningRef.current = true;
    setIsRunning(true);
    startSegment();
  };

  // ---- Render: setup screens (mode not chosen yet) ---------------------------------------

  if (role === null) {
    if (setupStep === 'join-scan') {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <Text style={styles.statusText}>Huong camera vao ma QR cua Host</Text>
            <View style={styles.cameraBox}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={(result) => onQrScanned(result.data)}
              />
            </View>
            {joinStatus.length > 0 && <Text style={styles.statusText}>{joinStatus}</Text>}
            <Button title="Quay lai" onPress={() => setSetupStep('select')} />
          </View>
        </SafeAreaView>
      );
    }

    if (setupStep === 'host-qr' && hostAddress) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <Text style={styles.statusText}>
              Cho nguoi khac quet ma nay de tham gia ({peerCount} nguoi da vao)
            </Text>
            <View style={styles.qrBox}>
              <QRCode
                value={JSON.stringify({ host: hostAddress.host, port: hostAddress.port })}
                size={220}
              />
            </View>
            <Text style={styles.statusText}>
              {hostAddress.host}:{hostAddress.port}
            </Text>
            <Button title="Bat dau" onPress={enterHostSession} />
            <Button title="Huy" onPress={leaveSession} />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.statusText}>Ten hien thi (tuy chon)</Text>
          <TextInput
            style={styles.nameInput}
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Ten cua ban"
            placeholderTextColor="#777777"
          />
          <View style={styles.setupButtonGroup}>
            <Button title="Dung mot minh" onPress={enterSolo} />
            <View style={styles.buttonSpacer} />
            <Button title="Tao phong (Host)" onPress={startHostMode} />
            <View style={styles.buttonSpacer} />
            <Button title="Tham gia (Join)" onPress={startJoinScan} />
          </View>
          {joinStatus.length > 0 && <Text style={styles.statusText}>{joinStatus}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  // ---- Render: main transcript UI (solo, or an active host/join session) ----------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.sessionBar}>
          <Text style={styles.sessionBarText}>
            {role === 'host'
              ? `Host - ${peerCount} nguoi da tham gia`
              : role === 'join'
                ? 'Da ket noi toi Host'
                : 'Dang dung mot minh'}
          </Text>
          <View style={styles.requestButtons}>
            <Button title="Lich su" onPress={openHistory} />
            <Button
              title={geminiReady ? 'API key (da bat)' : 'API key'}
              onPress={() => setApiKeySettingsVisible(true)}
            />
            <Button title={role === 'solo' ? 'Ket thuc' : 'Roi phong'} onPress={leaveSession} />
          </View>
        </View>

        {role === 'host' &&
          pendingRequests.map((r) => (
            <View key={r.deviceId} style={styles.requestRow}>
              <Text style={styles.sessionBarText}>{r.name} muon phat bieu</Text>
              <View style={styles.requestButtons}>
                <Button title="Duyet" onPress={() => decideSpeakRequest(r.deviceId, true)} />
                <View style={styles.buttonSpacer} />
                <Button title="Tu choi" onPress={() => decideSpeakRequest(r.deviceId, false)} />
              </View>
            </View>
          ))}

        <Text style={styles.statusText}>{status}</Text>

        {role === 'join' && !micApproved ? (
          <View>
            <Button title="Xin phat bieu" onPress={requestToSpeak} />
            {joinStatus.length > 0 && <Text style={styles.statusText}>{joinStatus}</Text>}
          </View>
        ) : (
          <Button
            title={isRunning ? 'Stop' : 'Start listening'}
            onPress={onToggle}
          />
        )}

        <Waveform volume={volumeLevel} />

        <Text style={styles.statusText}>
          Do nhay mic (loc tap am): {Math.round(micSensitivity * 100)}% - on qua thi keo thap
          xuong va noi to len
        </Text>
        <SensitivitySlider value={micSensitivity} onValueChange={setMicSensitivity} />

        <View style={styles.divider} />

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {log.map((entry) => (
            <View key={entry.id} style={styles.logEntry}>
              <Text style={styles.logSpeaker}>{entry.speaker}</Text>
              <SelectableTextView
                menuOptions={['Sao chep', 'Giai thich']}
                onSelection={({ chosenOption, highlightedText }) => {
                  if (!highlightedText?.trim()) return;
                  if (chosenOption === 'Sao chep') {
                    Clipboard.setStringAsync(highlightedText);
                  } else if (chosenOption === 'Giai thich') {
                    handleExplain(highlightedText, entry.source);
                  }
                }}
              >
                <Text style={styles.logSource}>
                  {entry.sourceLang.toUpperCase()}: {entry.source}
                </Text>
              </SelectableTextView>
              <SelectableTextView
                menuOptions={['Sao chep', 'Giai thich']}
                onSelection={({ chosenOption, highlightedText }) => {
                  if (!highlightedText?.trim()) return;
                  if (chosenOption === 'Sao chep') {
                    Clipboard.setStringAsync(highlightedText);
                  } else if (chosenOption === 'Giai thich') {
                    handleExplain(highlightedText, entry.translated);
                  }
                }}
              >
                <Text style={styles.logTranslated}>
                  {entry.targetLang.toUpperCase()}: {entry.translated}
                </Text>
              </SelectableTextView>
            </View>
          ))}
          {partialText.length > 0 && (
            <View style={styles.logEntry}>
              <Text style={styles.partialText}>{partialText}</Text>
              {draftTranslated.length > 0 && (
                <Text style={styles.draftTranslated}>{draftTranslated}</Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      <HistoryDrawer
        visible={historyVisible}
        sessions={sessions}
        onClose={() => setHistoryVisible(false)}
        onDelete={handleDeleteSession}
      />
      <ExplainPanel
        visible={explainVisible}
        selectedText={explainSelectedText}
        explanation={explainResult}
        loading={explainLoading}
        error={explainError}
        onClose={() => setExplainVisible(false)}
      />

      <Modal
        visible={apiKeySettingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setApiKeySettingsVisible(false)}
      >
        <View style={styles.modalScrim}>
          <ScrollView style={styles.modalBox} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={styles.modalTitle}>Tinh nang Gemini (Giai thich / Tom tat)</Text>

            <View style={styles.consentRow}>
              <Switch value={consentInput} onValueChange={setConsentInput} />
              <Text style={[styles.statusText, { flex: 1 }]}>
                Toi dong y noi dung toi chon "Giai thich" va toan bo transcript khi "Ket thuc
                phien" se duoc gui cho Google Gemini (ben thu ba) de xu ly. Neu khong dong y,
                cac tinh nang nay se bi tat - phan nghe/dich van chay offline binh thuong.
              </Text>
            </View>

            {consentInput && (
              <>
                <Text style={styles.statusText}>
                  Dia chi server proxy (vi du http://192.168.6.133:4001). Server nay giu 1 key
                  Gemini dung chung cho moi nguoi - chay bang `npm run dev:all` trong luc dev.
                </Text>
                <TextInput
                  style={styles.nameInput}
                  value={serverUrlInput}
                  onChangeText={setServerUrlInput}
                  placeholder="http://192.168.x.x:4001"
                  placeholderTextColor="#777777"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            <View style={styles.requestButtons}>
              <Button title="Luu" onPress={saveGeminiSettings} />
              <Button title="Dong" onPress={() => setApiKeySettingsVisible(false)} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#121212',
  },
  statusText: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 12,
  },
  scrollView: {
    flex: 1,
  },
  logEntry: {
    marginBottom: 12,
  },
  logSpeaker: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },
  logSource: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  logTranslated: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  partialText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#BBBBBB',
  },
  draftTranslated: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#5B9BD5',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  setupButtonGroup: {
    gap: 4,
  },
  buttonSpacer: {
    height: 8,
  },
  cameraBox: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 16,
  },
  camera: {
    flex: 1,
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignSelf: 'center',
    marginVertical: 16,
  },
  sessionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionBarText: {
    color: '#AAAAAA',
    fontSize: 13,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    maxHeight: '85%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
});
