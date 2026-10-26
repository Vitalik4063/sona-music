import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  Clock3,
  Copy,
  Download,
  Globe2,
  Heart,
  Lock,
  Play,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { usePlayer } from "../state/PlayerContext";
import { useToast } from "../state/ToastContext";
import { copyText, shareUniversal } from "../telegram";
import {
  accentGradient,
  formatMinutes,
  playlistCount,
  trackCount,
} from "../utils";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { ErrorState, PageSkeleton } from "../components/Loading";
import { PlaylistCard } from "../components/PlaylistCard";
import { TrackRow } from "../components/TrackRow";

export function PublicProfilePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const player = usePlayer();
  const { toast } = useToast();
  const { loading: authLoading, user: viewer } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [importingProfile, setImportingProfile] = useState(false);
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ["public-profile", token, viewer?.id ?? "anonymous"],
    queryFn: () => api.publicProfile(token),
    enabled: Boolean(token) && !authLoading,
  });

  if (authLoading || isLoading) return <PageSkeleton />;
  if (error || !profile) {
    return (
      <ErrorState
        title="Профиль не найден"
        message={error instanceof Error ? error.message : "Проверь ссылку — возможно, она устарела."}
        onRetry={() => void refetch()}
      />
    );
  }

  const { user } = profile;
  const gradient = accentGradient(user.accent);
  const totalLikedMs = profile.liked_tracks.reduce(
    (sum, track) => sum + track.duration_ms,
    0,
  );

  const share = async () => {
    const url = `${window.location.origin}/u/${token}`;
    const res = await shareUniversal({
      url,
      title: `Музыкальный профиль ${user.display_name} в Sona`,
      text: `Музыкальный профиль ${user.display_name} в Sona`,
    });
    toast(res.copied ? "Ссылка на профиль скопирована" : "Не удалось скопировать", res.copied ? "success" : "error");
  };

  const importProfileToLibrary = async () => {
    if (importingProfile) return;
    setImportingProfile(true);
    try {
      const result = await api.copyPublicProfile(token);
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      toast(`Профиль «${user.display_name}» импортирован в твою коллекцию`, "success");
      navigate(`/playlist/${result.playlist.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось импортировать профиль", "error");
    } finally {
      setImportingProfile(false);
    }
  };

  const requestAccess = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const result = await api.requestAccess(token);
      toast(result.message, "success");
      await refetch();
    } catch (err) {
      toast(
        err instanceof Error
          ? err.message
          : "Не удалось отправить заявку. Открой Sona в Telegram.",
        "error",
      );
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="public-profile">
      <section
        className="public-hero"
        style={{ ["--profile-gradient" as string]: gradient }}
      >
        <span className="public-hero__rings" aria-hidden="true" />
        <span className="public-hero__glow" aria-hidden="true" />

        <div className="public-hero__identity">
          <span className="eyebrow">
            <Sparkles size={14} /> Музыкальный профиль
          </span>
          <div className="public-hero__name-row">
            <Avatar
              name={user.display_name}
              src={user.photo_url}
              size="xl"
              ring
              className="public-hero__avatar"
            />
            <div>
              <h1>{user.display_name}</h1>
              <p>
                {user.username ? `@${user.username}` : "слушатель Sona"}
                {profile.access === "owner" && <span className="tag tag--mini">это ты</span>}
              </p>
            </div>
          </div>
          <p className="public-hero__bio">
            {user.bio || "Слушает, собирает, делится. Без лишних слов."}
          </p>
          <div className="public-hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => void share()}>
              <Share2 size={17} />
              Поделиться профилем
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void copyProfile()}>
              <Copy size={16} />
              Копировать ссылку
            </button>
            {profile.can_view && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void importProfileToLibrary()}
                disabled={importingProfile}
              >
                <Download size={16} />
                {importingProfile ? "Импортируем…" : "Импортировать профиль"}
              </button>
            )}
            {profile.access === "owner" && (
              <Link to="/profile" className="btn btn--ghost">
                Редактировать
                <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        </div>

        <div className="public-hero__side">
          <span className="public-hero__badge">
            {profile.access === "public" || profile.access === "owner" ? (
              <Globe2 size={14} />
            ) : (
              <Lock size={14} />
            )}
            {profile.access === "owner"
              ? "твой профиль"
              : profile.access === "public"
                ? "открыт всем"
                : profile.access === "granted"
                  ? "доступ открыт"
                  : "по заявке"}
          </span>
          <div className="public-hero__stats">
            <div>
              <strong>{profile.stats.playlists ?? 0}</strong>
              <span>{playlistCount(profile.stats.playlists ?? 0).split(" ").slice(1).join(" ")}</span>
            </div>
            <div>
              <strong>{profile.stats.liked ?? "—"}</strong>
              <span>треков</span>
            </div>
            <div>
              <strong>{profile.stats.tracks ?? 0}</strong>
              <span>в подборках</span>
            </div>
          </div>
          <span className="public-hero__stamp">sona</span>
        </div>
      </section>

      {!profile.can_view ? (
        <section className="locked-profile">
          <span className="locked-profile__rings" aria-hidden="true" />
          <div className="locked-profile__icon">
            {profile.access === "private" ? <Lock size={32} /> : <Users size={32} />}
          </div>
          <span className="eyebrow">
            {profile.access === "private" ? "Профиль закрыт" : "Доступ по заявке"}
          </span>
          <h2>
            {profile.access === "private"
              ? "Эта музыка остаётся личной."
              : `${user.display_name} открывает профиль избранным.`}
          </h2>
          <p>
            {profile.access === "private"
              ? "Владелец закрыл профиль для всех. Плейлисты и избранное недоступны даже по ссылке."
              : "Отправь заявку — владелец увидит её в настройках и сможет открыть доступ. Это займёт один клик."}
          </p>
          {profile.request_status === "pending" ? (
            <div className="request-status">
              <Clock3 size={17} />
              Заявка отправлена. Ждём ответа владельца.
            </div>
          ) : profile.can_request ? (
            <>
              {profile.request_status === "declined" && (
                <div className="request-status request-status--muted">
                  Предыдущую заявку отклонили. Можно попробовать ещё раз.
                </div>
              )}
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={() => void requestAccess()}
                disabled={requesting}
              >
                <MailPlusIcon />
                {requesting
                  ? "Отправляем…"
                  : profile.request_status === "declined"
                    ? "Попросить доступ снова"
                    : "Попросить доступ"}
              </button>
            </>
          ) : profile.request_status === "declined" ? (
            <div className="request-status request-status--muted">
              Заявку отклонили. Новую можно будет отправить позже.
            </div>
          ) : (
            <p className="locked-profile__hint">
              {profile.is_authenticated
                ? "Заявки недоступны."
                : "Открой ссылку внутри Telegram, чтобы отправить заявку."}
            </p>
          )}
        </section>
      ) : (
        <>
          {profile.liked_tracks.length > 0 && (
            <section className="public-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Любимые треки</h2>
                  <p className="section-subtitle">
                    {trackCount(profile.liked_tracks.length)} · {formatMinutes(totalLikedMs)}
                  </p>
                </div>
                <button
                  type="button"
                  className="section-link"
                  onClick={() => player.playQueue(profile.liked_tracks, 0)}
                >
                  <Play size={15} fill="currentColor" />
                  Слушать всё
                </button>
              </div>
              <div className="track-list track-list--card">
                {profile.liked_tracks.slice(0, 8).map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    queue={profile.liked_tracks}
                    index={index}
                  />
                ))}
              </div>
            </section>
          )}

          {profile.playlists.length > 0 && (
            <section className="public-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Плейлисты</h2>
                  <p className="section-subtitle">То, что {user.display_name} собрал(а)</p>
                </div>
                <span className="public-count">{playlistCount(profile.playlists.length)}</span>
              </div>
              <div className="playlist-grid">
                {profile.playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    to={`/u/${token}/p/${playlist.id}`}
                  />
                ))}
              </div>
            </section>
          )}

          {profile.playlists.length === 0 && profile.liked_tracks.length === 0 && (
            <EmptyState
              title="Пока тихо"
              text="Плейлисты и избранное скрыты или ещё не собраны. Загляни позже."
              icon={<Heart size={26} />}
              compact
            />
          )}
        </>
      )}

      <div className="public-note">
        <span className="public-note__mark">S</span>
        <p>
          <strong>Что такое Sona?</strong> Музыкальный профиль в Telegram: личные
          плейлисты, избранное, офлайн-память и прямое потоковое воспроизведение треков.
        </p>
      </div>
    </div>
  );

  async function copyProfile() {
    const copied = await copyText(window.location.href);
    toast(copied ? "Ссылка скопирована" : "Не удалось скопировать", copied ? "success" : "error");
  }
}

function MailPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
