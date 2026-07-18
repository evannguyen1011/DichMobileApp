import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type UiLang = 'en' | 'vi';

const dictionaries = {
  en: {
    welcomeTitle: 'Welcome',
    welcomeSubtitle: 'Real-time translation for conversations and meetings.',
    sameWifiTitle: 'Same Wi-Fi / LAN',
    sameWifiBody: 'Only people on the same network can join this session.',
    joinWithQr: 'Join with QR Code',
    joinWithCode: 'Join with Code',
    imPresenter: "I'm a Presenter",
    language: 'Language',
    back: 'Back',
    scanQrInstruction: 'Scan the QR code from the presenter to join the session.',
    makeSureSameWifi: 'Make sure you are on the same Wi-Fi / LAN as the presenter.',
    onlyDiscoverableLan: 'Session is only discoverable on the local network.',
    tapToTurnOnFlash: 'Tap to turn on flash',
    tapToTurnOffFlash: 'Tap to turn off flash',
    enterSixDigit: 'Enter the 6-digit code shown by the presenter.',
    joinSession: 'Join Session',
    peopleInSession: 'People in this session (LAN only)',
    scanQrInstead: 'Scan QR Code instead',
    codeJoinComingSoon: 'Joining by code is coming soon.',
    shareQrTitle: 'Share this QR Code',
    shareQrInstruction: 'Let others scan this code to join your session.',
    peopleJoined: (n: number) => `${n} joined`,
    startSession: 'Start',
    cancel: 'Cancel',
    leave: 'Leave',
    chat: 'Chat',
    participants: 'Participants',
    listening: 'Listening',
    mute: 'Mute',
    unmute: 'Unmute',
    speaker: 'Speaker',
    textSize: 'Text Size',
    more: 'More',
    micSensitivity: 'Mic sensitivity',
    you: 'You',
    presenter: 'Presenter',
    history: 'History',
    home: 'Home',
    allSessions: 'All Sessions',
    saved: 'Saved',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    savedTranslations: 'Saved Translations',
    seeAll: 'See all',
    requestToSpeak: 'Request to speak',
    waitingForApproval: 'Waiting for presenter to approve...',
    approve: 'Approve',
    decline: 'Decline',
    wantsToSpeak: (name: string) => `${name} wants to speak`,
    displayName: 'Display name (optional)',
    yourName: 'Your name',
    soloMode: 'Just me',
    or: 'or',
    statusReady: 'Ready. Tap Start to begin.',
    statusLoadError: (msg: string) => `Error loading translation model: ${msg}`,
    statusCameraPermissionDenied: 'Camera permission was not granted.',
    statusConnectingTo: (host: string, port: number) => `Connecting to ${host}:${port}...`,
    statusInvalidQr: 'Invalid QR code.',
    statusDisconnected: (msg: string) => `Disconnected: ${msg}`,
    statusDisconnectedGeneric: 'Disconnected from the presenter.',
    statusRequestSent: 'Request sent, waiting for the presenter to approve...',
    statusListening: 'Listening...',
    statusListeningWithLang: (lang: string, confidence: number) => `Listening (${lang}, ${confidence}%)...`,
    statusError: (code: string, msg: string) => `Error: ${code} - ${msg}`,
    statusFallbackOnline: 'No offline pack, switching to online...',
    statusStopped: 'Stopped.',
    statusMicPermissionDenied: 'Microphone permission was not granted.',
    langEnglish: 'English',
    langVietnamese: 'Vietnamese',
  },
  vi: {
    welcomeTitle: 'Xin chào',
    welcomeSubtitle: 'Dịch thuật thời gian thực cho hội thoại và cuộc họp.',
    sameWifiTitle: 'Cùng Wi-Fi / LAN',
    sameWifiBody: 'Chỉ những người cùng mạng mới có thể tham gia phiên này.',
    joinWithQr: 'Tham gia bằng mã QR',
    joinWithCode: 'Tham gia bằng mã',
    imPresenter: 'Tôi là người trình bày',
    language: 'Ngôn ngữ',
    back: 'Quay lại',
    scanQrInstruction: 'Quét mã QR của người trình bày để tham gia phiên.',
    makeSureSameWifi: 'Đảm bảo bạn đang cùng Wi-Fi / LAN với người trình bày.',
    onlyDiscoverableLan: 'Phiên chỉ hiển thị trong mạng nội bộ.',
    tapToTurnOnFlash: 'Chạm để bật đèn flash',
    tapToTurnOffFlash: 'Chạm để tắt đèn flash',
    enterSixDigit: 'Nhập mã 6 số do người trình bày cung cấp.',
    joinSession: 'Tham gia phiên',
    peopleInSession: 'Người trong phiên (chỉ LAN)',
    scanQrInstead: 'Quét mã QR thay thế',
    codeJoinComingSoon: 'Tham gia bằng mã sẽ sớm được hỗ trợ.',
    shareQrTitle: 'Chia sẻ mã QR này',
    shareQrInstruction: 'Cho người khác quét mã này để tham gia phiên của bạn.',
    peopleJoined: (n: number) => `${n} đã tham gia`,
    startSession: 'Bắt đầu',
    cancel: 'Hủy',
    leave: 'Rời phòng',
    chat: 'Trò chuyện',
    participants: 'Người tham gia',
    listening: 'Đang nghe',
    mute: 'Tắt tiếng',
    unmute: 'Bật tiếng',
    speaker: 'Loa ngoài',
    textSize: 'Cỡ chữ',
    more: 'Khác',
    micSensitivity: 'Độ nhạy mic',
    you: 'Bạn',
    presenter: 'Người trình bày',
    history: 'Lịch sử',
    home: 'Trang chủ',
    allSessions: 'Tất cả phiên',
    saved: 'Đã lưu',
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    thisWeek: 'Tuần này',
    savedTranslations: 'Bản dịch đã lưu',
    seeAll: 'Xem tất cả',
    requestToSpeak: 'Xin phát biểu',
    waitingForApproval: 'Đang chờ người trình bày duyệt...',
    approve: 'Duyệt',
    decline: 'Từ chối',
    wantsToSpeak: (name: string) => `${name} muốn phát biểu`,
    displayName: 'Tên hiển thị (tuỳ chọn)',
    yourName: 'Tên của bạn',
    soloMode: 'Chỉ mình tôi',
    or: 'hoặc',
    statusReady: 'Sẵn sàng. Nhấn Start để bắt đầu.',
    statusLoadError: (msg: string) => `Lỗi tải model dịch: ${msg}`,
    statusCameraPermissionDenied: 'Chưa được cấp quyền camera.',
    statusConnectingTo: (host: string, port: number) => `Đang kết nối tới ${host}:${port}...`,
    statusInvalidQr: 'Mã QR không hợp lệ.',
    statusDisconnected: (msg: string) => `Mất kết nối: ${msg}`,
    statusDisconnectedGeneric: 'Mất kết nối tới người trình bày.',
    statusRequestSent: 'Đã gửi yêu cầu, đang chờ người trình bày duyệt...',
    statusListening: 'Đang nghe...',
    statusListeningWithLang: (lang: string, confidence: number) => `Đang nghe (${lang}, ${confidence}%)...`,
    statusError: (code: string, msg: string) => `Lỗi: ${code} - ${msg}`,
    statusFallbackOnline: 'Không có gói offline, chuyển sang online...',
    statusStopped: 'Đã dừng.',
    statusMicPermissionDenied: 'Chưa được cấp quyền microphone.',
    langEnglish: 'Tiếng Anh',
    langVietnamese: 'Tiếng Việt',
  },
} as const;

type Dictionary = typeof dictionaries.en;
export type I18nKey = keyof Dictionary;

type I18nContextValue = {
  lang: UiLang;
  setLang: (lang: UiLang) => void;
  t: <K extends I18nKey>(key: K, ...args: Dictionary[K] extends (...a: infer A) => string ? A : []) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<UiLang>('en');

  const value = useMemo<I18nContextValue>(() => {
    const t = ((key: I18nKey, ...args: unknown[]) => {
      const entry = dictionaries[lang][key];
      return typeof entry === 'function' ? (entry as (...a: unknown[]) => string)(...args) : entry;
    }) as I18nContextValue['t'];
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}
