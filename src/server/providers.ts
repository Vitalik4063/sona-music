import type { ImportUrlDescriptor } from "../utils/musicLogic";

/**
 * Provider clients for the two services that cannot be imported by simple
 * public-page scraping anymore: Yandex Music and VK Music.
 *
 * Both clients return only real track metadata. They never replace a failed
 * import with a generic chart/search result. Authentication is optional for
 * public Yandex playlists/albums/artists and required for private profiles;
 * VK audio always requires an access token with the audio scope.
 */

export interface ImportedTrackMetadata {
  artist: string;
  title: string;
  album?: string | null;
  durationMs?: number;
  artworkUrl?: string | null;
  externalUrl?: string | null;
  streamUrl?: string | null;
  sourceLinks?: Record<string, string>;
  provider?: string;
}

export interface ImportSource {
  sourceName: string;
  providerKey: string;
  title: string;
  description: string;
  coverUrl: string | null;
  tracks: ImportedTrackMetadata[];
  sourceUrl: string;
}

const YANDEX_API = "https://api.music.yandex.net";
const VK_API = "https://api.vk.com/method";
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_PROFILE_TRACKS = 500;

function decodeHtmlEntities(value: unknown): string {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function uniqueTracks(tracks: ImportedTrackMetadata[]): ImportedTrackMetadata[] {
  const seen = new Set<string>();
  const result: ImportedTrackMetadata[] = [];
  for (const track of tracks) {
    const key = [
      String(track.artist || "").toLowerCase().replace(/\s+/g, " ").trim(),
      String(track.title || "").toLowerCase().replace(/\s+/g, " ").trim(),
      Math.round(Number(track.durationMs || 0) / 1000),
    ].join("|");
    if (!track.title || seen.has(key)) continue;
    seen.add(key);
    result.push(track);
  }
  return result;
}

function yandexHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "SonaMusic/2.0 (https://github.com/Vitalik4063/sona-music)",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `OAuth ${token}`;
  return headers;
}

async function yandexGet<T = any>(pathname: string, token?: string): Promise<T> {
  const response = await fetch(`${YANDEX_API}${pathname}`, {
    headers: yandexHeaders(token),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Яндекс.Музыка отклонила запрос. Для профиля нужен YANDEX_MUSIC_TOKEN (OAuth-токен с доступом к музыке), для публичного плейлиста проверь ссылку.",
    );
  }
  if (!response.ok) {
    throw new Error(
      `Яндекс.Музыка вернула ошибку ${response.status}${payload?.error?.message ? `: ${payload.error.message}` : ""}.`,
    );
  }
  if (payload?.error) {
    throw new Error(`Яндекс.Музыка: ${payload.error.message || "неизвестная ошибка"}`);
  }
  return (payload?.result ?? payload) as T;
}

function yandexCover(uri?: string | null, size = "400x400"): string | null {
  if (!uri) return null;
  let value = String(uri).trim();
  if (!value) return null;
  if (value.startsWith("//")) value = `https:${value}`;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  return value.replace(/%%/g, size);
}

function yandexArtists(track: any): string {
  const artists = Array.isArray(track?.artists) ? track.artists : [];
  const names = artists.map((artist: any) => String(artist?.name || "").trim()).filter(Boolean);
  return names.join(", ") || String(track?.artist?.name || "").trim() || "Исполнитель";
}

function yandexTrack(track: any, fallbackAlbum?: string | null, fallbackCover?: string | null): ImportedTrackMetadata | null {
  if (!track || !track.title) return null;
  const album = Array.isArray(track.albums) ? track.albums[0] : null;
  const albumId = album?.id || track.album_id;
  const externalUrl =
    albumId && track.id
      ? `https://music.yandex.ru/album/${encodeURIComponent(String(albumId))}/track/${encodeURIComponent(String(track.id))}`
      : null;
  const artworkUrl =
    yandexCover(track.coverUri) ||
    yandexCover(album?.coverUri) ||
    yandexCover(track.cover?.uri) ||
    yandexCover(fallbackCover);
  const version = String(track.version || "").trim();
  const title =
    version && /remix|version|live|acoustic|edit/i.test(version) && !String(track.title).toLowerCase().includes(version.toLowerCase())
      ? `${track.title} (${version})`
      : String(track.title).trim();

  return {
    artist: yandexArtists(track),
    title,
    album: String(album?.title || fallbackAlbum || "").trim() || null,
    durationMs: Number(track.durationMs || 0) || undefined,
    artworkUrl,
    externalUrl,
    sourceLinks: externalUrl ? { yandex: externalUrl } : {},
    provider: "yandex_import",
  };
}

function yandexPlaylistTracks(playlist: any, limit = MAX_PROFILE_TRACKS): ImportedTrackMetadata[] {
  const entries = Array.isArray(playlist?.tracks) ? playlist.tracks : [];
  const cover = yandexCover(playlist?.cover?.uri) || yandexCover(playlist?.coverWithoutText?.uri);
  const tracks: ImportedTrackMetadata[] = [];
  for (const entry of entries.slice(0, limit)) {
    const track = entry?.track || entry;
    const metadata = yandexTrack(track, playlist?.title, cover);
    if (metadata) tracks.push(metadata);
  }
  return tracks;
}

function yandexPlaylistSource(playlist: any, sourceUrl: string, fallbackTitle: string): ImportSource {
  const title = String(playlist?.title || fallbackTitle).trim();
  const description = decodeHtmlEntities(playlist?.description || "") || `Импортировано из Яндекс.Музыки: «${title}»`;
  const coverUrl =
    yandexCover(playlist?.cover?.uri) ||
    yandexCover(playlist?.coverWithoutText?.uri) ||
    null;
  return {
    sourceName: "Яндекс.Музыка",
    providerKey: "yandex_import",
    title,
    description,
    coverUrl,
    tracks: yandexPlaylistTracks(playlist),
    sourceUrl,
  };
}

async function fetchYandexPlaylist(desc: ImportUrlDescriptor, token?: string): Promise<ImportSource> {
  if (!desc.owner || !desc.playlistId) {
    throw new Error("В ссылке нет владельца или номера плейлиста Яндекс.Музыки.");
  }
  const playlist = await yandexGet(
    `/users/${encodeURIComponent(desc.owner)}/playlists/${encodeURIComponent(desc.playlistId)}`,
    token,
  );
  const source = yandexPlaylistSource(playlist, desc.url, `Яндекс.Музыка · ${desc.owner}`);
  if (source.tracks.length === 0) {
    throw new Error("Плейлист Яндекс.Музыки пуст или недоступен. Проверь ссылку и токен.");
  }
  return source;
}

async function fetchYandexAlbum(desc: ImportUrlDescriptor, token?: string): Promise<ImportSource> {
  if (!desc.playlistId) throw new Error("В ссылке нет идентификатора альбома Яндекс.Музыки.");
  const album = await yandexGet(`/albums/${encodeURIComponent(desc.playlistId)}/with-tracks`, token);
  const volumes = Array.isArray(album?.volumes) ? album.volumes.flat() : [];
  const rawTracks = volumes.length > 0 ? volumes : Array.isArray(album?.tracks) ? album.tracks : [];
  const cover = yandexCover(album?.coverUri);
  const tracks = rawTracks
    .map((track: any) => yandexTrack(track, album?.title, cover))
    .filter((track: ImportedTrackMetadata | null): track is ImportedTrackMetadata => Boolean(track));
  if (tracks.length === 0) throw new Error("В альбоме Яндекс.Музыки не нашлось треков.");
  return {
    sourceName: "Яндекс.Музыка",
    providerKey: "yandex_import",
    title: String(album?.title || `Альбом Яндекс.Музыки ${desc.playlistId}`),
    description: `Импортировано из альбома Яндекс.Музыки${album?.year ? ` (${album.year})` : ""}.`,
    coverUrl: cover,
    tracks: uniqueTracks(tracks),
    sourceUrl: desc.url,
  };
}

async function fetchYandexArtist(desc: ImportUrlDescriptor, token?: string): Promise<ImportSource> {
  if (!desc.playlistId) throw new Error("В ссылке нет идентификатора артиста Яндекс.Музыки.");
  const [artist, page] = await Promise.all([
    yandexGet(`/artists/${encodeURIComponent(desc.playlistId)}`, token).catch(() => null),
    yandexGet(`/artists/${encodeURIComponent(desc.playlistId)}/tracks?page=0&page-size=50`, token),
  ]);
  const rawTracks = Array.isArray(page?.tracks) ? page.tracks : [];
  const cover = yandexCover(artist?.cover?.uri);
  const tracks = rawTracks
    .map((track: any) => yandexTrack(track, artist?.name, cover))
    .filter((track: ImportedTrackMetadata | null): track is ImportedTrackMetadata => Boolean(track));
  if (tracks.length === 0) throw new Error("У артиста Яндекс.Музыки не нашлось доступных треков.");
  return {
    sourceName: "Яндекс.Музыка",
    providerKey: "yandex_import",
    title: String(artist?.name || `Артист Яндекс.Музыки ${desc.playlistId}`),
    description: "Популярные треки артиста из Яндекс.Музыки.",
    coverUrl: cover,
    tracks: uniqueTracks(tracks),
    sourceUrl: desc.url,
  };
}

async function fetchYandexProfile(desc: ImportUrlDescriptor, token?: string): Promise<ImportSource> {
  const owner = desc.owner;
  if (!owner) throw new Error("В ссылке нет имени пользователя Яндекс.Музыки.");

  // Public profiles expose the list of playlist kinds. A token is required
  // for private/non-public lists and for the user's liked tracks.
  let kinds: number[] = [];
  try {
    const kindsResult = await yandexGet(`/users/${encodeURIComponent(owner)}/playlists/list/kinds`, token);
    if (Array.isArray(kindsResult)) kinds = kindsResult.map(Number).filter(Number.isFinite);
  } catch (error) {
    if (!token) {
      throw new Error(
        "Не удалось получить список плейлистов профиля Яндекс.Музыки. Добавь YANDEX_MUSIC_TOKEN или вставь прямую ссылку на публичный плейлист.",
      );
    }
    throw error;
  }

  const playlists: any[] = [];
  for (let index = 0; index < kinds.length; index += 20) {
    const chunk = kinds.slice(index, index + 20);
    if (chunk.length === 0) continue;
    const response = await yandexGet(
      `/users/${encodeURIComponent(owner)}/playlists?kinds=${encodeURIComponent(chunk.join(","))}`,
      token,
    );
    if (Array.isArray(response)) playlists.push(...response);
  }

  const tracks: ImportedTrackMetadata[] = [];
  for (const playlist of playlists) {
    if (!playlist || playlist.playlistAbsense || !playlist.title) continue;
    tracks.push(...yandexPlaylistTracks(playlist));
  }

  // Liked tracks are part of the profile too. Without a token Yandex may
  // return an empty library; treat that as normal rather than as a failure.
  try {
    const liked = await yandexGet(`/users/${encodeURIComponent(owner)}/likes/tracks`, token);
    const libraryTracks = Array.isArray(liked?.library?.tracks) ? liked.library.tracks : [];
    for (const entry of libraryTracks) {
      const track = entry?.track || entry;
      const metadata = yandexTrack(track, "Мне нравится", null);
      if (metadata) tracks.push(metadata);
    }
  } catch {
    // A public profile can legitimately hide its liked tracks.
  }

  const unique = uniqueTracks(tracks).slice(0, MAX_PROFILE_TRACKS);
  if (unique.length === 0) {
    throw new Error(
      token
        ? "В профиле Яндекс.Музыки не найдено доступных треков. Проверь, что профиль принадлежит аккаунту токена и плейлисты не пусты."
        : "Профиль Яндекс.Музыки не отдал публичные треки. Нужен YANDEX_MUSIC_TOKEN или прямая ссылка на плейлист.",
    );
  }

  const firstPlaylist = playlists.find((playlist) => playlist?.title);
  return {
    sourceName: "Яндекс.Музыка",
    providerKey: "yandex_import",
    title: `Профиль Яндекс.Музыки · ${owner}`,
    description: `Импортировано ${unique.length} треков из профиля ${owner} (${playlists.length} плейлистов и избранное).`,
    coverUrl:
      yandexCover(firstPlaylist?.cover?.uri) ||
      yandexCover(firstPlaylist?.coverWithoutText?.uri) ||
      unique[0]?.artworkUrl ||
      null,
    tracks: unique,
    sourceUrl: desc.url,
  };
}

export async function fetchYandexSource(
  desc: ImportUrlDescriptor,
  token?: string,
): Promise<ImportSource> {
  switch (desc.kind) {
    case "playlist":
      return fetchYandexPlaylist(desc, token);
    case "album":
      return fetchYandexAlbum(desc, token);
    case "artist":
      return fetchYandexArtist(desc, token);
    case "profile":
      return fetchYandexProfile(desc, token);
    default:
      throw new Error("Этот тип ссылки Яндекс.Музыки пока не поддерживается.");
  }
}

/* ------------------------------------------------------------------ */
/* VK Music                                                            */
/* ------------------------------------------------------------------ */

interface VkPlaylistRef {
  ownerId: string;
  albumId: string;
  accessKey?: string;
}

function parseVkPlaylistRef(raw: string, url: string): VkPlaylistRef {
  const value = String(raw || "").replace(/^audio_playlist/i, "");
  const parts = value.split("_");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error("Не удалось разобрать ссылку на плейлист VK. Нужен формат -123456_789.");
  }
  let accessKey = parts[2];
  try {
    const parsed = new URL(url);
    accessKey = parsed.searchParams.get("access_key") || parsed.searchParams.get("access_token") || accessKey;
  } catch {
    // ignore
  }
  return {
    ownerId: parts[0],
    albumId: parts[1],
    accessKey: accessKey || undefined,
  };
}

function vkErrorMessage(error: any): string {
  const code = Number(error?.error_code || 0);
  const message = String(error?.error_msg || "неизвестная ошибка");
  if (code === 5) return "VK отклонил токен: он недействителен или истёк.";
  if (code === 15 || code === 200) {
    return "VK не выдал доступ к аудио. Нужен access token с правами audio (и offline для долгого хранения).";
  }
  if (code === 6) return "VK временно ограничил частоту запросов. Попробуй через минуту.";
  if (code === 100) return `VK: неверные параметры запроса (${message}).`;
  if (code === 18) return "Пользователь VK удалён или заблокирован.";
  return `VK API: ${message} (код ${code || "?"}).`;
}

async function vkCall<T = any>(method: string, params: Record<string, string>, token: string): Promise<T> {
  const query = new URLSearchParams({
    ...params,
    access_token: token,
    v: "5.199",
  });
  const response = await fetch(`${VK_API}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "SonaMusic/2.0",
    },
    body: query.toString(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`VK API вернул некорректный ответ (${response.status}).`);
  }
  if (payload?.error) throw new Error(vkErrorMessage(payload.error));
  if (!response.ok) throw new Error(`VK API ответил HTTP ${response.status}.`);
  return payload?.response as T;
}

function vkCover(item: any): string | null {
  const candidates = [
    item?.album?.thumb?.photo_600,
    item?.album?.thumb?.photo_300,
    item?.thumb?.photo_600,
    item?.thumb?.photo_300,
    item?.photo?.photo_600,
    item?.photo?.photo_300,
    typeof item?.photo === "string" ? item.photo : null,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("http")) return candidate;
  }
  return null;
}

function vkTrack(item: any, fallbackAlbum: string, fallbackCover: string | null): ImportedTrackMetadata | null {
  if (!item || !item.title) return null;
  const ownerId = String(item.owner_id || "");
  const audioId = String(item.id || "");
  const externalUrl =
    ownerId && audioId
      ? `https://vk.com/audio${ownerId}_${audioId}${item.access_key ? `?access_key=${encodeURIComponent(item.access_key)}` : ""}`
      : null;
  return {
    artist: String(item.artist || "Исполнитель").trim(),
    title: String(item.title).trim(),
    album: String(item.album?.title || fallbackAlbum || "").trim() || null,
    durationMs: Number(item.duration || 0) * 1000 || undefined,
    artworkUrl: vkCover(item) || fallbackCover,
    externalUrl,
    streamUrl: typeof item.url === "string" && item.url.startsWith("http") ? item.url : null,
    sourceLinks: externalUrl ? { vk: externalUrl } : {},
    provider: "vk_import",
  };
}

async function vkAudioList(
  token: string,
  ownerId: string,
  albumId?: string,
  accessKey?: string,
): Promise<{ items: any[]; count: number }> {
  const items: any[] = [];
  let total = 0;
  for (let offset = 0; offset < 1000; offset += 200) {
    const params: Record<string, string> = {
      owner_id: ownerId,
      count: "200",
      offset: String(offset),
    };
    if (albumId) params.album_id = albumId;
    if (accessKey) params.access_key = accessKey;
    const response = await vkCall<any>("audio.get", params, token);
    const pageItems = Array.isArray(response?.items) ? response.items : [];
    total = Number(response?.count || pageItems.length || 0);
    items.push(...pageItems);
    if (pageItems.length < 200 || items.length >= total) break;
  }
  return { items, count: total || items.length };
}

async function fetchVkUser(token: string, owner: string): Promise<any | null> {
  const normalized = owner.replace(/^@/, "");
  if (!normalized) return null;
  const response = await vkCall<any>(
    "users.get",
    {
      user_ids: normalized.replace(/^id/i, ""),
      fields: "first_name,last_name,photo_200",
    },
    token,
  );
  return Array.isArray(response) ? response[0] || null : null;
}

async function fetchVkPlaylist(desc: ImportUrlDescriptor, token: string): Promise<ImportSource> {
  const ref = parseVkPlaylistRef(desc.playlistId || "", desc.url);
  let playlist: any = null;
  try {
    const response = await vkCall<any>(
      "audio.getPlaylists",
      {
        owner_id: ref.ownerId,
        count: "100",
      },
      token,
    );
    const items = Array.isArray(response?.items) ? response.items : [];
    playlist = items.find(
      (item: any) =>
        String(item?.id) === String(ref.albumId) ||
        String(item?.album_id) === String(ref.albumId) ||
        String(item?.original_id) === String(ref.albumId),
    ) || null;
  } catch {
    // The title is nice-to-have; audio.get still gives us the tracks.
  }

  const result = await vkAudioList(token, ref.ownerId, ref.albumId, ref.accessKey);
  const title = String(playlist?.title || `Плейлист VK · ${ref.albumId}`).trim();
  const cover = vkCover(playlist) || vkCover(result.items[0]);
  const tracks = result.items
    .map((item: any) => vkTrack(item, title, cover))
    .filter((track: ImportedTrackMetadata | null): track is ImportedTrackMetadata => Boolean(track));
  if (tracks.length === 0) throw new Error("В плейлисте VK не нашлось доступных треков.");

  return {
    sourceName: "VK Музыка",
    providerKey: "vk_import",
    title,
    description: `Импортировано ${tracks.length} треков из плейлиста VK Музыки.`,
    coverUrl: cover,
    tracks: uniqueTracks(tracks),
    sourceUrl: desc.url,
  };
}

async function fetchVkProfile(desc: ImportUrlDescriptor, token: string): Promise<ImportSource> {
  if (!desc.owner) {
    throw new Error("В ссылке нет профиля VK. Скопируй ссылку вида https://vk.com/id123456 или https://vk.com/username.");
  }
  let user: any = null;
  let ownerId = desc.owner;
  if (/^-?\d+$/.test(desc.owner)) {
    ownerId = desc.owner;
  } else {
    user = await fetchVkUser(token, desc.owner);
    if (!user?.id) {
      throw new Error("Не удалось найти профиль VK по этой ссылке. Проверь username.");
    }
    ownerId = String(user.id);
  }

  const result = await vkAudioList(token, ownerId);
  if (!user) {
    user = await fetchVkUser(token, ownerId).catch(() => null);
  }
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || desc.owner;
  const cover = vkCover(result.items[0]) || (typeof user?.photo_200 === "string" ? user.photo_200 : null);
  const tracks = result.items
    .map((item: any) => vkTrack(item, "Мои аудиозаписи VK", cover))
    .filter((track: ImportedTrackMetadata | null): track is ImportedTrackMetadata => Boolean(track));
  if (tracks.length === 0) throw new Error("В профиле VK не нашлось доступных аудиозаписей.");

  return {
    sourceName: "VK Музыка",
    providerKey: "vk_import",
    title: `VK Музыка · ${displayName}`,
    description: `Импортировано ${tracks.length} аудиозаписей из профиля VK.`,
    coverUrl: cover,
    tracks: uniqueTracks(tracks),
    sourceUrl: desc.url,
  };
}

export async function fetchVkSource(
  desc: ImportUrlDescriptor,
  token?: string,
): Promise<ImportSource> {
  if (!token) {
    throw new Error(
      "Для импорта из VK нужен VK_ACCESS_TOKEN с правами audio. Без токена VK не отдаёт треки профиля или плейлиста.",
    );
  }
  if (desc.kind === "playlist") return fetchVkPlaylist(desc, token);
  if (desc.kind === "profile") return fetchVkProfile(desc, token);
  throw new Error("Этот тип ссылки VK пока не поддерживается. Используй ссылку на профиль или плейлист.");
}
