import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  Copy,
  Globe2,
  Heart,
  Link2,
  Lock,
  Play,
  Settings2,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../api";
import { usePlayer } from "../state/PlayerContext";
import { useToast } from "../state/ToastContext";
import { copyText, shareUniversal } from "../telegram";
import {
  accentGradient,
  formatMinutes,
  playlistCount,
  privacyLabel,
  trackCount,
} from "../utils";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { ErrorState, PageSkeleton } from "../components/Loading";
import { PlaylistCard } from "../components/PlaylistCard";
import { TrackRow } from "../components/TrackRow";

export function ProfilePage() {
  const player = usePlayer();
  const { toast } = useToast();
  const homeQuery = useQuery({ queryKey: ["home"], queryFn: api.home });
  const likesQuery = useQuery({ queryKey: ["likes"], queryFn: api.likes });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: api.settings });

  if (homeQuery.isLoading || likesQuery.isLoading || settingsQuery.isLoading) {
    return <PageSkeleton />;
  }
  if (homeQuery.error || settingsQuery.error || !homeQuery.data || !settingsQuery.data) {
    return (
      <ErrorState
        onRetry={() => {
          void homeQuery.refetch();
          void settingsQuery.refetch();
        }}
      />
    );
  }

  const home = homeQuery.data;
  const settings = settingsQuery.data;
  const user = settings.user;
  const likes = likesQuery.data || [];
  const topTracks = likes.slice(0, 5);
  const totalLikedMs = likes.reduce((sum, track) => sum + track.duration_ms, 0);
  const gradient = accentGradient(user.accent);
  const profileShareUrl = `${window.location.origin}/u/${settings.share_token}`;

  const share = async () => {
    const res = await shareUniversal({
      url: profileShareUrl,
      title: `Профиль ${user.display_name} в Sona`,
      text: "Мой музыкальный профиль в Sona — загляни, что у меня звучит",
    });
    toast(
      res.copied ? "Ссылка на профиль скопирована" : "Не удалось скопировать ссылку",
      res.copied ? "success" : "error",
    );
  };

  const copy = async () => {
    const copied = await copyText(profileShareUrl);
    toast(
      copied ? "Ссылка на профиль скопирована" : "Не удалось скопировать ссылку",
      copied ? "success" : "error",
    );
  };

  return (
    <div className="page profile-page">
      <section
        className="profile-hero"
        style={{ ["--profile-gradient" as string]: gradient }}
      >
        <span className="profile-hero__rings" aria-hidden="true" />
        <span className="profile-hero__glow" aria-hidden="true" />

        <div className="profile-hero__identity">
          <span className="eyebrow">
            <Sparkles size={14} /> Твой музыкальный профиль
          </span>
          <div className="profile-hero__name-row">
            <Avatar
              name={user.display_name}
              src={user.photo_url}
              size="xl"
              ring
              className="profile-hero__avatar"
            />
            <div>
              <h1>{user.display_name}</h1>
              <p className="profile-hero__handle">
                {user.username ? `@${user.username}` : "без username"}
                <span className="dot-sep" />
                <span className="profile-hero__privacy">
                  {settings.privacy === "public" ? (
                    <Globe2 size={13} />
                  ) : settings.privacy === "selected" ? (
                    <Users size={13} />
                  ) : (
                    <Lock size={13} />
                  )}
                  {privacyLabel(settings.privacy)}
                </span>
              </p>
            </div>
          </div>
          <p className="profile-hero__bio">
            {user.bio ||
              "Расскажи о своём вкусе в настройках — или просто дай музыке говорить за тебя."}
          </p>
          <div className="profile-hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => void share()}>
              <Share2 size={17} />
              Поделиться профилем
            </button>
            <Link to="/settings" className="btn btn--ghost">
              <Settings2 size={17} />
              Настройки
            </Link>
          </div>
        </div>

        <div className="profile-share-card">
          <div className="profile-share-card__top">
            <span className="profile-share-card__eyebrow">
              <Link2 size={14} /> Ссылка на витрину
            </span>
            <span className="profile-share-card__badge">{privacyLabel(settings.privacy)}</span>
          </div>
          <p className="profile-share-card__name">{user.display_name}</p>
          <div className="profile-share-card__url" title={profileShareUrl}>
            {profileShareUrl.replace(/^https?:\/\//, "")}
          </div>
          <div className="profile-share-card__stats">
            <div>
              <strong>{likes.length}</strong>
              <span>треков</span>
            </div>
            <div>
              <strong>{home.playlists.length}</strong>
              <span>плейлистов</span>
            </div>
            <div>
              <strong>{formatMinutes(totalLikedMs)}</strong>
              <span>музыки</span>
            </div>
          </div>
          <div className="profile-share-card__actions">
            <button type="button" onClick={() => void copy()}>
              <Copy size={15} /> Копировать
            </button>
            <Link to={`/u/${settings.share_token}`}>
              Открыть <ArrowUpRight size={15} />
            </Link>
          </div>
          <span className="profile-share-card__stamp">sona</span>
        </div>
      </section>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat__icon">
            <Heart size={18} fill="currentColor" />
          </span>
          <strong>{home.liked_count}</strong>
          <span>в избранном</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__icon">
            <Sparkles size={18} />
          </span>
          <strong>{playlistCount(home.playlists.length)}</strong>
          <span>собрано тобой</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__icon">
            <Globe2 size={18} />
          </span>
          <strong>{settings.privacy === "public" ? "Открыт" : "По доступу"}</strong>
          <span>{settings.privacy === "public" ? "для всех" : "только для избранных"}</span>
        </div>
        <div className="profile-stat profile-stat--access">
          <span className="profile-stat__icon">
            <Users size={18} />
          </span>
          <strong>{settings.allowed_viewers.length}</strong>
          <span>человек в доступе</span>
        </div>
      </div>

      <section className="home-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Твои главные треки</h2>
            <p className="section-subtitle">Пять песен, которые первыми встречают гостей</p>
          </div>
          <div className="section-header__actions">
            {topTracks.length > 0 && (
              <button
                type="button"
                className="section-link"
                onClick={() => player.playQueue(topTracks, 0)}
              >
                <Play size={15} fill="currentColor" />
                Слушать
              </button>
            )}
            <Link to="/likes" className="section-link">
              Все избранные
            </Link>
          </div>
        </div>
        {topTracks.length > 0 ? (
          <div className="track-list track-list--card">
            {topTracks.map((track, index) => (
              <TrackRow key={track.id} track={track} queue={topTracks} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Главные треки ещё не выбраны"
            text="Лайкай музыку — лучшие пять появятся здесь и в публичном профиле."
            icon={<Heart size={25} />}
            action={{ label: "Найти треки", to: "/search" }}
            compact
          />
        )}
      </section>

      <section className="home-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Плейлисты в профиле</h2>
            <p className="section-subtitle">
              Публичные плейлисты видны гостям, скрытые — только тебе
            </p>
          </div>
          <Link to="/library" className="section-link">
            Вся коллекция
          </Link>
        </div>
        {home.playlists.length > 0 ? (
          <div className="playlist-grid">
            {home.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Плейлистов пока нет"
            text="Собери подборку под настроение — она станет частью профиля."
            icon={<Sparkles size={25} />}
            action={{ label: "Перейти в коллекцию", to: "/library" }}
            compact
          />
        )}
      </section>

      <section className="privacy-banner">
        <div className="privacy-banner__icon">
          {settings.privacy === "public" ? (
            <Globe2 size={23} />
          ) : settings.privacy === "selected" ? (
            <Users size={23} />
          ) : (
            <Lock size={23} />
          )}
        </div>
        <div>
          <h3>Кто может смотреть профиль?</h3>
          <p>
            {settings.privacy === "public"
              ? "Сейчас профиль открыт по ссылке для всех."
              : settings.privacy === "selected"
                ? "Профиль открывается по заявке: ты решаешь, кого пустить."
                : "Профиль полностью закрыт. Приглашения и заявки отключены."}
          </p>
        </div>
        <Link to="/settings" className="btn btn--ghost">
          Изменить доступ
        </Link>
      </section>

      <footer className="profile-footer">
        <span className="tag tag--mini">
          <Check size={12} /> {trackCount(home.stats.tracks ?? 0)} в коллекции
        </span>
        <span className="profile-footer__note">
          Sona · музыкальный профиль в Telegram
        </span>
      </footer>
    </div>
  );
}
