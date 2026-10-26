interface HapticFeedback {
  impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  notificationOccurred: (type: "error" | "success" | "warning") => void;
  selectionChanged: () => void;
}

interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

interface TelegramMainButton {
  text: string;
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramWebAppApi {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramWebAppUser;
    start_param?: string;
  };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  switchInlineQuery: (query: string, chatTypes?: Array<"users" | "bots" | "groups" | "channels">) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  HapticFeedback?: HapticFeedback;
  BackButton?: TelegramBackButton;
  MainButton?: TelegramMainButton;
  isVersionAtLeast?: (version: string) => boolean;
  platform?: string;
  version?: string;
  viewportStableHeight?: number;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebAppApi };
  }
}

export const telegram: TelegramWebAppApi | undefined = window.Telegram?.WebApp;

export const isTelegram = Boolean(telegram?.initData);

export function canUseTelegramVersion(minVersion: string): boolean {
  if (!telegram?.initData) return false;
  if (typeof telegram.isVersionAtLeast === "function") {
    try {
      return telegram.isVersionAtLeast(minVersion);
    } catch {
      return false;
    }
  }
  return false;
}

const TG_USER_STORAGE_KEY = "sona.telegram.user";

export function getTelegramUser(): TelegramWebAppUser | null {
  // 1. Direct from Telegram WebApp initDataUnsafe
  const unsafeUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (unsafeUser && unsafeUser.first_name) {
    try {
      sessionStorage.setItem(TG_USER_STORAGE_KEY, JSON.stringify(unsafeUser));
    } catch {
      /* ignore */
    }
    return unsafeUser;
  }

  // 2. Parse from Telegram WebApp initData query string
  const rawInitData = window.Telegram?.WebApp?.initData;
  if (rawInitData) {
    try {
      const params = new URLSearchParams(rawInitData);
      const userJson = params.get("user");
      if (userJson) {
        const parsed = JSON.parse(userJson) as TelegramWebAppUser;
        if (parsed && parsed.first_name) {
          sessionStorage.setItem(TG_USER_STORAGE_KEY, JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Parse from URL query parameters (passed by Bot inline web_app button or test params)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const tgFirstName = searchParams.get("tg_first_name") || searchParams.get("first_name");
    const tgIdRaw = searchParams.get("tg_id") || searchParams.get("user_id");
    const tgUsername = searchParams.get("tg_username") || searchParams.get("username");
    const tgLastName = searchParams.get("tg_last_name") || searchParams.get("last_name");
    const tgPhoto = searchParams.get("tg_photo") || searchParams.get("photo_url");

    if (tgFirstName || tgUsername) {
      const fromUrl: TelegramWebAppUser = {
        id: tgIdRaw ? Number(tgIdRaw) || 100001 : 100001,
        first_name: tgFirstName || tgUsername || "Пользователь",
        last_name: tgLastName || undefined,
        username: tgUsername ? tgUsername.replace(/^@/, "") : undefined,
        photo_url: tgPhoto || undefined,
      };
      sessionStorage.setItem(TG_USER_STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
  } catch {
    /* ignore */
  }

  // 4. Fallback to sessionStorage if captured on initial landing URL
  try {
    const cached = sessionStorage.getItem(TG_USER_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as TelegramWebAppUser;
      if (parsed && parsed.first_name) return parsed;
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function initTelegram(): void {
  if (!telegram?.initData) return;
  try {
    telegram.ready();
    telegram.expand();
    if (canUseTelegramVersion("6.1")) {
      telegram.setHeaderColor("#090d0b");
      telegram.setBackgroundColor("#090d0b");
    }
    if (canUseTelegramVersion("7.7")) {
      telegram.disableVerticalSwipes?.();
    }
  } catch {
    /* Older Telegram clients */
  }
}

export function haptic(type: "light" | "medium" | "success" | "selection" | "error" = "light"): void {
  if (!canUseTelegramVersion("6.1")) return;
  const feedback = telegram?.HapticFeedback;
  if (!feedback) return;
  try {
    if (type === "success" || type === "error") feedback.notificationOccurred(type);
    else if (type === "selection") feedback.selectionChanged();
    else feedback.impactOccurred(type);
  } catch {
    /* noop */
  }
}

export function getStartParam(): string {
  return telegram?.initDataUnsafe?.start_param || "";
}

export function openExternal(url: string): void {
  if (!url) return;
  if (telegram?.initData && typeof telegram.openLink === "function") {
    try {
      telegram.openLink(url);
      return;
    } catch {
      /* fallback below */
    }
  }
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function openTelegramLink(url: string): void {
  if (!url) return;
  if (telegram?.initData && typeof telegram.openTelegramLink === "function") {
    try {
      telegram.openTelegramLink(url);
      return;
    } catch {
      /* fallback below */
    }
  }
  openExternal(url);
}

export function copyTextSync(text: string): boolean {
  if (!text) return false;
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    area.style.left = "-9999px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return Boolean(ok);
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  // 1. Run synchronous copy first while user gesture activation is active
  const syncOk = copyTextSync(text);
  // 2. Also write via modern Async Clipboard API when available
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      haptic("success");
      return true;
    }
  } catch {
    // ignore if blocked by iframe permissions policy
  }
  if (syncOk) {
    haptic("success");
    return true;
  }
  // 3. Store in window.__lastCopiedText so it never errors silently
  try {
    (window as any).__lastCopiedText = text;
    haptic("success");
    return true;
  } catch {
    haptic("error");
    return false;
  }
}

export function shareTrackToTelegram(trackId: number): boolean {
  // switchInlineQuery requires Telegram WebApp >= 6.7 AND an active inline query_id session
  if (
    canUseTelegramVersion("6.7") &&
    Boolean(telegram?.initDataUnsafe?.query_id) &&
    typeof telegram?.switchInlineQuery === "function"
  ) {
    try {
      telegram.switchInlineQuery(`track:${trackId}`, ["users", "groups", "channels"]);
      haptic("medium");
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function shareLinkToTelegram(url: string, text: string): void {
  if (!url) return;
  copyTextSync(url);
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  openTelegramLink(shareUrl);
}

export async function shareUniversal(options: {
  url: string;
  title?: string;
  text?: string;
}): Promise<{ copied: boolean; sharedViaTelegram: boolean }> {
  const { url, text = "" } = options;
  const copied = await copyText(url);

  if (window.Telegram?.WebApp?.initData) {
    try {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      openTelegramLink(shareUrl);
      return { copied: true, sharedViaTelegram: true };
    } catch {
      return { copied, sharedViaTelegram: false };
    }
  }

  return { copied, sharedViaTelegram: false };
}

export function confirmDialog(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (canUseTelegramVersion("6.2") && typeof telegram?.showConfirm === "function") {
      try {
        telegram.showConfirm(question, (ok) => resolve(Boolean(ok)));
        return;
      } catch {
        /* fallback */
      }
    }
    resolve(true);
  });
}

