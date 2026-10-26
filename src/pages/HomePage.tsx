import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Download,
  HardDrive,
  Headphones,
  Play,
  Radio,
  Search,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { usePlayer } from "../state/PlayerContext";
import { useUI } from "../state/UIContext";
import { getTelegramUser } from "../telegram";
import { cn, greeting, trackCount } from "../utils";
import { Avatar } from "../components/Avatar";
import { Cover } from "../components/Cover";
import { EmptyState } from "../components/EmptyState";
import { ErrorState, PageSkeleton } from "../components/Loading";
import { MixCard } from "../components/MixCard";
import { PlaylistCard } from "../components/PlaylistCard";
import { SectionHeader } from "../components/SectionHeader";
import { TrackTile } from "../components/TrackTile";

export function HomePage() {
  const { user } = useAuth();
  const tgUser = getTelegramUser();
  const navigate = useNavigate();
  const player = usePlayer();
  const { openCreatePlaylist } = useUI();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["home"],
    queryFn: api.home,
  });

  if (isLoading) return <PageSkeleton />;
  if (error || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  const effectiveDisplayName = tgUser
    ? `${tgUser.first_name} ${tgUser.last_name || ""}`.trim()
    : user?.display_name || data.user.display_name;
  const effectiveUsername = tgUser?.username || user?.username || data.user.username;
  const effectivePhotoUrl = tgUser?.photo_url || user?.photo_url || data.user.photo_url;
  const firstName = (tgUser?.first_name || effectiveDisplayName || data.user.first_name).split(" ")[0];
  const featuredMix = data.mixes[0];
  const featuredTrack = featuredMix?.tracks?.[0] || data.recent[0] || data.new_releases[0];
  const heroCovers = (
    featuredMix?.tracks?.length
      ? featuredMix.tracks
      : data.recent.length
        ? data.recent
        : data.new_releases
  )
    .filter((track) => track.artwork_url)
    .slice(0, 3);
  const heroStats = [
    { value: data.stats.liked ?? data.liked_count, label: "в избранном" },
    { value: data.stats.playlists ?? data.playlists.length, label: "плейлистов" },
    { value: data.stats.tracks ?? 0, label: "треков в коллекции" },
  ];

  const hasAnyTracks = Boolean(
    featuredMix?.tracks.length || data.recent.length || data.new_releases.length,
  );

  const playFeatured = () => {
    if (featuredMix?.tracks.length) player.playQueue(featuredMix.tracks, 0);
    else if (data.recent.length) player.playQueue(data.recent, 0);
    else if (data.new_releases.length) player.playQueue(data.new_releases, 0);
    else navigate("/search");
  };

  return (
    <div className="page home-page">
      <section className="home-hero">
        <div className="home-hero__copy">
          <span className="eyebrow home-hero__eyebrow">
            <span className="eyebrow__pulse" />
            {greeting()}, {firstName}
          </span>
          <h1 className="home-hero__title">
            Музыка,
            <br />
            которая <em>звучит</em>
            <br />
            как ты.
          </h1>
          <p className="home-hero__lead">
            Собирай плейлисты из находок во всех сервисах, слушай треки целиком
            без ограничений и делись своей коллекцией в один клик.
          </p>
          <div className="home-hero__actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={playFeatured}>
              <Play size={18} fill="currentColor" />
              {featuredMix ? "Слушать микс дня" : hasAnyTracks ? "Включить музыку" : "Открыть поиск треков"}
            </button>
            <Link to="/search" className="btn btn--ghost btn--lg">
              <Search size={18} />
              Найти трек
            </Link>
          </div>
          <div className="home-hero__stats">
            {heroStats.map((stat) => (
              <div key={stat.label} className="hero-stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="home-hero__stage" aria-label="Твоя музыка в Sona">
          <span className="stage-orbit stage-orbit--outer" aria-hidden="true" />
          <span className="stage-orbit stage-orbit--middle" aria-hidden="true" />
          <span className="stage-orbit stage-orbit--inner" aria-hidden="true" />
          <span className="stage-glow" aria-hidden="true" />
          <div className="stage-disc" aria-hidden="true">
            <span className="stage-disc__groove" />
            <span className="stage-disc__label">
              <span />
            </span>
          </div>

          <div className="stage-covers">
            {heroCovers.length > 0 ? (
              heroCovers.map((track, index) => (
                <button
                  key={track.id}
                  type="button"
                  className={cn("stage-cover", `stage-cover--${index + 1}`)}
                  onClick={() => player.playTrack(track, featuredMix?.tracks || data.recent || data.new_releases)}
                  aria-label={`Слушать ${track.title}`}
                >
                  <Cover
                    src={track.artwork_url}
                    seed={track.title + track.artist}
                    alt=""
                    loading="eager"
                  />
                </button>
              ))
            ) : (
              <div className="stage-cover stage-cover--1">
                <Cover seed="Sona" alt="" />
              </div>
            )}
          </div>

          <div className="stage-now">
            <button
              type="button"
              className="stage-now__play"
              onClick={playFeatured}
              aria-label="Слушать подборку"
            >
              <Play size={18} fill="currentColor" />
            </button>
            <div className="stage-now__meta">
              <span className="stage-now__label">
                {featuredMix ? "Собрано для тебя" : "Начни слушать"}
              </span>
              <strong>{featuredTrack?.title || "Поиск полных треков"}</strong>
              <small>{featuredTrack?.artist || "320 kbps · Эквалайзер"}</small>
            </div>
            <span className="stage-now__wave" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      </section>

      <section className="home-section" style={{ marginTop: "10px", marginBottom: "26px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
          <Link
            to="/import"
            style={{
              padding: "14px 16px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--lime-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lime)" }}>
              <Download size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>Импорт музыки</div>
              <div style={{ color: "var(--muted)", fontSize: "11px" }}>VK и Яндекс.Музыка</div>
            </div>
          </Link>

          <Link
            to="/offline"
            style={{
              padding: "14px 16px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255, 122, 89, 0.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--coral)" }}>
              <HardDrive size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>Офлайн-память</div>
              <div style={{ color: "var(--muted)", fontSize: "11px" }}>Без интернета</div>
            </div>
          </Link>

          <Link
            to="/science"
            style={{
              padding: "14px 16px",
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(139, 215, 255, 0.14)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sky)" }}>
              <Waves size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>Частоты и звук</div>
              <div style={{ color: "var(--muted)", fontSize: "11px" }}>Генератор ритмов</div>
            </div>
          </Link>
        </div>
      </section>

      {data.mixes.length > 0 && (
        <section className="home-section">
          <SectionHeader
            title="Собрано для тебя"
            subtitle="Миксы меняются вместе с твоими вкусами"
            actionLabel="Все подборки"
            to="/library"
          />
          <div className="mix-row">
            {data.mixes.slice(0, 4).map((mix) => (
              <MixCard key={mix.id} mix={mix} />
            ))}
          </div>
        </section>
      )}

      <section className="home-section">
        <SectionHeader
          title="Твои плейлисты"
          subtitle="Личные подборки для любого настроения"
          actionLabel="Коллекция"
          to="/library"
        >
          <button
            type="button"
            className="section-icon-btn"
            onClick={() => openCreatePlaylist()}
            aria-label="Создать плейлист"
          >
            <Sparkles size={17} />
          </button>
        </SectionHeader>
        {data.playlists.length > 0 ? (
          <div className="playlist-grid playlist-grid--home">
            {data.playlists.slice(0, 5).map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
            <button
              type="button"
              className="playlist-card playlist-card--create"
              onClick={() => openCreatePlaylist()}
            >
              <span className="playlist-create__art">
                <span className="playlist-create__plus">+</span>
                <span className="playlist-create__rings" aria-hidden="true" />
              </span>
              <span className="playlist-card__title">Новый плейлист</span>
              <span className="playlist-card__meta">Собрать свою историю</span>
            </button>
          </div>
        ) : (
          <EmptyState
            title="Пока тихо"
            text="Создай первый плейлист — он станет твоей музыкальной комнатой."
            icon={<Sparkles size={26} />}
            action={{ label: "Создать плейлист", onClick: () => openCreatePlaylist() }}
            compact
          />
        )}
      </section>

      {data.recent.length > 0 && (
        <section className="home-section">
          <SectionHeader
            title="Продолжить слушать"
            subtitle="Возвращайся туда, где остановился"
            actionLabel="История"
            to="/library"
          />
          <div className="tile-row">
            {data.recent.slice(0, 6).map((track) => (
              <TrackTile key={track.id} track={track} queue={data.recent} />
            ))}
          </div>
        </section>
      )}

      <section className="home-section">
        <SectionHeader
          title="Новые находки"
          subtitle="Найденные тобой полные треки из мировых каталогов"
          actionLabel="Открыть поиск"
          to="/search"
        />
        {data.new_releases.length > 0 ? (
          <div className="tile-row">
            {data.new_releases.slice(0, 6).map((track) => (
              <TrackTile key={track.id} track={track} queue={data.new_releases} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Коллекция готова к запуску"
            text="Найди любой трек по названию или исполнителю — он будет играть целиком в оригинальном качестве."
            action={{ label: "Перейти к поиску", to: "/search" }}
            compact
          />
        )}
      </section>

      <section className="profile-cta">
        <div className="profile-cta__rings" aria-hidden="true" />
        <div className="profile-cta__copy">
          <span className="eyebrow">
            <Users size={14} /> Музыкальный профиль
          </span>
          <h2>Покажи, что звучит у тебя в голове.</h2>
          <p>
            Поделись ссылкой на профиль: друзья увидят любимые треки и плейлисты.
            А доступ можно открыть всем, только избранным или по заявке.
          </p>
          <div className="profile-cta__actions">
            <Link to="/profile" className="btn btn--primary">
              Мой профиль
              <ArrowRight size={17} />
            </Link>
            <Link to="/settings" className="btn btn--ghost">
              Настроить доступ
            </Link>
          </div>
        </div>
        <div className="profile-cta__card">
          <div className="profile-cta__user">
            <Avatar
              name={effectiveDisplayName}
              src={effectivePhotoUrl}
              size="lg"
              ring
            />
            <div>
              <strong>{effectiveDisplayName}</strong>
              <span>{effectiveUsername ? `@${effectiveUsername}` : "музыкальный профиль"}</span>
            </div>
          </div>
          <div className="profile-cta__mini">
            <div>
              <Radio size={16} />
              <span>{trackCount(data.recent.length)} в истории</span>
            </div>
            <div>
              <Headphones size={16} />
              <span>{data.playlists.length} плейлистов</span>
            </div>
          </div>
          <span className="profile-cta__stamp">sona</span>
        </div>
      </section>
    </div>
  );
}
