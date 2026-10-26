import { AddToPlaylistSheet } from "./AddToPlaylistSheet";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { MiniPlayer } from "./MiniPlayer";
import { PlayerSheet } from "./PlayerSheet";
import { QueueSheet } from "./QueueSheet";
import { TrackSheet } from "./TrackSheet";

export function PlayerLayer() {
  return (
    <>
      <MiniPlayer />
      <PlayerSheet />
      <QueueSheet />
      <TrackSheet />
      <AddToPlaylistSheet />
      <CreatePlaylistModal />
    </>
  );
}
