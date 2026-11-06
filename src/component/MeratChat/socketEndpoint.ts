/** Browser-side Socket.IO (Engine.IO v4) websocket endpoint.
 * In production keep the proxy's same-origin /socket.io path.
 * In local Next.js debug, the dedicated Node Socket.IO service is on 127.0.0.1:3002.
 */
export function meratSocketEndpoint(): string {
  const path = "/socket.io/?EIO=4&transport=websocket";
  const { hostname, host, protocol } = window.location;
  const isLocalDebug = protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname.toLowerCase());

  if (isLocalDebug) {
    const configuredPort = Number(process.env.NEXT_PUBLIC_SOCKET_PORT ?? "3002");
    const port = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
      ? configuredPort : 3002;
    // Explicit IPv4 loopback avoids localhost resolving to ::1 when server binds 127.0.0.1.
    return `ws://127.0.0.1:${port}${path}`;
  }

  const scheme = protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${host}${path}`;
}
