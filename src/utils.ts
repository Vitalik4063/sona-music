export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "—";
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин`;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Доброе утро";
  if (hour >= 12 && hour < 18) return "Добрый день";
  if (hour >= 18 && hour < 23) return "Добрый вечер";
  return "Доброй ночи";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "S";
}

export function plural(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export function trackCount(count: number): string {
  return `${count} ${plural(count, "трек", "трека", "треков")}`;
}

export function playlistCount(count: number): string {
  return `${count} ${plural(count, "плейлист", "плейлиста", "плейлистов")}`;
}

export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const second = (hue + 55 + (hash % 40)) % 360;
  return `linear-gradient(135deg, hsl(${hue} 44% 23%), hsl(${second} 52% 32%))`;
}

export function accentGradient(accent: string): string {
  const map: Record<string, string> = {
    lime: "linear-gradient(135deg, #c8ff4d, #75c874)",
    coral: "linear-gradient(135deg, #ff8a65, #ff4d7a)",
    sky: "linear-gradient(135deg, #8bd7ff, #6a7dff)",
    lilac: "linear-gradient(135deg, #cbb7ff, #ff8ad8)",
    sun: "linear-gradient(135deg, #ffd36e, #ff9d5c)",
    mint: "linear-gradient(135deg, #9dffd0, #6ae0ff)",
    violet: "linear-gradient(135deg, #c3a7ff, #7a6cff)",
  };
  return map[accent] || map.lime;
}

export function privacyLabel(privacy: string): string {
  if (privacy === "public") return "Открыт всем";
  if (privacy === "selected") return "По заявке";
  if (privacy === "private") return "Закрыт";
  return privacy;
}

export function sourceLabel(key: string): string {
  const labels: Record<string, string> = {
    deezer: "Deezer",
    itunes: "Apple Music",
    spotify: "Spotify",
    youtube: "YouTube Music",
    soundcloud: "SoundCloud",
    yandex: "Яндекс Музыка",
    vk: "VK Музыка",
    youtube_music: "YouTube Music",
    sona: "Sona",
  };
  return labels[key] || key;
}

export function providerKeys(track: {
  links: Record<string, string>;
}): string[] {
  return Object.keys(track.links || {}).filter((key) =>
    ["deezer", "itunes", "spotify", "youtube", "soundcloud"].includes(key),
  );
}

export function shuffleTracks<T>(tracks: T[]): T[] {
  const shuffled = [...tracks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
