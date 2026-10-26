/**
 * IndexedDB storage engine for Sona Offline Mode.
 * Stores audio files as Blobs and track metadata locally
 * allowing seamless playback without network connection.
 */

import type { Track } from "../types";

const DB_NAME = "sona_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "offline_tracks";

interface OfflineRecord {
  track: Track;
  audioBlob?: Blob;
  sizeBytes: number;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function isTrackOffline(trackId: number): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trackId);
      req.onsuccess = () => resolve(Boolean(req.result));
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function saveTrackOffline(track: Track): Promise<boolean> {
  try {
    let audioBlob: Blob | undefined;
    let sizeBytes = 0;

    if (track.preview_url) {
      try {
        const res = await fetch(track.preview_url);
        if (res.ok) {
          audioBlob = await res.blob();
          sizeBytes = audioBlob.size;
        }
      } catch {
        // network issue or CORS fallback
      }
    }

    const record: OfflineRecord & { id: number } = {
      id: track.id,
      track: { ...track },
      audioBlob,
      sizeBytes,
      savedAt: Date.now(),
    };

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to save track offline:", err);
    return false;
  }
}

export async function removeTrackOffline(trackId: number): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(trackId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}

export async function getOfflineTracks(): Promise<Track[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as (OfflineRecord & { id: number })[];
        resolve(records.map((r) => r.track));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getOfflineAudioUrl(trackId: number): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trackId);
      req.onsuccess = () => {
        const record = req.result as OfflineRecord | undefined;
        if (record && record.audioBlob) {
          resolve(URL.createObjectURL(record.audioBlob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getOfflineStorageInfo(): Promise<{ count: number; totalMB: string }> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as (OfflineRecord & { id: number })[];
        const totalBytes = records.reduce((acc, r) => acc + (r.sizeBytes || 0), 0);
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        resolve({ count: records.length, totalMB });
      };
      req.onerror = () => resolve({ count: 0, totalMB: "0.00" });
    });
  } catch {
    return { count: 0, totalMB: "0.00" };
  }
}
