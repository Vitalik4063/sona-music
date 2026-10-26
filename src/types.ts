export type Privacy = "public" | "selected" | "private";
export type AccessLevel = "owner" | "public" | "selected" | "granted" | "locked" | "private";

export interface User {
  id: number;
  telegram_id?: number | null;
  username?: string | null;
  first_name: string;
  last_name?: string | null;
  display_name: string;
  photo_url?: string | null;
  bio: string;
  accent: string;
  privacy: Privacy;
}

export interface PublicUser {
  id: number;
  username?: string | null;
  first_name: string;
  last_name?: string | null;
  display_name: string;
  photo_url?: string | null;
  bio: string;
  accent: string;
  is_demo: boolean;
}

export interface Track {
  id: number;
  title: string;
  artist: string;
  album?: string | null;
  duration_ms: number;
  artwork_url?: string | null;
  preview_url?: string | null;
  external_url?: string | null;
  provider: string;
  links: Record<string, string>;
  sources: string[];
  is_demo: boolean;
  liked: boolean;
}

export interface PlaylistSummary {
  id: number;
  title: string;
  description: string;
  cover_url?: string | null;
  is_public: boolean;
  track_count: number;
  total_duration_ms: number;
  collage: string[];
  owner?: PublicUser | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Playlist extends PlaylistSummary {
  tracks: Track[];
}

export interface Mix {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  artwork_url?: string | null;
  tracks: Track[];
}

export interface HomeData {
  user: User;
  liked_count: number;
  playlists: PlaylistSummary[];
  recent: Track[];
  mixes: Mix[];
  new_releases: Track[];
  stats: { liked?: number; playlists?: number; tracks?: number };
}

export interface SearchResult {
  query: string;
  top: Track | null;
  tracks: Track[];
  providers_used: string[];
  elapsed_ms: number;
}

export interface Session {
  token: string;
  user: User;
  is_dev: boolean;
}

export interface AllowedViewer {
  id: number;
  identifier_type: "username" | "telegram_id";
  identifier_value: string;
  display_name?: string | null;
  created_at: string;
}

export interface AccessRequest {
  id: number;
  status: "pending" | "approved" | "declined";
  created_at: string;
  requester?: PublicUser | null;
  owner?: PublicUser | null;
}

export interface SettingsData {
  user: User;
  show_liked: boolean;
  show_playlists: boolean;
  privacy: Privacy;
  accent: string;
  share_token: string;
  share_url: string;
  webapp_share_url: string;
  bot_username: string;
  allowed_viewers: AllowedViewer[];
  incoming_requests: AccessRequest[];
  outgoing_requests: AccessRequest[];
}

export interface SettingsPatch {
  privacy?: Privacy;
  show_liked?: boolean;
  show_playlists?: boolean;
  accent?: "lime" | "coral" | "sky" | "lilac" | "sun";
  bio?: string;
  first_name?: string;
}

export interface PublicProfile {
  user: PublicUser;
  access: AccessLevel;
  can_view: boolean;
  can_request: boolean;
  request_status?: string | null;
  stats: { liked?: number; playlists?: number; tracks?: number };
  playlists: PlaylistSummary[];
  liked_tracks: Track[];
  show_liked: boolean;
  share_token: string;
  is_authenticated: boolean;
}

export interface PublicPlaylist {
  playlist: Playlist;
  access: AccessLevel;
  can_copy: boolean;
}

export interface CopyResult {
  playlist: PlaylistSummary;
}

export interface HealthData {
  ok: boolean;
  service: string;
  environment: string;
  providers: string[];
  bot_configured: boolean;
}
