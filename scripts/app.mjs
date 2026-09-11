/**
 * Everything needed to get the tracker running, in one place.
 *
 * This is deliberately dependency-free (Node built-ins only) so it can run
 * before `npm install` has ever happened. `setup.mjs` and the desktop launchers
 * both drive the same functions, so there is only one code path to keep working.
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PID_FILE = path.join(ROOT, "data", ".server.pid");
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const MINIMUM_NODE_MAJOR = 24;

/* -------------------------------------------------------------------------- */
/*  Console helpers                                                           */
/* -------------------------------------------------------------------------- */

const supportsColor = process.stdout.isTTY && process.env.NO_COLOR === undefined;
const paint = (code, text) => (supportsColor ? `[${code}m${text}[0m` : text);

export const ui = {
  title: (text) => console.log(`\n${paint("1", text)}`),
  step: (text) => console.log(`${paint("36", "›")} ${text}`),
  done: (text) => console.log(`${paint("32", "✓")} ${text}`),
  warn: (text) => console.log(`${paint("33", "!")} ${text}`),
  fail: (text) => console.error(`${paint("31", "✗")} ${text}`),
  plain: (text = "") => console.log(text),
};

/** Keeps a double-clicked window open long enough to read an error. */
export async function pause(message = "Press Enter to close this window…") {
  if (!process.stdin.isTTY) return;
  process.stdout.write(`\n${message}`);
  await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", resolve);
  });
}

/* -------------------------------------------------------------------------- */
/*  Environment                                                               */
/* -------------------------------------------------------------------------- */

export function checkNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= MINIMUM_NODE_MAJOR) return true;

  ui.fail(`This app needs Node ${MINIMUM_NODE_MAJOR} or newer — you have ${process.versions.node}.`);
  ui.plain("");
  ui.plain("  The database uses Node's built-in SQLite, which older versions do not have.");
  ui.plain("  Install the current version from https://nodejs.org and run this again.");
  return false;
}

/** Runs npm without a shell, so paths containing spaces are safe. */
function runNpm(args) {
  // npm sets npm_execpath when it runs a script, which avoids guessing where
  // npm lives. The shell fallback only matters if this is invoked directly.
  const execPath = process.env.npm_execpath;
  const result = execPath
    ? spawnSync(process.execPath, [execPath, ...args], { cwd: ROOT, stdio: "inherit" })
    : spawnSync("npm", args, { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });
  return result.status === 0;
}

function runNext(args) {
  const result = spawnSync(process.execPath, [NEXT_BIN, ...args], { cwd: ROOT, stdio: "inherit" });
  return result.status === 0;
}

/* -------------------------------------------------------------------------- */
/*  Install and build                                                         */
/* -------------------------------------------------------------------------- */

export function dependenciesInstalled() {
  return fs.existsSync(NEXT_BIN);
}

export function ensureDependencies({ force = false } = {}) {
  if (!force && dependenciesInstalled()) {
    ui.done("Dependencies already installed");
    return true;
  }
  ui.step("Installing dependencies (this takes a minute the first time)…");
  if (!runNpm(["install", "--no-audit", "--no-fund"])) {
    ui.fail("Installing dependencies failed. Check your internet connection and try again.");
    return false;
  }
  ui.done("Dependencies installed");
  return true;
}

export function buildExists() {
  return fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"));
}

export function ensureBuild({ force = false } = {}) {
  if (!force && buildExists()) {
    ui.done("App already built");
    return true;
  }

  ui.step("Building the app…");
  if (runNext(["build"])) {
    ui.done("App built");
    return true;
  }

  // A half-written .next directory makes the next build fail with a cryptic
  // filesystem error — common when the project sits in a synced folder like
  // OneDrive or Dropbox. Clearing it and retrying fixes that without needing
  // anyone to open a terminal.
  const buildDir = path.join(ROOT, ".next");
  if (fs.existsSync(buildDir)) {
    ui.warn("Build failed — clearing the build cache and trying once more…");
    fs.rmSync(buildDir, { recursive: true, force: true });
    if (runNext(["build"])) {
      ui.done("App built");
      return true;
    }
  }

  ui.fail("The build failed. Your data is untouched — try running setup again.");
  return false;
}

/* -------------------------------------------------------------------------- */
/*  Server                                                                    */
/* -------------------------------------------------------------------------- */

/** True when the tracker itself answers on this port (not some other app). */
export async function isTrackerOn(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/dataset`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return Array.isArray(body?.applications);
  } catch {
    return false;
  }
}

function portIsFree(port) {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => server.close(() => resolve(true)))
      .listen(port, "127.0.0.1");
  });
}

/** Reuses the tracker's port if it is already up, else finds a free one. */
async function choosePort() {
  for (let port = DEFAULT_PORT; port < DEFAULT_PORT + 20; port += 1) {
    if (await isTrackerOn(port)) return { port, alreadyRunning: true };
    if (await portIsFree(port)) return { port, alreadyRunning: false };
  }
  return { port: DEFAULT_PORT, alreadyRunning: false };
}

/**
 * Starts the server as a detached background process so closing the launcher
 * window does not take the app down with it.
 */
export async function ensureServer() {
  const { port, alreadyRunning } = await choosePort();
  if (alreadyRunning) {
    ui.done(`Already running on port ${port}`);
    return port;
  }

  ui.step("Starting the app…");
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });

  const child = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(port)], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env, PORT: String(port) },
  });
  child.unref();
  fs.writeFileSync(PID_FILE, JSON.stringify({ pid: child.pid, port }), "utf8");

  // Wait for it to answer before opening a browser at a dead URL.
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await isTrackerOn(port)) {
      ui.done(`Running on port ${port}`);
      return port;
    }
  }

  ui.fail("The app did not start in time.");
  return null;
}

export function stopServer() {
  if (!fs.existsSync(PID_FILE)) return false;
  try {
    const { pid } = JSON.parse(fs.readFileSync(PID_FILE, "utf8"));
    process.kill(pid);
    fs.rmSync(PID_FILE, { force: true });
    return true;
  } catch {
    fs.rmSync(PID_FILE, { force: true });
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*  Browser                                                                   */
/* -------------------------------------------------------------------------- */

export function openBrowser(url) {
  const [command, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  try {
    spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
  } catch {
    ui.warn(`Could not open a browser automatically — go to ${url}`);
  }
}

/* -------------------------------------------------------------------------- */
/*  Entry point used by the desktop launchers                                 */
/* -------------------------------------------------------------------------- */

export async function launch() {
  if (!checkNode()) return false;

  // The launcher self-heals: if the folder was moved or node_modules deleted,
  // it installs and builds rather than sending anyone back to a terminal.
  if (!ensureDependencies()) return false;
  if (!ensureBuild()) return false;

  const port = await ensureServer();
  if (!port) return false;

  const url = `http://localhost:${port}`;
  ui.plain("");
  ui.done(`Internship Tracker is open at ${url}`);
  openBrowser(url);
  return true;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const ok = await launch();
  if (!ok) await pause();
  process.exit(ok ? 0 : 1);
}
