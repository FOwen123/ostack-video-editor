// Headless Chrome for record.mjs and shot.mjs, on macOS, Windows or Linux. $CHROME overrides the path.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const candidates = {
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  win32: [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
    .filter(Boolean).map((d) => join(d, "Google", "Chrome", "Application", "chrome.exe")),
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
};

export const chromePath = () => {
  const path = process.env.CHROME || (candidates[process.platform] || []).find(existsSync);
  if (!path) { console.error("Google Chrome not found: install it, or set CHROME to its path"); process.exit(2); }
  return path;
};

// Starts headless Chrome with its own throwaway profile and DevTools on `port`.
export const launch = (port, flags) =>
  spawn(chromePath(), ["--headless=new", ...flags, `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(tmpdir(), `chrome-${port}`)}`, "about:blank"], { stdio: "ignore" });
