"use strict";

// One-command local debugging: run the trusted loopback Socket.IO service
// and the Next.js dev server together. Production scripts remain unchanged.
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
// Use 3002 in debug so that the deployed domain can keep port 3001.
const port = Number(process.env.MERAT_DEV_SOCKET_PORT || 3002);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("[Merat Dev] SOCKET_PORT معتبر نیست.");
  process.exit(1);
}
let nextProcess = null;
let socketProcess = null;
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of [nextProcess, socketProcess]) {
    if (child && !child.killed) {
      try { child.kill(); } catch { /* already exited */ }
    }
  }
  process.exitCode = exitCode;
}

function checkSocketReady() {
  return new Promise((resolve) => {
    const request = http.get({hostname:"127.0.0.1",port,path:"/",timeout:600}, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(res.statusCode === 200 &&
        Buffer.concat(chunks).toString("utf8").includes("Merat Socket.IO running")));
    });
    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

async function start() {
  const scriptPath = path.join(root, "scripts", "socket-server.dev.cjs");
  const cliPath = require.resolve("next/dist/bin/next", { paths: [root] });
  // Never start two servers on the same port. A healthy existing socket
  // service is okay; do not terminate it when Next exits.
  const socketAlreadyOnline = await checkSocketReady();
  if (socketAlreadyOnline) {
    console.log(`[Merat Dev] Existing Socket.IO server detected on 127.0.0.1:${port}.`);
  } else {
    socketProcess = spawn(process.execPath, [scriptPath], {
      cwd: root,
      env: { ...process.env, NODE_ENV: "development", SOCKET_PORT: String(port) },
      stdio: "inherit",
    });
    socketProcess.once("error", (err) => {
      console.error("[Merat Dev] Socket server could not start:", err);
      stop(1);
    });
    socketProcess.once("exit", (code) => {
      if (!stopping) {
        console.error(`[Merat Dev] Socket server exited (${code ?? "signal"}).`);
        stop(1);
      }
    });
    let ready = false;
    for (let attempt = 0; attempt < 30 && !stopping; attempt++) {
      if (await checkSocketReady()) { ready = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!ready || stopping) {
      if (!stopping) console.error(`[Merat Dev] Socket.IO on 127.0.0.1:${port} did not become ready.`);
      stop(1);
      return;
    }
  }

  console.log(`[Merat Dev] WebSocket: ws://127.0.0.1:${port}/socket.io/`);
  nextProcess = spawn(process.execPath, [cliPath, "dev", ...process.argv.slice(2)], {
    cwd: root,
    env: { ...process.env, NODE_ENV: "development", SOCKET_PORT: String(port), NEXT_PUBLIC_SOCKET_PORT: String(port) },
    stdio: "inherit",
  });
  nextProcess.once("error", (err) => {
    console.error("[Merat Dev] Next.js could not start:", err);
    stop(1);
  });
  nextProcess.once("exit", (code, signal) => {
    if (!stopping) stop(code ?? (signal ? 1 : 0));
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
start().catch((error) => {
  console.error("[Merat Dev] Startup failed:", error);
  stop(1);
});
