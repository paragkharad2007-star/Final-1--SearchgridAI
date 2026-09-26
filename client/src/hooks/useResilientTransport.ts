import { useEffect, useMemo, useState } from "react";

export type RelayMessage = { id: string; kind: "sighting" | "zone_completed" | "location"; payload: Record<string, unknown>; createdAt: number };

export function useResilientTransport(channelName = "searchgrid-cx1008") {
  const [relayedCount, setRelayedCount] = useState(0);
  const [bluetoothAvailable, setBluetoothAvailable] = useState(false);
  const channel = useMemo(() => typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel(channelName) : null, [channelName]);

  useEffect(() => {
    setBluetoothAvailable(typeof navigator !== "undefined" && "bluetooth" in navigator && window.isSecureContext);
    if (!channel) return;
    const onMessage = (event: MessageEvent<RelayMessage>) => { if (event.data?.id) setRelayedCount((count) => count + 1); };
    channel.addEventListener("message", onMessage);
    return () => { channel.removeEventListener("message", onMessage); channel.close(); };
  }, [channel]);

  const relay = (message: RelayMessage) => channel?.postMessage(message);
  return { relay, relayedCount, bluetoothAvailable, transportLabel: bluetoothAvailable ? "LOCAL RELAY + BLUETOOTH READY" : "LOCAL RELAY READY" };
}
