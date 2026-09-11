/**
 * One-command setup. Installs dependencies, builds the app, creates a
 * double-clickable launcher (and a desktop shortcut), then opens the tracker.
 *
 * After this runs once, the terminal is never needed again — the launcher
 * handles starting the app from then on.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ROOT,
  checkNode,
  ensureBuild,
  ensureDependencies,
  ensureServer,
  openBrowser,
  pause,
  ui,
} from "./app.mjs";

const APP_NAME = "Internship Tracker";

/* -------------------------------------------------------------------------- */
/*  Launcher files                                                            */
/* -------------------------------------------------------------------------- */

const WINDOWS_LAUNCHER = `@echo off
title ${APP_NAME}
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Install the current version from https://nodejs.org then double-click this again.
  echo.
  pause
  exit /b 1
)
node "scripts\\app.mjs"
`;

const WINDOWS_STOPPER = `@echo off
title Stop ${APP_NAME}
cd /d "%~dp0"
node "scripts\\stop.mjs"
`;

const UNIX_LAUNCHER = `#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js is not installed."
  echo "Install the current version from https://nodejs.org then double-click this again."
  echo
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi
node scripts/app.mjs
`;

const UNIX_STOPPER = `#!/bin/bash
cd "$(dirname "$0")"
node scripts/stop.mjs
`;

/** Writes the launcher scripts that live next to the project. */
function writeLaunchers() {
  const created = [];

  if (process.platform === "win32") {
    const launcher = path.join(ROOT, `${APP_NAME}.cmd`);
    const stopper = path.join(ROOT, `Stop ${APP_NAME}.cmd`);
    fs.writeFileSync(launcher, WINDOWS_LAUNCHER, "utf8");
    fs.writeFileSync(stopper, WINDOWS_STOPPER, "utf8");
    created.push(launcher, stopper);
    return created;
  }

  const launcher = path.join(ROOT, `${APP_NAME}.command`);
  const stopper = path.join(ROOT, `Stop ${APP_NAME}.command`);
  fs.writeFileSync(launcher, UNIX_LAUNCHER, "utf8");
  fs.writeFileSync(stopper, UNIX_STOPPER, "utf8");
  fs.chmodSync(launcher, 0o755);
  fs.chmodSync(stopper, 0o755);
  created.push(launcher, stopper);
  return created;
}

/**
 * Puts a shortcut on the desktop. Best-effort: a failure here is cosmetic, so
 * it never stops setup — the launcher in the project folder still works.
 */
function createDesktopShortcut() {
  try {
    if (process.platform === "win32") return createWindowsShortcut();
    if (process.platform === "darwin") return createMacAlias();
    return createLinuxDesktopEntry();
  } catch {
    return null;
  }
}

function createWindowsShortcut() {
  const target = path.join(ROOT, `${APP_NAME}.cmd`);
  // Written to a file rather than passed inline so quoting cannot go wrong.
  const script = `
$desktop = [Environment]::GetFolderPath('Desktop')
$link = Join-Path $desktop '${APP_NAME}.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($link)
$shortcut.TargetPath = ${JSON.stringify(target).replace(/"/g, "'")}
$shortcut.WorkingDirectory = ${JSON.stringify(ROOT).replace(/"/g, "'")}
$shortcut.WindowStyle = 7
$shortcut.Description = 'Open the ${APP_NAME}'
$shortcut.Save()
Write-Output $link
`;
  const scriptFile = path.join(os.tmpdir(), `tracker-shortcut-${Date.now()}.ps1`);
  fs.writeFileSync(scriptFile, script, "utf8");
  try {
    const result = spawnSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptFile],
      { encoding: "utf8" },
    );
    const link = result.stdout?.trim();
    return result.status === 0 && link ? link : null;
  } finally {
    fs.rmSync(scriptFile, { force: true });
  }
}

function createMacAlias() {
  const desktop = path.join(os.homedir(), "Desktop");
  if (!fs.existsSync(desktop)) return null;
  const link = path.join(desktop, `${APP_NAME}.command`);
  fs.rmSync(link, { force: true });
  fs.symlinkSync(path.join(ROOT, `${APP_NAME}.command`), link);
  return link;
}

function createLinuxDesktopEntry() {
  const desktop = path.join(os.homedir(), "Desktop");
  if (!fs.existsSync(desktop)) return null;
  const link = path.join(desktop, "internship-tracker.desktop");
  const entry = `[Desktop Entry]
Type=Application
Name=${APP_NAME}
Comment=Track internship applications
Exec=node ${JSON.stringify(path.join(ROOT, "scripts", "app.mjs"))}
Path=${ROOT}
Icon=applications-office
Terminal=false
`;
  fs.writeFileSync(link, entry, "utf8");
  fs.chmodSync(link, 0o755);
  return link;
}

/* -------------------------------------------------------------------------- */
/*  Setup                                                                     */
/* -------------------------------------------------------------------------- */

async function main() {
  ui.title(`Setting up ${APP_NAME}`);
  ui.plain("  This only needs to happen once.\n");

  if (!checkNode()) return false;
  if (!ensureDependencies()) return false;
  if (!ensureBuild()) return false;

  ui.step("Creating the launcher…");
  const launchers = writeLaunchers();
  const shortcut = createDesktopShortcut();
  ui.done(`Launcher created: ${path.basename(launchers[0])}`);
  if (shortcut) ui.done(`Desktop shortcut created: ${path.basename(shortcut)}`);
  else ui.warn("Could not add a desktop shortcut — use the launcher in this folder instead.");

  const port = await ensureServer();
  if (!port) return false;

  const url = `http://localhost:${port}`;
  openBrowser(url);

  ui.title("You're set up.");
  ui.plain(`  The tracker is open at ${url}`);
  ui.plain("");
  ui.plain("  From now on, no terminal needed:");
  ui.plain(
    shortcut
      ? `    • Double-click "${APP_NAME}" on your desktop to open it`
      : `    • Double-click "${path.basename(launchers[0])}" in this folder to open it`,
  );
  ui.plain(`    • Double-click "${path.basename(launchers[1])}" to shut it down`);
  ui.plain("");
  ui.plain("  Your data is saved on this computer and stays between sessions.");
  ui.plain("");
  return true;
}

const ok = await main();
if (!ok) await pause();
process.exit(ok ? 0 : 1);
