"use client";

import { meratSocketEndpoint } from "./socketEndpoint";

/** Lightweight Engine.IO v4 / Socket.IO websocket listener. No extra NPM dependency. */
export function listenForChatChanges(onUpdate: () => void, onConnection: (connected: boolean) => void) {
  let closed = false;
  let ws: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  function connect() {
    if (closed || typeof window === "undefined") return;
    try {
      ws = new WebSocket(meratSocketEndpoint());
    } catch {
      onConnection(false);
      retry = setTimeout(connect, 5000);
      return;
    }
    ws.addEventListener("message", (event: MessageEvent) => {
      const payload = String(event.data ?? "");
      if (payload.startsWith("0{")) ws?.send("40"); // Socket.IO namespace connect
      else if (payload === "2") ws?.send("3"); // Engine.IO heartbeat
      else if (payload.startsWith("40")) onConnection(true);
      else if (payload.startsWith("42")) {
        try {
          const value = JSON.parse(payload.substring(2)) as unknown;
          if (Array.isArray(value) && value[0] === "merat:chat-changed") onUpdate();
        } catch { /* ignore malformed event */ }
      }
    });
    ws.addEventListener("error", () => { onConnection(false); });
    ws.addEventListener("close", () => {
      onConnection(false);
      if (!closed) retry = setTimeout(connect, 5000);
    });
  }
  connect();
  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    ws?.close();
  };
}
