// Hacker Keys — app wiring (DOM events → core logic)
import {
  THEMES,
  resolveTheme,
  CODE_CORPUS,
  nextCursor,
  visibleText,
  OVERLAY_TEXT,
} from "./typer.js";

const screen = document.getElementById("screen");
const codeEl = document.getElementById("code");
const caretEl = document.getElementById("caret");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlaySub = document.getElementById("overlay-sub");
const hudTheme = document.getElementById("hud-theme");
const dock = document.getElementById("theme-dock");
const shareChip = document.getElementById("share-chip");

let corpusIndex = 0;
let cursor = 0;
let overlayTimer = null;

function corpus() {
  return CODE_CORPUS[corpusIndex];
}

function render() {
  codeEl.textContent = visibleText(cursor, corpus());
  screen.scrollTop = screen.scrollHeight;
}

function rotateCorpus() {
  corpusIndex = (corpusIndex + 1) % CODE_CORPUS.length;
  cursor = 0;
}

function applyTheme(id) {
  const theme = THEMES[id];
  const root = document.documentElement.style;
  root.setProperty("--fg", theme.fg);
  root.setProperty("--dim", theme.dim);
  root.setProperty("--bg", theme.bg);
  root.setProperty("--accent", theme.accent);
  hudTheme.textContent = theme.name.toUpperCase();
  const url = new URL(window.location.href);
  url.searchParams.set("t", id);
  window.history.replaceState(null, "", url);
  for (const chip of dock.querySelectorAll(".theme-chip[data-theme]")) {
    chip.setAttribute("aria-current", String(chip.dataset.theme === id));
  }
}

function showOverlay(id) {
  const text = OVERLAY_TEXT[id];
  overlayTitle.textContent = text.title;
  overlaySub.textContent = text.sub;
  overlay.classList.toggle("denied", id === "denied");
  overlay.hidden = false;
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => { overlay.hidden = true; }, 2400);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
}

// Any key types code; hotkeys trigger overlays. Typing hotkeys ALSO types (like the original).
window.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;
  if (key === "Escape") {
    overlay.hidden = true;
    clearTimeout(overlayTimer);
    return;
  }
  if (key === "f" || key === "F") { toggleFullscreen(); }
  if (key === "g" || key === "G") { showOverlay("granted"); }
  if (key === "d" || key === "D") { showOverlay("denied"); }

  cursor = nextCursor(cursor, corpus());
  if (cursor === 0) rotateCorpus();
  render();
});

for (const chip of dock.querySelectorAll(".theme-chip[data-theme]")) {
  chip.addEventListener("click", () => applyTheme(chip.dataset.theme));
}

shareChip.addEventListener("click", async () => {
  await navigator.clipboard.writeText(window.location.href);
  const original = shareChip.textContent;
  shareChip.textContent = "✓ copied";
  setTimeout(() => { shareChip.textContent = original; }, 1400);
});

// Boot: theme from URL (?t=), start with a full screen of code for the movie-hacker vibe.
applyTheme(resolveTheme(new URLSearchParams(window.location.search).get("t")));
for (let i = 0; i < 220; i += 1) {
  cursor = nextCursor(cursor, corpus());
  if (cursor === 0) rotateCorpus();
}
render();
