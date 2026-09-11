/** Shuts the background server down. Driven by the "Stop" launcher. */

import { isTrackerOn, stopServer, ui } from "./app.mjs";

const stopped = stopServer();

// The PID file can be stale (a reboot, or the process killed elsewhere), so
// report on what is actually listening rather than on the file.
const stillUp = await isTrackerOn(Number(process.env.PORT) || 3000);

if (stopped && !stillUp) ui.done("Internship Tracker has been shut down.");
else if (!stopped && !stillUp) ui.done("Internship Tracker was not running.");
else ui.warn("Something is still listening — close the window that is running it.");

// Give a double-clicked window a moment before it disappears.
await new Promise((resolve) => setTimeout(resolve, 1500));
