import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, HardDrive, Wifi, WifiOff, Trash2, Play, CheckCircle2 } from "lucide-react";
import { usePlayer } from "../state/PlayerContext";
import { useToast } from "../state/ToastContext";
import { getOfflineStorageInfo } from "../utils/offlineStore";
import { formatDuration } from "../utils/musicLogic";
import { haptic } from "../telegram";
import { api } from "../api";

export function OfflinePage() {
  const navigate = useNavigate();
  const {
    isOfflineMode,
    setIsOfflineMode,
    offlineTracks,
    refreshOffline,
    downloadTrack,
    removeDownloadedTrack,
    playTrack,
    current,
    isPlaying,
  } = usePlayer();

  const { toast } = useToast();
  const [storageInfo, setStorageInfo] = useState({ count: 0, totalMB: "0.00" });
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    refreshOffline();
    getOfflineStorageInfo().then(setStorageInfo);
  }, [refreshOffline, offlineTracks.length]);

  const handleToggleOffline = () => {
    setIsOfflineMode(!isOfflineMode);
    haptic("medium");
  };

  const handleCacheCollection = async () => {
    setIsPreloading(true);
    try {
      const [home, likes] = await Promise.all([api.home(), api.likes()]);
      const seen = new Set<number>();
      const allToDownload = [...likes, ...home.recent, ...home.new_releases].filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      if (allToDownload.length === 0) {
        toast("Сначала найди или лайкни треки в поиске, чтобы сохранить их для офлайна", "info");
        navigate("/search");
        return;
      }
      toast("Сохраняем треки из твоей коллекции в офлайн-память...", "info");
      let downloaded = 0;
      for (const track of allToDownload.slice(0, 10)) {
        await downloadTrack(track);
        downloaded++;
      }
      await refreshOffline();
      const info = await getOfflineStorageInfo();
      setStorageInfo(info);
      toast(`Сохранено ${downloaded} треков для офлайна!`, "success");
      haptic("success");
    } catch {
      toast("Не удалось завершить сохранение", "error");
    } finally {
      setIsPreloading(false);
    }
  };

  return (
    <div className="page offline-page" style={{ padding: "24px 20px 100px", maxWidth: "900px", margin: "0 auto" }}>
      <header className="page-header" style={{ marginBottom: "26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span
            className="tag"
            style={{
              background: isOfflineMode ? "rgba(255, 122, 89, 0.15)" : "var(--lime-soft)",
              color: isOfflineMode ? "var(--coral)" : "var(--lime)",
              border: `1px solid ${isOfflineMode ? "var(--coral)" : "var(--lime)"}`,
            }}
          >
            {isOfflineMode ? "Автономный режим активен" : "Онлайн-синхронизация"}
          </span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, margin: "0 0 8px" }}>
          Офлайн-режим & Загрузки
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1.6" }}>
          Слушай любимую музыку в метро, самолете или без доступа к интернету. Все загруженные треки хранятся в защищённом хранилище IndexedDB твоего устройства.
        </p>
      </header>

      {/* Control Banner */}
      <div
        className="settings-card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
          marginBottom: "24px",
          background: isOfflineMode
            ? "linear-gradient(135deg, rgba(255, 122, 89, 0.12), rgba(0, 0, 0, 0.5))"
            : "linear-gradient(135deg, rgba(200, 255, 77, 0.08), rgba(0, 0, 0, 0.5))",
          border: isOfflineMode ? "1px solid var(--coral)" : "1px solid var(--line-strong)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: isOfflineMode ? "var(--coral-soft)" : "var(--lime-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isOfflineMode ? "var(--coral)" : "var(--lime)",
            }}
          >
            {isOfflineMode ? <WifiOff size={24} /> : <Wifi size={24} />}
          </div>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700 }}>
              {isOfflineMode ? "Режим «Только офлайн» включён" : "Офлайн-режим выключен"}
            </h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
              {isOfflineMode
                ? "Приложение воспроизводит только аудио из памяти устройства"
                : "Включи переключатель, чтобы скрыть сетевой контент"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className={isOfflineMode ? "btn btn--primary" : "btn btn--secondary"}
          onClick={handleToggleOffline}
          style={{
            background: isOfflineMode ? "var(--coral)" : undefined,
            color: isOfflineMode ? "#000" : undefined,
            fontWeight: 700,
          }}
        >
          {isOfflineMode ? "Выключить офлайн" : "Включить режим офлайн"}
        </button>
      </div>

      {/* Storage Meter & Preload Banner */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div className="settings-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <HardDrive size={20} color="var(--lime)" />
            <span style={{ fontSize: "14px", fontWeight: 700 }}>Локальное хранилище</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--lime)" }}>
            {storageInfo.totalMB} MB
          </div>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>
            Загружено песен: <strong>{storageInfo.count}</strong>
          </p>
        </div>

        <div className="settings-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              <Download size={18} color="var(--lime)" />
              Быстрая офлайн-загрузка
            </span>
            <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "6px", lineHeight: "1.5" }}>
              Сохранить избранные и недавние треки из твоей коллекции в память устройства.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleCacheCollection}
            disabled={isPreloading}
            style={{ marginTop: "12px", width: "100%", justifyContent: "center" }}
          >
            {isPreloading ? "Сохраняем в память..." : "Кэшировать мою коллекцию"}
          </button>
        </div>
      </div>

      {/* Tracks List */}
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>
          Загруженные треки ({offlineTracks.length})
        </h2>

        {offlineTracks.length === 0 ? (
          <div
            className="settings-card"
            style={{
              textAlign: "center",
              padding: "48px 20px",
              color: "var(--muted)",
            }}
          >
            <Download size={36} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: "0 0 6px" }}>
              Пока нет сохранённых треков
            </h3>
            <p style={{ fontSize: "13px", maxWidth: "400px", margin: "0 auto 16px" }}>
              Открой меню любого трека («•••») в поиске или плейлисте и выбери «Скачать офлайн».
            </p>
            <button type="button" className="btn btn--primary" onClick={handleCacheCollection} disabled={isPreloading}>
              Кэшировать мою медиатеку
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {offlineTracks.map((track) => {
              const isCurrent = current?.id === track.id;
              return (
                <div
                  key={track.id}
                  className="track-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "14px",
                    background: isCurrent ? "var(--elev-3)" : "rgba(255, 255, 255, 0.02)",
                    border: isCurrent ? "1px solid var(--lime)" : "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      className="icon-btn icon-btn--play"
                      onClick={() => {
                        playTrack(track, offlineTracks);
                        haptic("light");
                      }}
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        background: isCurrent && isPlaying ? "var(--lime)" : "rgba(255, 255, 255, 0.08)",
                        color: isCurrent && isPlaying ? "#000" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                      aria-label={`Воспроизвести ${track.title}`}
                    >
                      <Play size={16} fill={isCurrent && isPlaying ? "#000" : "#fff"} />
                    </button>

                    {track.artwork_url && (
                      <img
                        src={track.artwork_url}
                        alt=""
                        style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover" }}
                      />
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: isCurrent ? "var(--lime)" : "var(--text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          color: "var(--muted)",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {track.artist}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
                    <span style={{ color: "var(--lime)", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
                      <CheckCircle2 size={14} />
                      Офлайн
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "12px", minWidth: "36px", textAlign: "right" }}>
                      {formatDuration(track.duration_ms)}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={async () => {
                        await removeDownloadedTrack(track.id);
                        const info = await getOfflineStorageInfo();
                        setStorageInfo(info);
                        haptic("light");
                      }}
                      title="Удалить из офлайна"
                      aria-label={`Удалить ${track.title} из загрузок`}
                      style={{ color: "var(--muted)", padding: "6px" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
