import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Playlist, Track } from "../types";

interface CreateIntent {
  afterCreate?: (playlist: Playlist) => void;
}

interface UIContextValue {
  selectedTrack: Track | null;
  openTrack: (track: Track) => void;
  closeTrack: () => void;
  pickerTrack: Track | null;
  openPlaylistPicker: (track: Track) => void;
  closePlaylistPicker: () => void;
  createIntent: CreateIntent | null;
  openCreatePlaylist: (afterCreate?: (playlist: Playlist) => void) => void;
  closeCreatePlaylist: () => void;
  queueOpen: boolean;
  setQueueOpen: (value: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [pickerTrack, setPickerTrack] = useState<Track | null>(null);
  const [createIntent, setCreateIntent] = useState<CreateIntent | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);

  const openTrack = useCallback((track: Track) => setSelectedTrack(track), []);
  const closeTrack = useCallback(() => setSelectedTrack(null), []);
  const openPlaylistPicker = useCallback((track: Track) => {
    setPickerTrack(track);
  }, []);
  const closePlaylistPicker = useCallback(() => setPickerTrack(null), []);
  const openCreatePlaylist = useCallback(
    (afterCreate?: (playlist: Playlist) => void) => setCreateIntent({ afterCreate }),
    [],
  );
  const closeCreatePlaylist = useCallback(() => setCreateIntent(null), []);

  const value = useMemo(
    () => ({
      selectedTrack,
      openTrack,
      closeTrack,
      pickerTrack,
      openPlaylistPicker,
      closePlaylistPicker,
      createIntent,
      openCreatePlaylist,
      closeCreatePlaylist,
      queueOpen,
      setQueueOpen,
    }),
    [
      selectedTrack,
      openTrack,
      closeTrack,
      pickerTrack,
      openPlaylistPicker,
      closePlaylistPicker,
      createIntent,
      openCreatePlaylist,
      closeCreatePlaylist,
      queueOpen,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside UIProvider");
  return context;
}
