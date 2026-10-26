/**
 * Pure helper functions for Sona music app logic:
 * - Time and duration formatting
 * - VK and Yandex Music tracklist parsing
 * - Privacy access evaluator
 * - Taste recommendation scoring
 */

export interface ParsedTrackItem {
  artist: string;
  title: string;
  originalText: string;
}

/**
 * Format duration in milliseconds to MM:SS or H:MM:SS
 */
export function formatDuration(ms: number): string {
  if (!ms || ms < 0 || !Number.isFinite(ms)) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const padSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  if (hours > 0) {
    const padMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${padMinutes}:${padSeconds}`;
  }
  return `${minutes}:${padSeconds}`;
}

/**
 * Parse text from VK or Yandex Music export, or user-pasted tracklist
 * Handles formats like:
 * "Artist - Title"
 * "1. Artist - Title (3:45)"
 * "Artist — Title" (em-dash)
 * "Artist: Title"
 */
export function parseTracklistText(rawText: string): ParsedTrackItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedTrackItem[] = [];

  for (const line of lines) {
    // Strip leading track numbers like "1.", "01 -", "#1", "#4 Queen", "1 Queen"
    const cleaned = line
      .replace(/^\s*(?:#\s*\d+[\.\)\-:\s]*|\d+[\.\)\-:]\s*|\d+\s+)/, "")
      .replace(/^[\-–—]\s*/, "")
      .trim();

    // Split on dash, em-dash, or en-dash
    const dashMatch = cleaned.split(/\s*[\u2013\u2014\-]\s*/);
    if (dashMatch.length >= 2) {
      const artist = dashMatch[0].trim();
      // Join the rest in case title has dashes, and strip trailing duration like "(3:45)"
      const title = dashMatch.slice(1).join(" - ").replace(/\s*\(\d+:\d+(?::\d+)?\)\s*$/, "").trim();
      if (artist && title) {
        results.push({ artist, title, originalText: line });
        continue;
      }
    }

    // Fallback: if single line without dash, treat as search query
    if (cleaned.length > 2) {
      results.push({ artist: "", title: cleaned, originalText: line });
    }
  }

  return results;
}

export type ProfilePrivacy = "public" | "selected" | "private";

export interface AccessCheckParams {
  ownerId: number;
  privacy: ProfilePrivacy;
  viewerId?: number | null;
  viewerUsername?: string | null;
  allowedViewerUsernames?: string[];
  allowedViewerTelegramIds?: number[];
  isApprovedRequest?: boolean;
}

/**
 * Determines whether a viewer can access an owner's music profile
 */
export function checkProfileAccess(params: AccessCheckParams): {
  canAccess: boolean;
  reason: "owner" | "public" | "allowed_user" | "approved_request" | "restricted" | "private";
} {
  // If the viewer is the profile owner, always full access
  if (params.viewerId && params.viewerId === params.ownerId) {
    return { canAccess: true, reason: "owner" };
  }

  // If public, everyone has access
  if (params.privacy === "public") {
    return { canAccess: true, reason: "public" };
  }

  // If fully private and not owner
  if (params.privacy === "private") {
    return { canAccess: false, reason: "private" };
  }

  // If 'selected' mode:
  if (params.privacy === "selected") {
    if (params.isApprovedRequest) {
      return { canAccess: true, reason: "approved_request" };
    }

    if (
      params.viewerUsername &&
      params.allowedViewerUsernames?.some(
        (u) => u.toLowerCase().replace(/^@/, "") === params.viewerUsername!.toLowerCase().replace(/^@/, "")
      )
    ) {
      return { canAccess: true, reason: "allowed_user" };
    }

    if (
      params.viewerId &&
      params.allowedViewerTelegramIds?.includes(params.viewerId)
    ) {
      return { canAccess: true, reason: "allowed_user" };
    }

    return { canAccess: false, reason: "restricted" };
  }

  return { canAccess: false, reason: "restricted" };
}

/**
 * Calculates a recommendation score for a candidate track
 * based on user's listened and liked artists and tags.
 */
export function scoreTrackRecommendation(
  candidate: { artist: string; tags?: string[] },
  userHistory: { likedArtists: string[]; playCountByArtist: Record<string, number>; favoriteTags: string[] }
): number {
  let score = 0;
  const artistNormalized = candidate.artist.trim().toLowerCase();

  // Liked artist boost (+50)
  if (userHistory.likedArtists.map((a) => a.toLowerCase()).includes(artistNormalized)) {
    score += 50;
  }

  // Repeated play boost (up to +40)
  const plays = userHistory.playCountByArtist[artistNormalized] || 0;
  score += Math.min(plays * 8, 40);

  // Tag overlap boost (+15 per matching tag)
  if (candidate.tags && candidate.tags.length > 0) {
    const userTagsLower = userHistory.favoriteTags.map((t) => t.toLowerCase());
    for (const tag of candidate.tags) {
      if (userTagsLower.includes(tag.toLowerCase())) {
        score += 15;
      }
    }
  }

  return score;
}

export interface ImportUrlDescriptor {
  provider: "sona" | "yandex" | "vk" | "soundcloud" | "deezer" | "spotify" | "generic_url";
  kind: "playlist" | "profile" | "album" | "artist";
  url: string;
  token?: string;
  playlistId?: string;
  owner?: string;
  queryHint?: string;
}

/**
 * Parses a pasted URL or Sona share token into a structured import descriptor
 * Supports Sona profiles/playlists, VK Music, Yandex Music, SoundCloud, Deezer, and Spotify links.
 */
export function parseImportUrl(rawInput: string): ImportUrlDescriptor | null {
  if (!rawInput || !rawInput.trim()) return null;
  const trimmed = rawInput.trim();

  // 1. Direct Sona start param or token: e.g. "u_sona-vvc667_p_2", "u_sona-vvc667", "sona-vvc667"
  const startMatch = /^(?:u_)?(sona-[A-Za-z0-9_-]+?)(?:_p_(\d+))?$/i.exec(trimmed);
  if (startMatch) {
    const token = startMatch[1];
    const playlistId = startMatch[2];
    return {
      provider: "sona",
      kind: playlistId ? "playlist" : "profile",
      url: playlistId ? `/u/${token}/p/${playlistId}` : `/u/${token}`,
      token,
      playlistId,
    };
  }

  // 2. Relative Sona path: e.g. "/u/sona-vvc667", "/u/sona-vvc667/p/3", "/u/sona-vvc667/playlist/3", "/playlist/3"
  const relSonaMatch = /^\/u\/([A-Za-z0-9_-]+)(?:\/(?:p|playlist)\/(\d+))?\/?$/i.exec(trimmed);
  if (relSonaMatch) {
    const token = relSonaMatch[1];
    const playlistId = relSonaMatch[2];
    return {
      provider: "sona",
      kind: playlistId ? "playlist" : "profile",
      url: trimmed,
      token,
      playlistId,
    };
  }
  const relPlaylistMatch = /^\/playlist\/(\d+)\/?$/i.exec(trimmed);
  if (relPlaylistMatch) {
    return {
      provider: "sona",
      kind: "playlist",
      url: trimmed,
      playlistId: relPlaylistMatch[1],
    };
  }

  // Extract first http(s) URL if embedded in text (e.g. "Послушай мой плейлист https://...")
  const urlMatch = /https?:\/\/[^\s"'<>]+/i.exec(trimmed);
  if (!urlMatch) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlMatch[0]);
  } catch {
    return null;
  }

  const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = parsedUrl.pathname;

  // 3. Telegram deep link with start/startapp param for Sona: https://t.me/Bot?start=u_sona-...
  if (host === "t.me" || host === "telegram.me") {
    const startParam = parsedUrl.searchParams.get("start") || parsedUrl.searchParams.get("startapp") || "";
    const tgSonaMatch = /^u_([A-Za-z0-9_-]+?)(?:_p_(\d+))?$/i.exec(startParam);
    if (tgSonaMatch) {
      return {
        provider: "sona",
        kind: tgSonaMatch[2] ? "playlist" : "profile",
        url: parsedUrl.toString(),
        token: tgSonaMatch[1],
        playlistId: tgSonaMatch[2],
      };
    }
    // Or t.me/share/url?url=...
    const sharedInnerUrl = parsedUrl.searchParams.get("url");
    if (sharedInnerUrl) {
      return parseImportUrl(sharedInnerUrl);
    }
  }

  // 4. Sona full web URL: https://<any-host>/u/:token or /u/:token/p/:id or /playlist/:id
  const sonaWebMatch = /^\/u\/([A-Za-z0-9_-]+)(?:\/(?:p|playlist)\/(\d+))?\/?$/i.exec(pathname);
  if (sonaWebMatch) {
    return {
      provider: "sona",
      kind: sonaWebMatch[2] ? "playlist" : "profile",
      url: parsedUrl.toString(),
      token: sonaWebMatch[1],
      playlistId: sonaWebMatch[2],
    };
  }
  const sonaDirectPl = /^\/playlist\/(\d+)\/?$/i.exec(pathname);
  if (sonaDirectPl) {
    return {
      provider: "sona",
      kind: "playlist",
      url: parsedUrl.toString(),
      playlistId: sonaDirectPl[1],
    };
  }

  // 5. Yandex Music: music.yandex.ru / .by / .kz / .com
  if (host.startsWith("music.yandex.")) {
    const userPlMatch = /\/users\/([^/]+)\/playlists\/(\d+)/i.exec(pathname);
    if (userPlMatch) {
      return {
        provider: "yandex",
        kind: "playlist",
        url: parsedUrl.toString(),
        owner: decodeURIComponent(userPlMatch[1]),
        playlistId: userPlMatch[2],
        queryHint: decodeURIComponent(userPlMatch[1]),
      };
    }
    const iframePlMatch = /\/iframe\/playlist\/([^/]+)\/(\d+)/i.exec(pathname);
    if (iframePlMatch) {
      return {
        provider: "yandex",
        kind: "playlist",
        url: parsedUrl.toString(),
        owner: decodeURIComponent(iframePlMatch[1]),
        playlistId: iframePlMatch[2],
        queryHint: decodeURIComponent(iframePlMatch[1]),
      };
    }
    const albumMatch = /\/album\/(\d+)/i.exec(pathname);
    if (albumMatch) {
      return {
        provider: "yandex",
        kind: "album",
        url: parsedUrl.toString(),
        playlistId: albumMatch[1],
      };
    }
    const artistMatch = /\/artist\/(\d+)/i.exec(pathname);
    if (artistMatch) {
      return {
        provider: "yandex",
        kind: "artist",
        url: parsedUrl.toString(),
        playlistId: artistMatch[1],
      };
    }
    const userProfileMatch = /\/users\/([^/]+)/i.exec(pathname);
    if (userProfileMatch) {
      return {
        provider: "yandex",
        kind: "profile",
        url: parsedUrl.toString(),
        owner: decodeURIComponent(userProfileMatch[1]),
        queryHint: decodeURIComponent(userProfileMatch[1]),
      };
    }
    return {
      provider: "yandex",
      kind: "playlist",
      url: parsedUrl.toString(),
    };
  }

  // 6. VK Music: vk.com, m.vk.com, vk.ru
  if (host === "vk.com" || host === "m.vk.com" || host === "vk.ru" || host === "m.vk.ru") {
    const vkPlMatch = /\/music\/(?:playlist|album)\/([A-Za-z0-9_-]+)/i.exec(pathname);
    const zParam = parsedUrl.searchParams.get("z") || "";
    const zPlMatch = /audio_playlist([A-Za-z0-9_-]+)/i.exec(zParam);
    if (vkPlMatch || zPlMatch) {
      const pid = (vkPlMatch ? vkPlMatch[1] : zPlMatch![1]);
      return {
        provider: "vk",
        kind: "playlist",
        url: parsedUrl.toString(),
        playlistId: pid,
      };
    }
    const vkArtistMatch = /\/artist\/([^/?#]+)/i.exec(pathname);
    if (vkArtistMatch) {
      const slug = decodeURIComponent(vkArtistMatch[1]).replace(/[_-]+/g, " ");
      return {
        provider: "vk",
        kind: "artist",
        url: parsedUrl.toString(),
        owner: slug,
        queryHint: slug,
      };
    }
    const vkAudiosMatch = /\/audios(-?\d+)/i.exec(pathname);
    if (vkAudiosMatch) {
      return {
        provider: "vk",
        kind: "profile",
        url: parsedUrl.toString(),
        owner: vkAudiosMatch[1],
      };
    }
    const vkProfileSlug = pathname.replace(/^\/+|\/+$/g, "");
    return {
      provider: "vk",
      kind: "profile",
      url: parsedUrl.toString(),
      owner: vkProfileSlug || undefined,
      queryHint: vkProfileSlug && !vkProfileSlug.startsWith("id") ? vkProfileSlug.replace(/[_.-]+/g, " ") : undefined,
    };
  }

  // 7. SoundCloud: soundcloud.com, m.soundcloud.com, on.soundcloud.com
  if (host.endsWith("soundcloud.com")) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 3 && parts[1] === "sets") {
      return {
        provider: "soundcloud",
        kind: "playlist",
        url: parsedUrl.toString(),
        owner: parts[0],
        playlistId: parts[2],
        queryHint: `${parts[0]} ${parts[2]}`.replace(/[-_]+/g, " "),
      };
    }
    return {
      provider: "soundcloud",
      kind: parts.length === 1 ? "profile" : "playlist",
      url: parsedUrl.toString(),
      owner: parts[0],
      queryHint: parts.join(" ").replace(/[-_]+/g, " "),
    };
  }

  // 8. Deezer: deezer.com, deezer.page.link
  if (host.includes("deezer.")) {
    const dzPlMatch = /\/playlist\/(\d+)/i.exec(pathname);
    if (dzPlMatch) {
      return {
        provider: "deezer",
        kind: "playlist",
        url: parsedUrl.toString(),
        playlistId: dzPlMatch[1],
      };
    }
    const dzAlbumMatch = /\/album\/(\d+)/i.exec(pathname);
    if (dzAlbumMatch) {
      return {
        provider: "deezer",
        kind: "album",
        url: parsedUrl.toString(),
        playlistId: dzAlbumMatch[1],
      };
    }
    const dzArtistMatch = /\/artist\/(\d+)/i.exec(pathname);
    if (dzArtistMatch) {
      return {
        provider: "deezer",
        kind: "artist",
        url: parsedUrl.toString(),
        playlistId: dzArtistMatch[1],
      };
    }
    const dzProfileMatch = /\/profile\/(\d+)/i.exec(pathname);
    if (dzProfileMatch) {
      return {
        provider: "deezer",
        kind: "profile",
        url: parsedUrl.toString(),
        owner: dzProfileMatch[1],
      };
    }
  }

  // 9. Spotify: open.spotify.com
  if (host.includes("spotify.com")) {
    const spMatch = /\/(playlist|album|artist|user)\/([A-Za-z0-9_-]+)/i.exec(pathname);
    if (spMatch) {
      const rawKind = spMatch[1].toLowerCase();
      return {
        provider: "spotify",
        kind: rawKind === "user" ? "profile" : (rawKind as "playlist" | "album" | "artist"),
        url: parsedUrl.toString(),
        playlistId: spMatch[2],
        owner: rawKind === "user" ? spMatch[2] : undefined,
      };
    }
  }

  return {
    provider: "generic_url",
    kind: "playlist",
    url: parsedUrl.toString(),
  };
}

