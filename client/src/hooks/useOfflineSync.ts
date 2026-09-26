import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

type OfflineAction = {
  id: string;
  type: "sighting" | "zone_completed" | "location";
  createdAt: number;
  payload: Record<string, unknown>;
};

const STORAGE_KEY = "searchgrid-offline-actions-v1";

function readQueue(): OfflineAction[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as OfflineAction[];
  } catch {
    return [];
  }
}

export function useOfflineSync() {
  const syncMutation = trpc.incident.syncOffline.useMutation();
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [queue, setQueue] = useState<OfflineAction[]>(() => typeof window === "undefined" ? [] : readQueue());

  const persist = useCallback((next: OfflineAction[]) => {
    setQueue(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const enqueue = useCallback((type: OfflineAction["type"], payload: Record<string, unknown>) => {
    const next = [...readQueue(), { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, payload, createdAt: Date.now() }];
    persist(next);
    return next.length;
  }, [persist]);

  const flush = useCallback(async () => {
    const current = readQueue();
    if (!current.length || !navigator.onLine) return 0;
    try {
      await syncMutation.mutateAsync({ actions: current });
      persist([]);
      return current.length;
    } catch {
      return 0;
    }
  }, [persist, syncMutation]);

  useEffect(() => {
    const online = () => { setIsOnline(true); void flush(); };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    if (navigator.onLine) void flush();
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [flush]);

  return { isOnline, queue, pendingCount: queue.length, enqueue, flush, isSyncing: syncMutation.isPending };
}
