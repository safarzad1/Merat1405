"use client";

import { useEffect, useState } from "react";
import styles from "./SocketStatus.module.css";
import { meratSocketEndpoint } from "../MeratChat/socketEndpoint";

type ConnectionState = "connecting" | "online" | "offline";

/** Engine.IO v4 + Socket.IO default namespace handshake, no additional client dependency. */
export default function SocketStatus() {
  const [status, setStatus] = useState<ConnectionState>("connecting");

  useEffect(() => {
    let stopped = false;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    const clearWatchdog = () => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = undefined;
    };

    const connect = () => {
      if (stopped) return;
      setStatus("connecting");
      const url = meratSocketEndpoint();
      try {
        ws = new WebSocket(url);
      } catch {
        setStatus("offline");
        retry = setTimeout(connect, 5000);
        return;
      }
      let established = false;
      watchdog = setTimeout(() => ws?.close(), 10000);
      ws.onmessage = (event: MessageEvent<string>) => {
        const message = String(event.data);
        if (message.startsWith("0")) {
          // Engine.IO open: connect to default Socket.IO namespace.
          ws?.send("40");
        } else if (message === "40" || message.startsWith("40{")) {
          established = true;
          clearWatchdog();
          if (!stopped) setStatus("online");
        } else if (message === "2") {
          // Engine.IO ping (respond to preserve the connection).
          ws?.send("3");
        }
      };
      ws.onerror = () => {
        if (!stopped) setStatus("offline");
      };
      ws.onclose = () => {
        clearWatchdog();
        if (stopped) return;
        established = false;
        setStatus("offline");
        retry = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      clearWatchdog();
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close();
      }
    };
  }, []);

  const label = status === "online" ? "آنلاین" : status === "connecting" ? "در حال اتصال" : "قطع ارتباط";
  return (
    <span className={`${styles.status} ${styles[status]}`} role="status" aria-live="polite" aria-label={`وضعیت ارتباط لحظه‌ای: ${label}`} title={`وضعیت ارتباط لحظه‌ای: ${label}`}>
      <span className={styles.dot} aria-hidden="true" />
    </span>
  );
}
