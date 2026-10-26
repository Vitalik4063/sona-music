import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Disc3,
  Globe2,
  Heart,
  Loader2,
  Play,
  Search,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "../api";
import type { Track } from "../types";
import { usePlayer } from "../state/PlayerContext";
import { useUI } from "../state/UIContext";
import { useTrackLike } from "../hooks/useTrackLike";
import { cn, formatDuration, sourceLabel } from "../utils";
import { Cover } from "../components/Cover";
import { EmptyState } from "../components/EmptyState";
import { TrackRow } from "../components/TrackRow";

const suggestions = [
  { label: "Ночной город", query: "night city", tone: "violet" },
  { label: "Тихий фокус", query: "focus ambient", tone: "sky" },
  { label: "Лоу-фай", query: "lofi", tone: "sun" },
  { label: "Нежность", query: "soft acoustic", tone: "coral" },
  { label: "В дорогу", query: "road trip", tone: "lime" },
  { label: "После дождя", query: "after rain", tone: "mint" },
];

const quickIdeas = [
  "Кино",
  "Billie Eilish",
  "Tame Impala",
  "дора",
  "Molchat Doma",
  "Frank Ocean",
];

function useRecentSearches() {
  const [items, setItems] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("sona.recent-searches") || "[]").slice(0, 6);
    } catch {
      return [];
    }
  });

  const add = (value: string) => {
    const clean = value.trim();
    if (clean.length < 2) return;
    setItems((current) => {
      const next = [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      localStorage.setItem("sona.recent-searches", JSON.stringify(next));
      return next;
    });
  };

  const clear = () => {
    localStorage.removeItem("sona.recent-searches");
    setItems([]);
  };

  return { items, add, clear };
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") || "";
  const [input, setInput] = useState(initial);
  const [term, setTerm] = useState(initial.trim());
  const inputRef = useRef<HTMLInputElement>(null);
  const { add: addRecent } = useRecentSearches();

  useEffect(() => {
    const next = input.trim();
    const timeout = window.setTimeout(() => {
      setTerm(next);
      const current = params.get("q") || "";
      if (next !== current) {
        if (next) setParams({ q: next }, { replace: true });
        else setParams({}, { replace: true });
      }
      if (next.length >= 2) addRecent(next);
    }, 450);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  useEffect(() => {
    if (initial && initial !== input) {
      setInput(initial);
      setTerm(initial.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const enabled = term.length >= 2;
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["search", term],
    queryFn: ({ signal }) => api.search(term, 30, signal),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  const runtime = useMemo(() => {
    if (!data) return "";
    const seconds = Math.max(0.1, data.elapsed_ms / 1000).toFixed(1);
    return `${seconds} с`;
  }, [data]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = input.trim();
    setTerm(clean);
    if (clean) setParams({ q: clean }, { replace: true });
    else setParams({}, { replace: true });
    if (clean.length >= 2) addRecent(clean);
    inputRef.current?.blur();
  };

  const choose = (value: string) => {
    setInput(value);
    setTerm(value);
    setParams({ q: value }, { replace: true });
    addRecent(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page search-page">
      <header className="page-heading search-heading">
        <div>
          <span className="eyebrow">
            <Globe2 size={14} /> Поиск по всем сервисам
          </span>
          <h1>Найди свой звук</h1>
          <p>
            Audius, Deezer, Apple Music и студийные каталоги — в одном поиске. Включай полные версии треков,
            сохраняй в плейлисты и делись музыкой в Telegram.
          </p>
        </div>
        <span className="search-heading__badge">
          <Sparkles size={15} />
          320 kbps · Без ограничений
        </span>
      </header>

      <form className="search-box" onSubmit={submit} role="search">
        <Search size={22} className="search-box__icon" />
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Трек, исполнитель или настроение…"
          aria-label="Поиск музыки"
          autoComplete="off"
          maxLength={120}
        />
        {input && (
          <button
            type="button"
            className="search-box__clear"
            onClick={() => {
              setInput("");
              setTerm("");
              setParams({}, { replace: true });
              inputRef.current?.focus();
            }}
            aria-label="Очистить поиск"
          >
            <X size={18} />
          </button>
        )}
        <button type="submit" className="search-box__submit">
          Найти
        </button>
      </form>

      {!enabled && (
        <div className="search-discover">
          <section className="search-block">
            <div className="search-block__head">
              <h2>Начни с настроения</h2>
              <span>или введи название</span>
            </div>
            <div className="mood-grid">
              {suggestions.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  className={`mood-card mood-card--${item.tone}`}
                  onClick={() => choose(item.query)}
                >
                  <span className="mood-card__index">0{index + 1}</span>
                  <span className="mood-card__rings" aria-hidden="true" />
                  <span className="mood-card__label">{item.label}</span>
                  <ArrowUpRight size={17} className="mood-card__arrow" />
                </button>
              ))}
            </div>
          </section>

          <section className="search-block">
            <div className="search-block__head">
              <h2>Часто ищут</h2>
            </div>
            <div className="quick-search">
              {quickIdeas.map((idea) => (
                <button key={idea} type="button" onClick={() => choose(idea)}>
                  {idea}
                </button>
              ))}
            </div>
          </section>

          <div className="search-note">
            <span className="search-note__icon">
              <Disc3 size={20} />
            </span>
            <p>
              Прямой потоковый аудио-стриминг Sona подключается к глобальным серверам Audius,
              Deezer и Apple Music, обеспечивая непрерывное воспроизведение полных треков и кэширование для офлайна.
            </p>
          </div>
        </div>
      )}

      {enabled && (
        <div className="search-results" aria-live="polite">
          <div className="search-results__bar">
            <span>
              {isFetching && <Loader2 size={15} className="spin" />}
              {data
                ? `Результаты по запросу «${data.query}»`
                : `Ищем «${term}»…`}
            </span>
            {data && (
              <span className="search-results__meta">
                {data.tracks.length} треков · {runtime}
                {data.providers_used.length > 0 && (
                  <> · {data.providers_used.map(sourceLabel).join(", ")}</>
                )}
              </span>
            )}
          </div>

          {isError && (
            <EmptyState
              title="Поиск не отвечает"
              text={error instanceof Error ? error.message : "Попробуй ещё раз через минуту."}
              icon={<SearchX size={26} />}
              action={{ label: "Повторить", onClick: () => void refetch() }}
              compact
            />
          )}

          {!isError && !data && isFetching && (
            <div className="search-loading">
              <div className="search-loading__top">
                <div className="skeleton skeleton--top-result" />
              </div>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton skeleton--row" />
              ))}
            </div>
          )}

          {!isError && data && data.tracks.length === 0 && (
            <EmptyState
              title="Ничего не нашлось"
              text={`По запросу «${term}» пусто. Попробуй другое написание или более общий запрос.`}
              icon={<SearchX size={26} />}
              compact
            />
          )}

          {!isError && data && data.tracks.length > 0 && data.top && (
            <>
              <div className="top-result">
                <span className="top-result__label">
                  <Sparkles size={14} /> Лучший результат
                </span>
                <div className="top-result__body">
                  <Cover
                    src={data.top.artwork_url}
                    seed={data.top.title + data.top.artist}
                    alt={data.top.title}
                    className="top-result__art"
                    loading="eager"
                  />
                  <div className="top-result__info">
                    <h2>{data.top.title}</h2>
                    <p>{data.top.artist}</p>
                    <div className="top-result__meta">
                      <span>{data.top.album || "Сингл"}</span>
                      <span className="dot-sep" />
                      <span>{formatDuration(data.top.duration_ms)}</span>
                    </div>
                    <div className="top-result__providers">
                      {Object.entries(data.top.links)
                        .filter(([, value]) => Boolean(value))
                        .slice(0, 4)
                        .map(([key]) => (
                          <span key={key} className="source-pill">
                            {sourceLabel(key)}
                          </span>
                        ))}
                    </div>
                  </div>
                  <TopResultActions track={data.top} queue={data.tracks} />
                </div>
              </div>

              <section className="search-tracks">
                <div className="search-tracks__head">
                  <h2>Треки</h2>
                  <span>{data.tracks.length}</span>
                </div>
                <div className="track-list">
                  {data.tracks.map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      queue={data.tracks}
                      index={index}
                      showAlbum
                    />
                  ))}
                </div>
              </section>

              <p className="search-legal">
                Нашли не то? Названия в каталогах иногда отличаются. Sona объединяет
                совпадения из разных сервисов, чтобы не дублировать треки.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TopResultActions({ track, queue }: { track: Track; queue: Track[] }) {
  const player = usePlayer();
  const { openTrack } = useUI();
  const { liked, toggle } = useTrackLike(track);

  return (
    <div className="top-result__actions">
      <button
        type="button"
        className="top-result__play"
        onClick={() => player.playTrack(track, queue)}
        aria-label={`Слушать ${track.title}`}
      >
        <Play size={22} fill="currentColor" />
      </button>
      <button
        type="button"
        className={cn("action-circle action-circle--small", liked && "is-liked")}
        onClick={() => void toggle()}
        aria-label={liked ? "Убрать из избранного" : "В избранное"}
      >
        <Heart size={18} fill={liked ? "currentColor" : "none"} />
      </button>
      <button
        type="button"
        className="action-circle action-circle--small"
        onClick={() => openTrack(track)}
        aria-label="О треке"
      >
        <span className="more-dots" aria-hidden="true">•••</span>
      </button>
    </div>
  );
}
