import { ListMusic, Play } from "lucide-react";
import { usePlayer } from "../state/PlayerContext";
import { useUI } from "../state/UIContext";
import { cn } from "../utils";
import { Cover } from "./Cover";
import { Equalizer } from "./Equalizer";
import { Sheet } from "./Sheet";

export function QueueSheet() {
  const player = usePlayer();
  const { queueOpen, setQueueOpen } = useUI();

  return (
    <Sheet
      open={queueOpen}
      onClose={() => setQueueOpen(false)}
      title="Очередь"
      subtitle={`${player.queue.length} треков · сейчас играет ${player.queueIndex + 1}-й`}
      className="queue-sheet"
    >
      {player.queue.length === 0 ? (
        <div className="queue-empty">
          <ListMusic size={28} />
          <p>Очередь пуста. Включи трек или подборку.</p>
        </div>
      ) : (
        <div className="queue-list">
          {player.queue.map((track, index) => {
            const active = index === player.queueIndex;
            return (
              <button
                key={`${track.id}-${index}`}
                type="button"
                className={cn("queue-item", active && "is-current")}
                onClick={() => player.playQueue(player.queue, index)}
              >
                <span className="queue-item__index">
                  {active ? (
                    <Equalizer paused={!player.isPlaying} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>
                <Cover
                  src={track.artwork_url}
                  seed={track.title + track.artist}
                  alt=""
                  className="queue-item__art"
                />
                <span className="queue-item__meta">
                  <span className="queue-item__title">{track.title}</span>
                  <span className="queue-item__artist">{track.artist}</span>
                </span>
                {active ? (
                  <span className="queue-item__playing">играет</span>
                ) : (
                  <Play size={15} className="queue-item__play" fill="currentColor" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
