import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Music2,
  Upload,
  CheckCircle2,
  ArrowRight,
  Disc3,
  Link2,
  ClipboardPaste,
  Sparkles,
} from "lucide-react";
import { api } from "../api";
import { useToast } from "../state/ToastContext";
import { haptic } from "../telegram";
import { parseImportUrl } from "../utils/musicLogic";

const PROVIDER_LABELS: Record<string, string> = {
  sona: "Sona",
  yandex: "Яндекс.Музыка",
  vk: "VK Музыка",
  soundcloud: "SoundCloud",
  deezer: "Deezer",
  spotify: "Spotify",
  generic_url: "Веб-ссылка",
};

const KIND_LABELS: Record<string, string> = {
  playlist: "плейлист",
  profile: "профиль",
  album: "альбом",
  artist: "артист",
};

export function ImportPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [urlInput, setUrlInput] = useState("");
  const [urlPlaylistTitle, setUrlPlaylistTitle] = useState("");
  const [isUrlImporting, setIsUrlImporting] = useState(false);

  const [activeTab, setActiveTab] = useState<"vk" | "yandex">("vk");
  const [inputText, setInputText] = useState("");
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importedResult, setImportedResult] = useState<{
    id: number;
    title: string;
    count: number;
    source?: string;
  } | null>(null);

  const detectedUrl = parseImportUrl(urlInput);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim()) {
          setUrlInput(clip.trim());
          toast("Ссылка вставлена из буфера", "info");
          haptic("light");
          return;
        }
      }
      const lastCopied = (window as any).__lastCopiedText;
      if (lastCopied) {
        setUrlInput(String(lastCopied));
        toast("Ссылка вставлена из буфера", "info");
        return;
      }
      toast("Нажми и удерживай поле ввода, чтобы вставить ссылку", "info");
    } catch {
      const lastCopied = (window as any).__lastCopiedText;
      if (lastCopied) {
        setUrlInput(String(lastCopied));
        toast("Ссылка вставлена", "info");
      } else {
        toast("Вставь ссылку в поле с помощью Ctrl+V / Вставить", "info");
      }
    }
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      toast("Вставь ссылку на плейлист или профиль", "error");
      return;
    }

    setIsUrlImporting(true);
    setImportedResult(null);

    try {
      haptic("medium");
      const res = await api.importByUrl({
        url: urlInput.trim(),
        playlist_title: urlPlaylistTitle.trim() || undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });

      setImportedResult({
        id: res.playlist.id,
        title: res.playlist.title,
        count: res.imported_count,
        source: res.source,
      });

      toast(
        `Успешно импортировано ${res.imported_count} треков (${res.source || "по ссылке"})`,
        "success",
      );
      haptic("success");
    } catch (err: any) {
      toast(err.message || "Не удалось импортировать по ссылке", "error");
      haptic("error");
    } finally {
      setIsUrlImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      setInputText(content);
      if (!playlistTitle) {
        setPlaylistTitle(file.name.replace(/\.(txt|json|csv|m3u8?)$/i, ""));
      }
      toast(`Файл «${file.name}» загружен`, "info");
      haptic("light");
    };
    reader.readAsText(file);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      toast("Вставь список треков, ссылку или загрузи файл", "error");
      return;
    }

    setIsImporting(true);
    setImportedResult(null);

    try {
      haptic("medium");
      let res;
      if (activeTab === "vk") {
        res = await api.importVk({
          input_text: inputText,
          playlist_title: playlistTitle || undefined,
        });
      } else {
        res = await api.importYandex({
          input_text: inputText,
          playlist_title: playlistTitle || undefined,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });

      setImportedResult({
        id: res.playlist.id,
        title: res.playlist.title,
        count: res.imported_count,
        source: res.source,
      });

      toast(`Успешно импортировано ${res.imported_count} треков`, "success");
      haptic("success");
    } catch (err: any) {
      toast(err.message || "Ошибка импорта. Проверь формат треков или ссылку.", "error");
      haptic("error");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="page import-page" style={{ padding: "24px 20px 100px", maxWidth: "900px", margin: "0 auto" }}>
      <header className="page-header" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span className="tag" style={{ background: "var(--lime-soft)", color: "var(--lime)", border: "1px solid var(--lime)" }}>
            Синхронизация каталогов
          </span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, margin: "0 0 8px" }}>
          Импорт плейлистов и профилей
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1.6" }}>
          Скопируй ссылку на любой плейлист или музыкальный профиль (Sona, VK Музыка, Яндекс.Музыка, SoundCloud, Deezer, Spotify) или вставь список треков — Sona автоматически перенесёт музыку с полными аудиопотоками.
        </p>
      </header>

      {importedResult && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(200, 255, 77, 0.14), rgba(0, 0, 0, 0.5))",
            border: "1px solid var(--lime)",
            borderRadius: "18px",
            padding: "20px",
            marginBottom: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <CheckCircle2 size={32} color="var(--lime)" />
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700 }}>
                Плейлист «{importedResult.title}» готов
              </h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                Добавлено {importedResult.count} треков с обложками и полным воспроизведением
                {importedResult.source ? ` · источник: ${importedResult.source}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate(`/playlist/${importedResult.id}`)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span>Открыть плейлист</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* URL Import Card: Paste a link to a playlist or profile */}
      <form
        onSubmit={handleUrlImport}
        className="settings-card"
        style={{
          marginBottom: "28px",
          border: "1px solid var(--line-strong)",
          background: "linear-gradient(160deg, rgba(200, 255, 77, 0.06), rgba(255, 255, 255, 0.02))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "var(--lime-soft)",
                color: "var(--lime)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Link2 size={18} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                Импорт по ссылке на плейлист или профиль
              </h2>
              <small style={{ color: "var(--muted)", fontSize: "12px" }}>
                Поддерживаются ссылки Sona, Яндекс.Музыка, VK Музыка, SoundCloud, Deezer и Spotify
              </small>
            </div>
          </div>
          {detectedUrl && (
            <span
              className="tag"
              style={{
                background: "rgba(200, 255, 77, 0.14)",
                color: "var(--lime)",
                border: "1px solid rgba(200, 255, 77, 0.35)",
                fontSize: "12px",
              }}
            >
              <Sparkles size={12} />
              Распознано: {PROVIDER_LABELS[detectedUrl.provider] || "Ссылка"} · {KIND_LABELS[detectedUrl.kind] || "подборка"}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          <input
            type="text"
            className="input"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Вставь ссылку на плейлист или профиль (https://...)"
            aria-label="Ссылка на плейлист или профиль"
            style={{ flex: "1 1 260px" }}
          />
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void handlePasteClipboard()}
            title="Вставить ссылку из буфера обмена"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <ClipboardPaste size={16} />
            <span>Вставить</span>
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <input
            type="text"
            className="input"
            value={urlPlaylistTitle}
            onChange={(e) => setUrlPlaylistTitle(e.target.value)}
            placeholder="Своё название плейлиста (необязательно)"
            aria-label="Своё название плейлиста"
            style={{ flex: "1 1 220px", fontSize: "13px" }}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={isUrlImporting || !urlInput.trim()}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Download size={16} />
            <span>{isUrlImporting ? "Импортируем по ссылке…" : "Импортировать по ссылке"}</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Примеры ссылок:</span>
          {[
            { label: "Профиль Sona", url: `${window.location.origin}/u/sona-vvc667` },
            { label: "Яндекс.Музыка", url: "https://music.yandex.ru/users/yamusic-daily/playlists/1033" },
            { label: "VK Плейлист", url: "https://vk.com/music/playlist/-147845620_987" },
            { label: "Deezer Top", url: "https://www.deezer.com/playlist/908622995" },
          ].map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => setUrlInput(sample.url)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "3px 8px",
                fontSize: "11px",
                color: "var(--text-soft)",
                cursor: "pointer",
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </form>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: "rgba(255, 255, 255, 0.03)", padding: "4px", borderRadius: "14px", border: "1px solid var(--line)" }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab("vk");
            haptic("selection");
          }}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: activeTab === "vk" ? "var(--elev-3)" : "transparent",
            color: activeTab === "vk" ? "var(--lime)" : "var(--muted)",
            border: activeTab === "vk" ? "1px solid var(--line-strong)" : "1px solid transparent",
            transition: "all 0.15s ease",
          }}
        >
          <Disc3 size={16} />
          <span>VK Музыка (список / файл)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("yandex");
            haptic("selection");
          }}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: activeTab === "yandex" ? "var(--elev-3)" : "transparent",
            color: activeTab === "yandex" ? "var(--lime)" : "var(--muted)",
            border: activeTab === "yandex" ? "1px solid var(--line-strong)" : "1px solid transparent",
            transition: "all 0.15s ease",
          }}
        >
          <Music2 size={16} />
          <span>Яндекс.Музыка (список / файл)</span>
        </button>
      </div>

      <form onSubmit={handleImport} className="settings-card" style={{ marginBottom: "30px" }}>
        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
            Название плейлиста в Sona
          </label>
          <input
            type="text"
            className="input"
            value={playlistTitle}
            onChange={(e) => setPlaylistTitle(e.target.value)}
            placeholder={activeTab === "vk" ? "Мои аудиозаписи VK" : "Моя волна · Яндекс"}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>
              Список треков (Исполнитель — Название) или ссылка
            </label>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.m3u,.m3u8,.json"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  fontSize: "12px",
                  color: "var(--lime)",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "none",
                  border: "none",
                  padding: "2px 6px",
                  cursor: "pointer",
                }}
              >
                <Upload size={13} />
                Загрузить файл (.txt / .m3u)
              </button>
            </div>
          </div>
          <textarea
            className="input"
            rows={6}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Вставь ссылку или список треков построчно:\nMiyaGi & Эндшпиль - I Got Love\nСкриптонит - Положение\nThe Weeknd - Blinding Lights`}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.6" }}
          />
          <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "6px", display: "block" }}>
            Поддерживаются прямые ссылки на плейлисты/профили, разделители дефис (-), тире (—), списки .m3u и нумерованные строки.
          </small>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setInputText("");
              setPlaylistTitle("");
            }}
            disabled={isImporting}
          >
            Очистить
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={isImporting || !inputText.trim()}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Download size={16} />
            <span>{isImporting ? "Сопоставляем треки…" : "Импортировать в медиатеку"}</span>
          </button>
        </div>
      </form>

      <div className="settings-card" style={{ background: "rgba(255,255,255,0.015)" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Music2 size={16} color="var(--lime)" />
          Как перенести плейлисты и профили?
        </h3>
        <ol style={{ paddingLeft: "20px", color: "var(--muted)", fontSize: "13px", lineHeight: "1.7" }}>
          <li>
            <strong>По прямой ссылке:</strong> Скопируй ссылку на плейлист или профиль из Sona, VK Музыки, Яндекс.Музыки, SoundCloud, Deezer или Spotify и вставь в верхнее поле.
          </li>
          <li>
            <strong>Списком или файлом:</strong> Скопируй текстовый список треков (`Артист - Название`) или загрузи `.txt` / `.m3u` файл.
          </li>
          <li>
            <strong>Потоковое сопоставление:</strong> Sona автоматически подбирает полные оригинальные версии треков (320 kbps) и сохраняет плейлист в твою коллекцию.
          </li>
        </ol>
      </div>
    </div>
  );
}

