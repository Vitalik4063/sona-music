import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import {
  Heart,
  House,
  Library,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Download,
  HardDrive,
  Brain,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { useUI } from "../state/UIContext";
import { getTelegramUser } from "../telegram";
import { cn } from "../utils";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

const navItems = [
  { to: "/", label: "Главная", icon: House, end: true },
  { to: "/search", label: "Поиск", icon: Search },
  { to: "/library", label: "Коллекция", icon: Library },
  { to: "/likes", label: "Избранное", icon: Heart },
  { to: "/import", label: "Импорт музыки", icon: Download },
  { to: "/offline", label: "Офлайн", icon: HardDrive },
  { to: "/science", label: "Эквалайзер и ритмы", icon: Brain },
];

export function Sidebar() {
  const { user } = useAuth();
  const tgUser = getTelegramUser();
  const displayName = tgUser
    ? `${tgUser.first_name} ${tgUser.last_name || ""}`.trim()
    : user?.display_name || "Пользователь";
  const username = tgUser?.username || user?.username;
  const photoUrl = tgUser?.photo_url || user?.photo_url;

  const { openCreatePlaylist } = useUI();
  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: api.playlists,
    staleTime: 30_000,
  });

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <Logo />
      </div>

      <nav className="sidebar__nav" aria-label="Основная навигация">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn("sidebar-link", isActive && "is-active")}
          >
            <Icon size={19} strokeWidth={1.9} />
            <span>{label}</span>
            {to === "/likes" && user && <span className="sidebar-link__dot" />}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__divider" />

      <div className="sidebar__playlists">
        <div className="sidebar__label-row">
          <span className="sidebar__label">Плейлисты</span>
          <button
            type="button"
            className="icon-btn icon-btn--tiny"
            onClick={() => openCreatePlaylist()}
            aria-label="Создать плейлист"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="sidebar__playlist-list">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="sidebar-skeleton" />
            ))}
          {!isLoading && playlists.length === 0 && (
            <button
              type="button"
              className="sidebar-empty"
              onClick={() => openCreatePlaylist()}
            >
              <Sparkles size={16} />
              Создать плейлист
            </button>
          )}
          {playlists.slice(0, 8).map((playlist) => (
            <NavLink
              key={playlist.id}
              to={`/playlist/${playlist.id}`}
              className={({ isActive }) =>
                cn("sidebar-playlist", isActive && "is-active")
              }
            >
              <span className="sidebar-playlist__art">
                {playlist.collage[0] ? (
                  <img src={playlist.collage[0]} alt="" loading="lazy" />
                ) : (
                  <span>{playlist.title.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <span className="sidebar-playlist__text">
                <span className="sidebar-playlist__title">{playlist.title}</span>
                <span className="sidebar-playlist__meta">
                  {playlist.is_public ? "публичный" : "скрытый"} · {playlist.track_count}
                </span>
              </span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="sidebar__footer">
        <NavLink to="/profile" className="sidebar-profile">
          <Avatar name={displayName} src={photoUrl} size="sm" />
          <span className="sidebar-profile__text">
            <span className="sidebar-profile__name">{displayName}</span>
            <span className="sidebar-profile__meta">
              {username ? `@${username}` : "профиль"}
            </span>
          </span>
          <Settings2 size={17} className="sidebar-profile__settings" />
        </NavLink>
        <div
          style={{
            marginTop: "10px",
            padding: "8px 10px 2px",
            borderTop: "1px solid var(--line)",
            fontSize: "11px",
            color: "var(--muted)",
            lineHeight: "1.45",
          }}
        >
          <a
            href="https://t.me/vvc667"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--lime)", fontWeight: 600 }}
          >
            По всем вопросам TG @vvc667
          </a>
        </div>
      </div>
    </aside>
  );
}
