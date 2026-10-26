import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, BookOpen, Volume2, VolumeX, Play, Square, ExternalLink, Sliders } from "lucide-react";
import { api } from "../api";
import { EQ_FREQUENCIES, EQ_PRESETS, usePlayer } from "../state/PlayerContext";
import { useToast } from "../state/ToastContext";
import { haptic } from "../telegram";

const BRAIN_WAVE_PRESETS = [
  {
    id: "alpha",
    name: "Альфа-ритм (8–12 Гц)",
    frequency: 10,
    carrier: 200,
    label: "Состояние потока & Концентрация",
    description: "Снижает уровень кортизола, усиливает продуктивность и креативное мышление без сонливости.",
    color: "#c8ff4d",
  },
  {
    id: "beta",
    name: "Активный ритм (13–30 Гц)",
    frequency: 18,
    carrier: 220,
    label: "Пиковая активность мозга",
    description: "Активизирует префронтальную кору, стимулирует внимание при решении сложных аналитических задач.",
    color: "#ff7a59",
  },
  {
    id: "theta",
    name: "Тета-ритм (4–7 Гц)",
    frequency: 6,
    carrier: 180,
    label: "Глубокая медитация & Интуиция",
    description: "Фаза быстрого сна и консолидации долговременной памяти в гиппокампе.",
    color: "#8bd7ff",
  },
  {
    id: "delta",
    name: "Дельта-ритм (0.5–4 Гц)",
    frequency: 2.5,
    carrier: 150,
    label: "Восстановление & Глубокий сон",
    description: "Стимулирует выделение гормона роста и регенерацию нервной ткани во время отдыха.",
    color: "#cbb7ff",
  },
];

export function NeuroSciencePage() {
  const { toast } = useToast();
  const player = usePlayer();
  const [selectedWave, setSelectedWave] = useState(BRAIN_WAVE_PRESETS[0]);
  const [isTonePlaying, setIsTonePlaying] = useState(false);
  const [binauralVolume, setBinauralVolume] = useState(0.2);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscLeftRef = useRef<OscillatorNode | null>(null);
  const oscRightRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const { data: litData, isLoading: litLoading } = useQuery({
    queryKey: ["neuroscience-literature"],
    queryFn: api.neuroscienceStudies,
    staleTime: 60_000,
  });

  const stopBinaural = () => {
    if (oscLeftRef.current) {
      try {
        oscLeftRef.current.stop();
        oscLeftRef.current.disconnect();
      } catch {}
      oscLeftRef.current = null;
    }
    if (oscRightRef.current) {
      try {
        oscRightRef.current.stop();
        oscRightRef.current.disconnect();
      } catch {}
      oscRightRef.current = null;
    }
    setIsTonePlaying(false);
  };

  const startBinaural = (wave = selectedWave) => {
    stopBinaural();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(binauralVolume, ctx.currentTime);
      gain.connect(ctx.destination);
      gainRef.current = gain;

      const merger = ctx.createChannelMerger(2);
      merger.connect(gain);

      const oscL = ctx.createOscillator();
      oscL.type = "sine";
      oscL.frequency.setValueAtTime(wave.carrier, ctx.currentTime);
      oscL.connect(merger, 0, 0);

      const oscR = ctx.createOscillator();
      oscR.type = "sine";
      oscR.frequency.setValueAtTime(wave.carrier + wave.frequency, ctx.currentTime);
      oscR.connect(merger, 0, 1);

      oscL.start();
      oscR.start();

      oscLeftRef.current = oscL;
      oscRightRef.current = oscR;
      setIsTonePlaying(true);
      toast(`Бинауральный ${wave.name} запущен (${wave.frequency} Гц)`, "info");
      haptic("medium");
    } catch {
      toast("Не удалось включить аудиогенератор", "error");
    }
  };

  useEffect(() => {
    return () => {
      stopBinaural();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleSelectWave = (w: typeof BRAIN_WAVE_PRESETS[0]) => {
    setSelectedWave(w);
    if (isTonePlaying) {
      startBinaural(w);
    }
    haptic("selection");
  };

  const handleBinauralVolumeChange = (newVol: number) => {
    setBinauralVolume(newVol);
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setValueAtTime(newVol, audioCtxRef.current.currentTime);
    }
  };

  return (
    <div className="page science-page" style={{ padding: "24px 20px 100px", maxWidth: "900px", margin: "0 auto" }}>
      <header className="page-header" style={{ marginBottom: "26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span
            className="tag"
            style={{
              background: "var(--lime-soft)",
              color: "var(--lime)",
              border: "1px solid var(--lime)",
            }}
          >
            5-полосный DSP Эквалайзер
          </span>
          <span className="tag" style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}>
            Бинауральный синтезатор
          </span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, margin: "0 0 8px" }}>
          Эквалайзер, Громкость и Частоты
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1.6" }}>
          Настрой 5-полосный графический эквалайзер и уровень громкости для всех полноразмерных треков в Sona, либо запусти фоновый генератор акустических частот.
        </p>
      </header>

      {/* Master Equalizer & Volume Card */}
      <div
        className="settings-card"
        style={{
          background: "linear-gradient(135deg, rgba(200, 255, 77, 0.08), rgba(0, 0, 0, 0.5))",
          border: "1px solid var(--lime)",
          padding: "24px",
          marginBottom: "24px",
          borderRadius: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Sliders size={24} color="var(--lime)" />
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>
                Мастер-Эквалайзер & Усилитель Громкости
              </h2>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Обработка аудиопотока в реальном времени (60 Гц – 14 кГц)
              </span>
            </div>
          </div>

          <button
            type="button"
            className={player.eqEnabled ? "btn btn--primary btn--small" : "btn btn--secondary btn--small"}
            onClick={() => player.setEqEnabled(!player.eqEnabled)}
          >
            {player.eqEnabled ? "Эквалайзер: ВКЛ" : "Эквалайзер: ВЫКЛ"}
          </button>
        </div>

        {/* Master Volume Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "12px 16px",
            borderRadius: "14px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--line)",
            marginBottom: "18px",
          }}
        >
          <button
            type="button"
            className="icon-btn"
            onClick={player.toggleMute}
            aria-label={player.muted || player.volume === 0 ? "Включить звук" : "Выключить звук"}
          >
            {player.muted || player.volume === 0 ? (
              <VolumeX size={20} color="var(--coral)" />
            ) : (
              <Volume2 size={20} color="var(--lime)" />
            )}
          </button>
          <span style={{ fontSize: "13px", fontWeight: 600, minWidth: "135px" }}>
            Громкость плеера:
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.muted ? 0 : player.volume}
            onChange={(e) => player.setVolume(parseFloat(e.target.value))}
            aria-label="Мастер-громкость плеера"
            style={{ flex: 1, accentColor: "var(--lime)", cursor: "pointer" }}
          />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--lime)", minWidth: "44px", textAlign: "right" }}>
            {Math.round((player.muted ? 0 : player.volume) * 100)}%
          </span>
        </div>

        {/* Preset Selector */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
          {EQ_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => player.applyEqPreset(preset.id)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 600,
                background:
                  player.eqPreset === preset.id ? "var(--lime)" : "rgba(255, 255, 255, 0.05)",
                color: player.eqPreset === preset.id ? "#000" : "var(--text)",
                border:
                  player.eqPreset === preset.id
                    ? "1px solid var(--lime)"
                    : "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* 5 Band Sliders */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px" }}>
          {EQ_FREQUENCIES.map((band, idx) => {
            const gain = player.eqBands[idx] || 0;
            return (
              <div
                key={band.freq}
                style={{
                  padding: "14px 12px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>{band.label}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: gain !== 0 ? "var(--lime)" : "var(--muted)",
                    }}
                  >
                    {gain > 0 ? `+${gain}` : gain} дБ
                  </span>
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={gain}
                  onChange={(e) => player.setEqBand(idx, parseFloat(e.target.value))}
                  aria-label={`Полоса эквалайзера ${band.label}`}
                  style={{ width: "100%", accentColor: "var(--lime)", cursor: "pointer" }}
                />
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{band.sub}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Binaural Generator Card */}
      <div
        className="settings-card"
        style={{
          background: "linear-gradient(135deg, rgba(139, 215, 255, 0.08), rgba(0, 0, 0, 0.5))",
          border: "1px solid var(--sky)",
          padding: "24px",
          marginBottom: "28px",
          borderRadius: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Brain size={26} color="var(--sky)" />
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>
                Бинауральный синтезатор частот
              </h2>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Может работать параллельно с основным музыкальным плеером
              </span>
            </div>
          </div>

          <button
            type="button"
            className={isTonePlaying ? "btn btn--primary" : "btn btn--secondary"}
            onClick={() => (isTonePlaying ? stopBinaural() : startBinaural())}
            style={{
              background: isTonePlaying ? "var(--sky)" : undefined,
              color: isTonePlaying ? "#000" : undefined,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
            }}
          >
            {isTonePlaying ? (
              <>
                <Square size={15} fill="#000" />
                <span>Остановить генератор</span>
              </>
            ) : (
              <>
                <Play size={15} fill="currentColor" />
                <span>Включить {selectedWave.name.split(" ")[0]}</span>
              </>
            )}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "18px" }}>
          {BRAIN_WAVE_PRESETS.map((wave) => {
            const isSelected = selectedWave.id === wave.id;
            return (
              <button
                key={wave.id}
                type="button"
                onClick={() => handleSelectWave(wave)}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: isSelected ? "var(--elev-3)" : "rgba(255, 255, 255, 0.03)",
                  border: isSelected ? `2px solid ${wave.color}` : "1px solid var(--line)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: wave.color, marginBottom: "4px" }}>
                  {wave.name}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  {wave.label}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
          <div style={{ maxWidth: "450px" }}>
            <span style={{ fontSize: "12px", color: "var(--text)", fontWeight: 600 }}>
              {selectedWave.label}:
            </span>{" "}
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {selectedWave.description}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {binauralVolume === 0 ? <VolumeX size={16} color="var(--muted)" /> : <Volume2 size={16} color="var(--sky)" />}
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={binauralVolume}
              onChange={(e) => handleBinauralVolumeChange(parseFloat(e.target.value))}
              style={{ accentColor: "var(--sky)", width: "100px" }}
              aria-label="Громкость бинаурального тона"
            />
            <span style={{ fontSize: "11px", color: "var(--muted)", minWidth: "30px" }}>
              {Math.round(binauralVolume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Scientific Literature Feed */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BookOpen size={20} color="var(--sky)" />
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>
              Исследования акустики и нейробиологии звука
            </h2>
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Рецензируемые научные работы
          </span>
        </div>

        {litLoading ? (
          <div className="sidebar-skeleton" style={{ height: "180px", borderRadius: "16px" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {litData?.studies?.map((study) => (
              <div
                key={study.id}
                className="settings-card"
                style={{
                  padding: "16px 20px",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <a
                    href={study.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--text)",
                      lineHeight: "1.4",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>{study.title}</span>
                    <ExternalLink size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                  </a>
                  <span
                    style={{
                      background: "rgba(139, 215, 255, 0.12)",
                      color: "var(--sky)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {study.pubYear || 2023}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px", fontSize: "12px", color: "var(--muted)" }}>
                  <span>{study.authorString}</span>
                  <span>·</span>
                  <span style={{ fontStyle: "italic" }}>{study.journalTitle}</span>
                  {study.citedByCount > 0 && (
                    <>
                      <span>·</span>
                      <span style={{ color: "var(--lime)" }}>Цитирований: {study.citedByCount}</span>
                    </>
                  )}
                  {study.doi && (
                    <>
                      <span>·</span>
                      <span style={{ fontFamily: "monospace", fontSize: "11px" }}>DOI: {study.doi}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
