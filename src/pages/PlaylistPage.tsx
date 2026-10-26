import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Globe2,
  Lock,
  Pencil,
  Play,
  Plus,
  Share2,
  Shuffle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "../api";
import { usePlayer } from "../state/PlayerContext";
import { useToast } from "../state/ToastContext";
import { useUI } from "../state/UIContext";
import {
  confirmDialog,
  shareUniversal,
} from "../telegram";
import {
  cn,
  formatMinutes,
  gradientFor,
  playlistCount,
  shuffleTracks,
  trackCount,
} from "../utils";
import { EmptyState } from "../components/EmptyState";
import { ErrorState, PageSkeleton } from "../components/Loading";
import { PlaylistArtwork } from "../components/Cover";
import { Sheet } from "../components/Sheet";
import { TrackRow } from "../components/TrackRow";

export function PlaylistPage() {
  const params = useParams();
  const playlistId = Number(params.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const player = usePlayer();
  const { openCreatePlaylist } = useUI();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: playlist, isLoading, error, refetch } = useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: () => api.playlist(playlistId),
    enabled: Number.isFinite(playlistId),
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!playlist) return;
    setTitle(playlist.title);
    setDescription(playlist.description);
    setIsPublic(playlist.is_public);
  }, [playlist]);

  if (isLoading) return <PageSkeleton />;
  if (error || !playlist) {
    return (
      <ErrorState
        title="Плейлист не найден"
        message={error instanceof Error ? error.message : "Возможно, он был удалён."}
        onRetry={() => void refetch()}
      />
    );
  }

  const settings = settingsQuery.data;
  const shareToken = settings?.share_token || "sona-vvc667";
  const webShareUrl = `${window.location.origin}/u/${shareToken}/p/${playlist.id}`;

  const share = async () => {
    const text = `Плейлист «${playlist.title}» в Sona${
      playlist.is_public ? "" : " · доступ по ссылке"
    }`;
    const res = await shareUniversal({
      url: webShareUrl,
      title: playlist.title,
      text,
    });
    toast(
      res.copied ? "Ссылка на плейлист скопирована" : "Не удалось скопировать",
      res.copied ? "success" : "error",
    );
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await api.updatePlaylist(playlist.id, {
        title: title.trim(),
        description: description.trim(),
        is_public: isPublic,
      });
      queryClient.setQueryData(["playlist", playlist.id], updated);
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      toast("Плейлист обновлён", "success");
      setEditOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось сохранить изменения", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (deleting) return;
    const question = `Удалить плейлист «${playlist.title}»? Треки останутся в избранном, если ты их лайкнул.`;
    const confirmed = await confirmDialog(question);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api.deletePlaylist(playlist.id);
      queryClient.removeQueries({ queryKey: ["playlist", playlist.id] });
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      toast("Плейлист удалён", "success");
      navigate("/library");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось удалить плейлист", "error");
      setDeleting(false);
    }
  };

  const removeTrack = async (trackId: number) => {
    try {
      const updated = await api.removeTrackFromPlaylist(playlist.id, trackId);
      queryClient.setQueryData(["playlist", playlist.id], updated);
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      toast("Трек убран из плейлиста", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось убрать трек", "error");
    }
  };

  const shuffle = () => {
    if (!playlist.tracks.length) return;
    player.playQueue(shuffleTracks(playlist.tracks), 0);
  };

  return (
    <div className="page playlist-page">
      <Link to="/library" className="back-link">
        <ArrowLeft size={16} />
        Коллекция
      </Link>

      <section
        className="playlist-hero"
        style={{ ["--hero-gradient" as string]: gradientFor(playlist.title) }}
      >
        <div className="playlist-hero__art-wrap">
          <PlaylistArtwork
            images={playlist.collage}
            cover={playlist.cover_url}
            seed={playlist.title}
            className="playlist-hero__art"
            alt={playlist.title}
          />
          <span className="playlist-hero__sticker">
            {playlist.is_public ? "public" : "private"}
          </span>
        </div>
        <div className="playlist-hero__copy">
          <span className="eyebrow">
            {playlist.is_public ? <Globe2 size={14} /> : <Lock size={14} />}
            {playlist.is_public ? "Публичный плейлист" : "Скрытый плейлист"}
          </span>
          <h1>{playlist.title}</h1>
          {playlist.description ? (
            <p>{playlist.description}</p>
          ) : (
            <p className="playlist-hero__empty-desc">
              Без описания — просто музыка, которая говорит сама за себя.
            </p>
          )}
          <div className="playlist-hero__meta">
            <span>{trackCount(playlist.track_count)}</span>
            <span className="dot-sep" />
            <span>{formatMinutes(playlist.total_duration_ms)}</span>
            <span className="dot-sep" />
            <span>твоя подборка</span>
          </div>
          <div className="playlist-hero__actions">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => playlist.tracks.length && player.playQueue(playlist.tracks, 0)}
              disabled={!playlist.tracks.length}
            >
              <Play size={18} fill="currentColor" />
              Слушать
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              onClick={shuffle}
              disabled={!playlist.tracks.length}
            >
              <Shuffle size={18} />
              Перемешать
            </button>
            <button
              type="button"
              className="action-circle action-circle--on-hero"
              onClick={() => void share()}
              aria-label="Поделиться плейлистом"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              className="action-circle action-circle--on-hero"
              onClick={() => setEditOpen(true)}
              aria-label="Редактировать плейлист"
            >
              <Pencil size={17} />
            </button>
            <button
              type="button"
              className="action-circle action-circle--on-hero action-circle--danger"
              onClick={() => void remove()}
              disabled={deleting}
              aria-label="Удалить плейлист"
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
        <span className="playlist-hero__count" aria-hidden="true">
          {String(playlist.track_count).padStart(2, "0")}
        </span>
      </section>

      {playlist.tracks.length === 0 ? (
        <EmptyState
          title="Плейлист пока пуст"
          text="Найди треки в поиске и добавляй их сюда — или создай новую подборку с нуля."
          icon={<Sparkles size={27} />}
          action={{ label: "Добавить треки", to: "/search" }}
        />
      ) : (
        <section className="playlist-content">
          <div className="playlist-toolbar">
            <span className="playlist-toolbar__label">
              <Sparkles size={15} />
              {trackCount(playlist.tracks.length)}
            </span>
            <div className="playlist-toolbar__actions">
              <Link to="/search" className="section-link">
                <Plus size={15} />
                Добавить треки
              </Link>
              <button
                type="button"
                className="section-link"
                onClick={() => {
                  openCreatePlaylist();
                }}
              >
                <Sparkles size={15} />
                Новый плейлист
              </button>
            </div>
          </div>
          <div className="track-list">
            {playlist.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={playlist.tracks}
                index={index}
                onRemove={(item) => void removeTrack(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="playlist-footer-note">
        <span className="playlist-footer-note__mark">S</span>
        <p>
          Этот плейлист — часть твоего музыкального профиля.{" "}
          {playlist.is_public
            ? "Друзья смогут открыть его по ссылке."
            : "Он виден только тебе — даже если профиль открыт."}
        </p>
      </div>

      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Редактировать плейлист"
        subtitle={playlistCount(1)}
      >
        <form className="create-form" onSubmit={save}>
          <div className="field">
            <label htmlFor="edit-title">Название</label>
            <input
              id="edit-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="field">
            <label htmlFor="edit-description">Описание</label>
            <textarea
              id="edit-description"
              className="input input--textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="О чём этот плейлист?"
            />
          </div>
          <button
            type="button"
            className={cn("visibility-toggle", isPublic && "is-public")}
            onClick={() => setIsPublic((value) => !value)}
            aria-pressed={isPublic}
          >
            <span className="visibility-toggle__icon">
              {isPublic ? <Globe2 size={19} /> : <Lock size={19} />}
            </span>
            <span className="visibility-toggle__text">
              <strong>{isPublic ? "Виден в профиле" : "Скрыт в профиле"}</strong>
              <small>
                {isPublic
                  ? "Открывается по ссылке на профиль"
                  : "Доступен только тебе"}
              </small>
            </span>
            <span className={cn("toggle", isPublic && "is-on")} aria-hidden="true">
              <span />
            </span>
          </button>
          <div className="create-form__footer">
            <span className="create-form__hint">
              <Lock size={14} /> Настройки можно изменить в любой момент
            </span>
            <button type="submit" className="btn btn--primary" disabled={saving || !title.trim()}>
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
