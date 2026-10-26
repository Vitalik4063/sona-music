import type {
  CopyResult,
  HealthData,
  HomeData,
  Mix,
  Playlist,
  PlaylistSummary,
  PublicPlaylist,
  PublicProfile,
  SearchResult,
  Session,
  SettingsData,
  SettingsPatch,
  Track,
  User,
} from "./types";
import { getTelegramUser } from "./telegram";

const TOKEN_KEY = "sona.session.token";
const LIKES_STORAGE_KEY = "sona.likes.tracks.v1";
const API_BASE = "/api";

let token: string = localStorage.getItem(TOKEN_KEY) || "";
const trackMemoryCache = new Map<number, Track>();

function cacheTracks(tracks: Array<Track | null | undefined>): void {
  const likedIds = new Set(getLocalLikes().map((t) => t.id));
  for (const t of tracks) {
    if (t && typeof t.id === "number") {
      if (likedIds.has(t.id)) {
        t.liked = true;
      }
      trackMemoryCache.set(t.id, t);
    }
  }
}

export function getLocalLikes(): Track[] {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t: any) => t && typeof t.id === "number" && t.title && !t.is_demo)
      .map((t: Track) => ({ ...t, liked: true }));
  } catch {
    return [];
  }
}

function saveLocalLikes(tracks: Track[]): void {
  try {
    const seen = new Set<number>();
    const unique: Track[] = [];
    for (const t of tracks) {
      if (t && typeof t.id === "number" && t.title && !seen.has(t.id) && !t.is_demo) {
        seen.add(t.id);
        const enriched = { ...t, liked: true };
        unique.push(enriched);
        trackMemoryCache.set(t.id, enriched);
      }
    }
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(unique));
  } catch {
    // ignore storage quota errors
  }
}

function fallbackUser(): User {
  const tgUser = getTelegramUser();
  if (tgUser && (tgUser.first_name || tgUser.username)) {
    const first = tgUser.first_name || tgUser.username || "Пользователь";
    const last = tgUser.last_name || "";
    return {
      id: tgUser.id || 1,
      telegram_id: tgUser.id || 1,
      username: tgUser.username || undefined,
      first_name: first,
      last_name: last || undefined,
      display_name: `${first} ${last}`.trim(),
      photo_url: tgUser.photo_url || undefined,
      bio: "Музыкальное пространство Sona в Telegram.",
      accent: "lime",
      privacy: "public",
    };
  }
  return {
    id: 1,
    telegram_id: 667000,
    username: "vvc667",
    first_name: "Виталий",
    last_name: "Чернышов",
    display_name: "Виталий Чернышов",
    bio: "Музыкальное пространство Sona в Telegram.",
    accent: "lime",
    privacy: "public",
  };
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown, message?: string) {
    super(message || (typeof detail === "string" ? detail : "Ошибка запроса"));
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function getToken(): string {
  return token;
}

export function setToken(value: string): void {
  token = value;
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

function errorMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return "Не удалось выполнить запрос";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated && token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    const rawText = await response.text();
    const trimmed = rawText.trim();

    if (!response.ok) {
      let detail: unknown = response.statusText || "Ошибка запроса";
      if (trimmed && !trimmed.startsWith("<")) {
        try {
          const payload = JSON.parse(trimmed);
          detail = payload.detail ?? payload;
        } catch {
          /* not json */
        }
      }
      throw new ApiError(response.status, detail, errorMessage(detail));
    }
    if (response.status === 204 || !trimmed) return undefined as T;
    if (trimmed.startsWith("<")) {
      throw new ApiError(502, "html_response", "Сервер временно недоступен");
    }
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      throw new ApiError(502, "invalid_json", "Некорректный ответ сервера");
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "timeout", "Сервер не ответил вовремя. Попробуй ещё раз.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  async health(): Promise<HealthData> {
    return request<HealthData>("/health", {}, false);
  },

  async bootstrap(): Promise<Session | null> {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData?.trim() || "";
    const telegramUser = getTelegramUser();
    let storedError: unknown = null;

    if (initData || telegramUser) {
      try {
        const session = await request<Session>(
          "/auth/session",
          {
            method: "POST",
            body: JSON.stringify({ initData, telegramUser }),
          },
          false,
        );
        setToken(session.token);
        return session;
      } catch (error) {
        storedError = error;
      }
    }

    if (token) {
      try {
        const user = await request<User>("/me");
        return { token, user, is_dev: false };
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) setToken("");
        else storedError = error;
      }
    }

    try {
      const session = await request<Session>(
        "/auth/dev",
        {
          method: "POST",
          body: JSON.stringify({ initData, telegramUser }),
        },
        false,
      );
      setToken(session.token);
      return session;
    } catch (error) {
      if (storedError instanceof ApiError && storedError.detail !== "html_response") {
        throw storedError;
      }
      const user = fallbackUser();
      return { token: "local_session", user, is_dev: true };
    }
  },

  async me(): Promise<User> {
    try {
      return await request<User>("/me");
    } catch {
      return fallbackUser();
    }
  },

  async updateMe(payload: { first_name?: string; bio?: string }): Promise<User> {
    return request<User>("/users/me", { method: "PATCH", body: JSON.stringify(payload) });
  },

  async home(): Promise<HomeData> {
    try {
      const data = await request<HomeData>("/home");
      cacheTracks([...(data.recent || []), ...(data.new_releases || [])]);
      const localLikes = getLocalLikes();
      if (localLikes.length > data.liked_count) {
        data.liked_count = localLikes.length;
        if (data.stats) data.stats.liked = localLikes.length;
      }
      return data;
    } catch {
      const user = fallbackUser();
      const localLikes = getLocalLikes();
      return {
        user,
        liked_count: localLikes.length,
        playlists: [],
        recent: [],
        mixes: [],
        new_releases: localLikes.slice(0, 6),
        stats: {
          liked: localLikes.length,
          playlists: 0,
          tracks: localLikes.length,
        },
      };
    }
  },

  async mix(id: string): Promise<Mix> {
    return request<Mix>(`/mixes/${encodeURIComponent(id)}`);
  },

  async search(query: string, limit = 30, signal?: AbortSignal): Promise<SearchResult> {
    const res = await request<SearchResult>(
      `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      { signal },
    );
    cacheTracks([res.top, ...(res.tracks || [])]);
    return res;
  },

  async track(id: number): Promise<Track> {
    const t = await request<Track>(`/tracks/${id}`);
    cacheTracks([t]);
    return t;
  },

  async likes(): Promise<Track[]> {
    const local = getLocalLikes();
    try {
      const remote = await request<Track[]>("/me/likes");
      const remoteValid = Array.isArray(remote) ? remote : [];
      const remoteIds = new Set(remoteValid.map((t) => t.id));
      const merged = [...remoteValid.map((t) => ({ ...t, liked: true }))];

      for (const item of local) {
        if (!remoteIds.has(item.id)) {
          merged.push({ ...item, liked: true });
          // Silently re-sync missing local like to the server (e.g. after server restart)
          request<Track>(`/likes/${item.id}`, {
            method: "POST",
            body: JSON.stringify({ track: item }),
          }).catch(() => undefined);
        }
      }
      saveLocalLikes(merged);
      return merged;
    } catch {
      return local;
    }
  },

  async like(trackOrId: number | Track, maybeTrack?: Track): Promise<Track> {
    const trackId = typeof trackOrId === "number" ? trackOrId : trackOrId.id;
    const trackObj =
      typeof trackOrId === "object"
        ? trackOrId
        : maybeTrack || trackMemoryCache.get(trackId);

    if (trackObj) {
      const currentLocal = getLocalLikes();
      saveLocalLikes([{ ...trackObj, liked: true }, ...currentLocal.filter((t) => t.id !== trackId)]);
    }

    try {
      const saved = await request<Track>(`/likes/${trackId}`, {
        method: "POST",
        body: JSON.stringify({ track: trackObj }),
      });
      const currentLocal = getLocalLikes();
      saveLocalLikes([{ ...saved, liked: true }, ...currentLocal.filter((t) => t.id !== saved.id)]);
      return { ...saved, liked: true };
    } catch (err) {
      if (trackObj) {
        return { ...trackObj, liked: true };
      }
      throw err;
    }
  },

  async unlike(trackId: number): Promise<Track> {
    const currentLocal = getLocalLikes();
    const removed = currentLocal.find((t) => t.id === trackId) || trackMemoryCache.get(trackId);
    saveLocalLikes(currentLocal.filter((t) => t.id !== trackId));
    if (removed) {
      trackMemoryCache.set(trackId, { ...removed, liked: false });
    }
    try {
      return await request<Track>(`/likes/${trackId}`, { method: "DELETE" });
    } catch {
      return (
        (removed && { ...removed, liked: false }) || {
          id: trackId,
          title: "",
          artist: "",
          duration_ms: 0,
          liked: false,
        }
      );
    }
  },

  async registerPlay(trackId: number): Promise<void> {
    await request("/me/history", {
      method: "POST",
      body: JSON.stringify({ track_id: trackId }),
    }).catch(() => undefined);
  },

  async recent(): Promise<Track[]> {
    try {
      const list = await request<Track[]>("/me/recent");
      cacheTracks(list);
      return list;
    } catch {
      return [];
    }
  },

  async playlists(): Promise<PlaylistSummary[]> {
    try {
      return await request<PlaylistSummary[]>("/playlists");
    } catch {
      return [];
    }
  },

  async playlist(id: number): Promise<Playlist> {
    const pl = await request<Playlist>(`/playlists/${id}`);
    cacheTracks(pl.tracks || []);
    return pl;
  },

  async createPlaylist(payload: {
    title: string;
    description?: string;
    is_public?: boolean;
  }): Promise<Playlist> {
    return request<Playlist>("/playlists", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updatePlaylist(
    id: number,
    payload: { title?: string; description?: string; is_public?: boolean },
  ): Promise<Playlist> {
    return request<Playlist>(`/playlists/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deletePlaylist(id: number): Promise<void> {
    await request(`/playlists/${id}`, { method: "DELETE" });
  },

  async addTrackToPlaylist(playlistId: number, trackId: number, track?: Track): Promise<Playlist> {
    const trackObj = track || trackMemoryCache.get(trackId);
    return request<Playlist>(`/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ track_id: trackId, track: trackObj }),
    });
  },

  async removeTrackFromPlaylist(playlistId: number, trackId: number): Promise<Playlist> {
    return request<Playlist>(`/playlists/${playlistId}/tracks/${trackId}`, {
      method: "DELETE",
    });
  },

  async reorderPlaylist(playlistId: number, trackIds: number[]): Promise<Playlist> {
    return request<Playlist>(`/playlists/${playlistId}/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ track_ids: trackIds }),
    });
  },

  async settings(): Promise<SettingsData> {
    try {
      const data = await request<SettingsData>("/settings");
      const clientProfileUrl = `${window.location.origin}/u/${data.share_token}`;
      return {
        ...data,
        share_url: clientProfileUrl,
        webapp_share_url: clientProfileUrl,
      };
    } catch {
      const user = fallbackUser();
      const shareToken = `sona-${user.username || user.id}`;
      const clientProfileUrl = `${window.location.origin}/u/${shareToken}`;
      return {
        user,
        show_liked: true,
        show_playlists: true,
        privacy: user.privacy || "public",
        accent: user.accent || "lime",
        share_token: shareToken,
        share_url: clientProfileUrl,
        webapp_share_url: clientProfileUrl,
        bot_username: "SonaMusicBot",
        allowed_viewers: [],
        incoming_requests: [],
        outgoing_requests: [],
      };
    }
  },

  async patchSettings(payload: SettingsPatch): Promise<SettingsData> {
    const data = await request<SettingsData>("/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const clientProfileUrl = `${window.location.origin}/u/${data.share_token}`;
    return {
      ...data,
      share_url: clientProfileUrl,
      webapp_share_url: clientProfileUrl,
    };
  },

  async addViewer(identifier: string): Promise<SettingsData> {
    const data = await request<SettingsData>("/settings/viewers", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
    const clientProfileUrl = `${window.location.origin}/u/${data.share_token}`;
    return { ...data, share_url: clientProfileUrl, webapp_share_url: clientProfileUrl };
  },

  async removeViewer(id: number): Promise<SettingsData> {
    const data = await request<SettingsData>(`/settings/viewers/${id}`, { method: "DELETE" });
    const clientProfileUrl = `${window.location.origin}/u/${data.share_token}`;
    return { ...data, share_url: clientProfileUrl, webapp_share_url: clientProfileUrl };
  },

  async approveRequest(id: number): Promise<SettingsData> {
    const data = await request<SettingsData>(`/settings/requests/${id}/approve`, {
      method: "POST",
    });
    const clientProfileUrl = `${window.location.origin}/u/${data.share_token}`;
    return { ...data, share_url: clientProfileUrl, webapp_share_url: clientProfileUrl };
  },

  async declineRequest(id: number): Promise<SettingsData> {
    const data = await request<SettingsData>(`/settings/requests/${id}/decline`, {
      method: "POST",
    });
    const clientProfileUrl = `${window.location.origin}/u/${data.share_token}`;
    return { ...data, share_url: clientProfileUrl, webapp_share_url: clientProfileUrl };
  },

  async rotateShare(): Promise<SettingsData> {
    const data = await request<SettingsData>("/settings/rotate-share", { method: "POST" });
    const clientProfileUrl = `${window.location.origin}/u/${data.share_token}`;
    return { ...data, share_url: clientProfileUrl, webapp_share_url: clientProfileUrl };
  },

  async publicProfile(tokenValue: string): Promise<PublicProfile> {
    return request<PublicProfile>(`/share/${encodeURIComponent(tokenValue)}`);
  },

  async requestAccess(tokenValue: string): Promise<{ status: string; message: string }> {
    return request(`/share/${encodeURIComponent(tokenValue)}/request`, {
      method: "POST",
    });
  },

  async publicPlaylist(tokenValue: string, playlistId: number): Promise<PublicPlaylist> {
    return request<PublicPlaylist>(
      `/share/${encodeURIComponent(tokenValue)}/playlists/${playlistId}`,
    );
  },

  async copyPublicPlaylist(tokenValue: string, playlistId: number): Promise<CopyResult> {
    return request<CopyResult>(
      `/share/${encodeURIComponent(tokenValue)}/playlists/${playlistId}/copy`,
      { method: "POST" },
    );
  },

  async copyPublicProfile(tokenValue: string): Promise<CopyResult> {
    return request<CopyResult>(
      `/share/${encodeURIComponent(tokenValue)}/copy-profile`,
      { method: "POST" },
    );
  },

  async importByUrl(payload: { url: string; playlist_title?: string }): Promise<{
    success: boolean;
    source?: string;
    playlist: Playlist;
    imported_count: number;
  }> {
    return request("/import/url", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async importVk(payload: { input_text: string; playlist_title?: string }): Promise<{
    success: boolean;
    source?: string;
    playlist: Playlist;
    imported_count: number;
  }> {
    return request("/import/vk", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async importYandex(payload: { input_text: string; playlist_title?: string }): Promise<{
    success: boolean;
    source?: string;
    playlist: Playlist;
    imported_count: number;
  }> {
    return request("/import/yandex", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async recommendations(): Promise<{
    based_on: { liked_count: number; top_artists: string[]; favorite_tags: string[] };
    tracks: Track[];
  }> {
    return request("/recommendations");
  },

  async syncStatus(): Promise<{
    synced: boolean;
    last_sync: string;
    devices_connected: number;
    cloud_storage: string;
    stats: { likes: number; playlists: number; recent: number };
  }> {
    return request("/sync/status");
  },

  async syncPush(payload: any): Promise<{
    status: string;
    synced_at: string;
    message: string;
  }> {
    return request("/sync/push", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async neuroscienceStudies(): Promise<{
    topic: string;
    source: string;
    studies: Array<{
      id: string;
      title: string;
      authorString: string;
      journalTitle: string;
      pubYear: number;
      doi?: string;
      citedByCount: number;
      url: string;
    }>;
  }> {
    return request("/neuroscience/literature");
  },

  async botConnect(payload: { bot_token: string; webapp_url?: string }): Promise<{
    ok: boolean;
    bot_username?: string;
    bot_name?: string;
    webhook_url?: string;
    webapp_url?: string;
    message: string;
  }> {
    return request("/bot/connect", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

