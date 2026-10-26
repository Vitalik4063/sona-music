import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDuration,
  parseTracklistText,
  checkProfileAccess,
  scoreTrackRecommendation,
  parseImportUrl,
} from "./musicLogic";

test("formatDuration formats seconds and minutes accurately", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(24615), "0:24");
  assert.equal(formatDuration(65000), "1:05");
  assert.equal(formatDuration(3665000), "1:01:05");
});

test("parseTracklistText extracts artist and song from typical VK & Yandex music lines", () => {
  const sample = `
1. Daft Punk - One More Time
2. The Weeknd — Blinding Lights (3:20)
MiyaGi & Эндшпиль - I Got Love
#4 Queen - Bohemian Rhapsody
  `;

  const parsed = parseTracklistText(sample);
  assert.equal(parsed.length, 4);
  assert.equal(parsed[0].artist, "Daft Punk");
  assert.equal(parsed[0].title, "One More Time");

  assert.equal(parsed[1].artist, "The Weeknd");
  assert.equal(parsed[1].title, "Blinding Lights");

  assert.equal(parsed[2].artist, "MiyaGi & Эндшпиль");
  assert.equal(parsed[2].title, "I Got Love");

  assert.equal(parsed[3].artist, "Queen");
  assert.equal(parsed[3].title, "Bohemian Rhapsody");
});

test("checkProfileAccess respects public, owner, selected whitelist, and private rules", () => {
  // Owner always has access
  const ownerCheck = checkProfileAccess({
    ownerId: 1,
    privacy: "private",
    viewerId: 1,
  });
  assert.equal(ownerCheck.canAccess, true);
  assert.equal(ownerCheck.reason, "owner");

  // Public allows anyone
  const publicCheck = checkProfileAccess({
    ownerId: 1,
    privacy: "public",
    viewerId: 999,
  });
  assert.equal(publicCheck.canAccess, true);
  assert.equal(publicCheck.reason, "public");

  // Private blocks stranger
  const privateCheck = checkProfileAccess({
    ownerId: 1,
    privacy: "private",
    viewerId: 999,
  });
  assert.equal(privateCheck.canAccess, false);
  assert.equal(privateCheck.reason, "private");

  // Selected allows whitelisted username or approved request
  const selectedCheckBlocked = checkProfileAccess({
    ownerId: 1,
    privacy: "selected",
    viewerUsername: "unknown_user",
    allowedViewerUsernames: ["@friend_alex", "music_lover"],
  });
  assert.equal(selectedCheckBlocked.canAccess, false);

  const selectedCheckAllowed = checkProfileAccess({
    ownerId: 1,
    privacy: "selected",
    viewerUsername: "@music_lover",
    allowedViewerUsernames: ["@friend_alex", "music_lover"],
  });
  assert.equal(selectedCheckAllowed.canAccess, true);
  assert.equal(selectedCheckAllowed.reason, "allowed_user");
});

test("scoreTrackRecommendation ranks tracks with matching liked artist and tags higher", () => {
  const history = {
    likedArtists: ["Daft Punk", "Nula"],
    playCountByArtist: { "daft punk": 5, nula: 2 },
    favoriteTags: ["focus", "night"],
  };

  const topMatch = scoreTrackRecommendation(
    { artist: "Daft Punk", tags: ["focus", "electronic"] },
    history
  );
  // 50 (liked) + 40 (5*8 plays) + 15 (tag focus) = 105
  assert.equal(topMatch, 105);

  const lowMatch = scoreTrackRecommendation(
    { artist: "Unknown Artist", tags: ["pop"] },
    history
  );
  assert.equal(lowMatch, 0);

  assert.ok(topMatch > lowMatch);
});

test("parseImportUrl detects Sona, Yandex Music, VK, SoundCloud, Deezer, and Spotify playlist and profile links", () => {
  const sonaProfile = parseImportUrl("https://example.run.app/u/sona-vvc667");
  assert.ok(sonaProfile);
  assert.equal(sonaProfile.provider, "sona");
  assert.equal(sonaProfile.kind, "profile");
  assert.equal(sonaProfile.token, "sona-vvc667");

  const sonaPlaylist = parseImportUrl("https://example.run.app/u/sona-vvc667/p/12");
  assert.ok(sonaPlaylist);
  assert.equal(sonaPlaylist.provider, "sona");
  assert.equal(sonaPlaylist.kind, "playlist");
  assert.equal(sonaPlaylist.token, "sona-vvc667");
  assert.equal(sonaPlaylist.playlistId, "12");

  const yandexPl = parseImportUrl("https://music.yandex.ru/users/yamusic-daily/playlists/1033");
  assert.ok(yandexPl);
  assert.equal(yandexPl.provider, "yandex");
  assert.equal(yandexPl.kind, "playlist");
  assert.equal(yandexPl.owner, "yamusic-daily");
  assert.equal(yandexPl.playlistId, "1033");

  const vkPl = parseImportUrl("https://vk.com/music/playlist/-147845620_987_abc");
  assert.ok(vkPl);
  assert.equal(vkPl.provider, "vk");
  assert.equal(vkPl.kind, "playlist");
  assert.equal(vkPl.playlistId, "-147845620_987_abc");

  const vkProfile = parseImportUrl("https://vk.com/audios123456");
  assert.ok(vkProfile);
  assert.equal(vkProfile.provider, "vk");
  assert.equal(vkProfile.kind, "profile");
  assert.equal(vkProfile.owner, "123456");

  const scPl = parseImportUrl("https://soundcloud.com/ninjatune/sets/chill-beats");
  assert.ok(scPl);
  assert.equal(scPl.provider, "soundcloud");
  assert.equal(scPl.kind, "playlist");

  const dzPl = parseImportUrl("https://www.deezer.com/ru/playlist/908622995");
  assert.ok(dzPl);
  assert.equal(dzPl.provider, "deezer");
  assert.equal(dzPl.kind, "playlist");
  assert.equal(dzPl.playlistId, "908622995");

  const spPl = parseImportUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
  assert.ok(spPl);
  assert.equal(spPl.provider, "spotify");
  assert.equal(spPl.kind, "playlist");
  assert.equal(spPl.playlistId, "37i9dQZF1DXcBWIGoYBM5M");

  assert.equal(parseImportUrl("Queen - Bohemian Rhapsody\nDaft Punk - One More Time"), null);
});

