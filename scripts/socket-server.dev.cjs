// Merat Socket.IO: preserves the existing online-status handshake and adds a
// private local-only notification endpoint. No message content is broadcast.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
let Server;
try {
  ({ Server } = require("socket.io"));
} catch (error) {
  if (error && error.code === "MODULE_NOT_FOUND") {
    console.error("[Merat WebSocket] Socket.IO نصب نیست. یک بار npm install اجرا کنید.");
    process.exit(1);
  }
  throw error;
}

function readJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  try {
    const content = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
    const line = content.split(/\r?\n/).find((v) => /^\s*JWT_SECRET\s*=/.test(v));
    if (!line) return "";
    const value = line.replace(/^\s*JWT_SECRET\s*=\s*/, "").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  } catch { return ""; }
}
const PORT = Number(process.env.SOCKET_PORT || 3002);
const jwtSecret = readJwtSecret();

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/internal/chat-notify") {
    if (!jwtSecret || req.socket.remoteAddress !== "127.0.0.1" && req.socket.remoteAddress !== "::ffff:127.0.0.1") {
      res.writeHead(403); res.end(); return;
    }
    const timestamp = String(req.headers["x-merat-time"] || "");
    const signature = String(req.headers["x-merat-sign"] || "");
    const time = Number(timestamp);
    const expected = crypto.createHmac("sha256", jwtSecret).update(timestamp).digest("hex");
    let authorized = false;
    if (Number.isFinite(time) && Math.abs(Date.now() - time) <= 30000 && /^[a-f0-9]{64}$/.test(signature)) {
      authorized = crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
    }
    if (!authorized) { res.writeHead(403); res.end(); return; }
    io.emit("merat:chat-changed", { changed: true });
    res.writeHead(204); res.end(); return;
  }
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Merat Socket.IO running");
});

const allowedOrigins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
allowedOrigins.add("http://[::1]:3000");
const acceptedOrigins = [...allowedOrigins];
const io = new Server(server, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  cors: { origin: acceptedOrigins, methods: ["GET", "POST"] },
  // CORS does not protect a WebSocket upgrade; validate Origin here as well.
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    callback(null, !origin || allowedOrigins.has(origin));
  },
  pingTimeout: 20000,
  pingInterval: 25000,
  maxHttpBufferSize: 1000000,
});
io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);
  socket.emit("socket:ready", { connected: true });
  socket.on("disconnect", (reason) => console.log("Socket disconnected", socket.id, reason));
});
server.on("error", (error) => console.error("Merat socket server error", error));
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Merat local DEBUG Socket.IO running on 127.0.0.1:${PORT}`);
  if (!jwtSecret) console.warn("JWT_SECRET is missing for internal chat push; HTTP polling remains available.");
});
