// Hacker Keys — app wiring (DOM events → core logic)
import {
  THEMES,
  resolveTheme,
  CODE_CORPUS,
  nextCursor,
  visibleText,
  OVERLAY_TEXT,
} from "./typer.js";
import {
  MISSIONS,
  STAGE_IDS,
  STAGE_CORPORA,
  UI_STRINGS,
  RANK_BLURBS,
  createMission,
  advance,
  stageProgress,
  missionProgress,
  elapsedSeconds,
  keysPerSecond,
  rank,
  titleFor,
  loadStats,
  saveClear,
} from "./mission.js";

const screen = document.getElementById("screen");
const codeEl = document.getElementById("code");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlaySub = document.getElementById("overlay-sub");
const hudTheme = document.getElementById("hud-theme");
const hudHint = document.getElementById("hud-hint");
const dock = document.getElementById("theme-dock");
const shareChip = document.getElementById("share-chip");
const missionChip = document.getElementById("mission-chip");
const langChip = document.getElementById("lang-chip");
const missionHud = document.getElementById("mission-hud");
const missionName = document.getElementById("mission-name");
const missionStage = document.getElementById("mission-stage");
const missionKps = document.getElementById("mission-kps");
const missionKeys = document.getElementById("mission-keys");
const missionClock = document.getElementById("mission-clock");
const missionFill = document.getElementById("mission-progress-fill");
const stageFill = document.getElementById("stage-progress-fill");
const missionBrief = document.getElementById("mission-brief");
const briefEyebrow = document.getElementById("brief-eyebrow");
const briefName = document.getElementById("brief-name");
const briefText = document.getElementById("brief-text");
const briefHint = document.getElementById("brief-hint");
const missionComplete = document.getElementById("mission-complete");
const completeEyebrow = document.getElementById("complete-eyebrow");
const completeTitle = document.getElementById("complete-title");
const completeSub = document.getElementById("complete-sub");
const completeBlurb = document.getElementById("complete-rank-blurb");
const completeKps = document.getElementById("complete-kps");
const completeTime = document.getElementById("complete-time");
const completeKeys = document.getElementById("complete-keys");
const completeRecord = document.getElementById("complete-record");
const againChip = document.getElementById("again-chip");
const missionShareChip = document.getElementById("mission-share-chip");
const menuChip = document.getElementById("menu-chip");

let corpusIndex = 0;
let cursor = 0;
let overlayTimer = null;

// ---- language ----

let lang = "en";
if (new URLSearchParams(window.location.search).get("l") === "ja") lang = "ja";
try {
  if (localStorage.getItem("hacker-keys:lang") === "ja") lang = "ja";
} catch { /* storage unavailable */ }

function strings() {
  return UI_STRINGS[lang];
}

function applyLanguage(next) {
  lang = next;
  try { localStorage.setItem("hacker-keys:lang", lang); } catch { /* ignore */ }
  const url = new URL(window.location.href);
  url.searchParams.set("l", lang);
  window.history.replaceState(null, "", url);
  document.documentElement.setAttribute("lang", lang);
  langChip.textContent = lang === "ja" ? "🄓 EN" : "🄓 日本語";
  againChip.textContent = lang === "ja" ? "↻ もう一度実行" : "↻ run it again";
  missionShareChip.textContent = lang === "ja" ? "⧉ 結果をシェア" : "⧉ share result";
  menuChip.textContent = lang === "ja" ? "☰ メニュー" : "☰ menu";
  hudHint.textContent = lang === "ja"
    ? "任意キーでタイプ · M ミッション · G 許可 · D 拒否 · F 全画面 · ESC クリア"
    : "any key = type · M mission · G granted · D denied · F fullscreen · ESC clear";
  const briefEyebrowText = lang === "ja" ? "受信中の通信" : "INCOMING TRANSMISSION";
  briefEyebrow.textContent = briefEyebrowText;
  briefHint.textContent = lang === "ja" ? "Mキーで開始 · ESCで中止" : "press M to start · ESC to abort";
  completeEyebrow.textContent = lang === "ja" ? "トレース完了 — あなたは最初からここにいない" : "TRACE COMPLETE — YOU WERE NEVER HERE";
  completeTitle.textContent = strings().completeTitle;
  // Re-render whatever screen is live in the new language instead of blanket-hiding.
  if (mission && mission.finishedAt) {
    // completed mission: refresh the result copy in place
    const copy = missionById(mission.missionId)[lang];
    const r = mission.lastRank || rank(keysPerSecond(mission));
    const kps = mission.lastKps || keysPerSecond(mission);
    const secs = elapsedSeconds(mission);
    completeSub.textContent = strings().completeSub(copy.name, r, kps, secs);
    completeBlurb.textContent = (RANK_BLURBS[lang] || RANK_BLURBS.en)[r];
    completeTime.textContent = lang === "ja" ? `${secs.toFixed(1)}秒` : `${secs.toFixed(1)}s`;
    let stats = { best: {}, cleared: 0 };
    try { stats = loadStats(localStorage); } catch { /* ignore */ }
    completeRecord.textContent = `${strings().bestLabel}: ${(typeof stats.best[mission.missionId] === "number" ? stats.best[mission.missionId] : kps).toFixed(1)} KPS · ${strings().streakLabel(stats.cleared)} · ${titleFor(stats.cleared, lang)}`;
  } else {
    missionComplete.hidden = true;
  }
  if (mission && !mission.finishedAt && missionHud.hidden === false) {
    // active mission: refresh the HUD copy in place
    const copy = missionById(mission.missionId)[lang];
    missionName.textContent = `${strings().missionLabel}: ${copy.name}`;
  } else if (!mission) {
    missionBrief.hidden = true;
  }
  updateStatsHud();
}

// ---- free typing ----

let mission = null; // null = free mode

function freeCorpus() {
  return CODE_CORPUS[corpusIndex];
}

function activeCorpus() {
  if (!mission) return freeCorpus();
  const stageId = STAGE_IDS[mission.stageIndex];
  return STAGE_CORPORA[stageId];
}

function render() {
  codeEl.textContent = visibleText(cursor, activeCorpus());
  screen.scrollTop = screen.scrollHeight;
}

function rotateCorpus() {
  corpusIndex = (corpusIndex + 1) % CODE_CORPUS.length;
  cursor = 0;
}

// ---- theme ----

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

// ---- overlays (G/D) ----

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

// ---- mission mode ----

let clockTimer = null;

function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

function openBrief() {
  // cycle through missions on repeated opens
  briefIndex = (briefIndex + 1) % MISSIONS.length;
  const m = missionById(MISSIONS[briefIndex].id);
  const copy = m[lang];
  briefName.textContent = copy.name;
  briefText.textContent = copy.brief;
  missionBrief.hidden = false;
  missionComplete.hidden = true;
}

let briefIndex = -1;

function startMission(missionId) {
  mission = createMission(missionId || MISSIONS[Math.max(0, briefIndex)].id);
  missionBrief.hidden = true;
  missionComplete.hidden = true;
  missionHud.hidden = false;
  clearInterval(clockTimer);
  clockTimer = setInterval(() => { updateMissionHud(); }, 250);
  cursor = 0;
  corpusIndex = 0;
  const copy = missionById(mission.missionId)[lang];
  missionName.textContent = `${strings().missionLabel}: ${copy.name}`;
  updateMissionHud();
  render();
}

function updateMissionHud() {
  if (!mission) return;
  const stageId = STAGE_IDS[mission.stageIndex];
  missionStage.textContent = strings().stageNames[stageId];
  missionKps.textContent = `${keysPerSecond(mission).toFixed(1)} KPS`;
  missionKeys.textContent = lang === "ja"
    ? `${mission.keystrokes} 打鍵`
    : `${mission.keystrokes} keys`;
  missionClock.textContent = lang === "ja"
    ? `${elapsedSeconds(mission).toFixed(1)}秒`
    : `${elapsedSeconds(mission).toFixed(1)}s`;
  const missionPct = Math.round(missionProgress(mission, mission.missionId) * 100);
  missionFill.style.width = `${missionPct}%`;
  document.getElementById("mission-progress").setAttribute("aria-valuenow", String(missionPct));
  stageFill.style.width = `${stageProgress(mission, mission.missionId) * 100}%`;
}

function updateStatsHud() {
  // refresh HUD hint line with current title + cleared count
  let stats = { best: {}, cleared: 0 };
  try { stats = loadStats(localStorage); } catch { /* ignore */ }
  const title = titleFor(stats.cleared, lang);
  const chip = document.getElementById("hud-theme");
  if (chip && !mission) {
    chip.textContent = `${THEMES[currentTheme()].name.toUpperCase()} · ${title} · ${stats.cleared}`;
  }
}

function currentTheme() {
  return resolveTheme(new URLSearchParams(window.location.search).get("t"));
}

function finishMission() {
  const kps = keysPerSecond(mission);
  const secs = elapsedSeconds(mission);
  const r = rank(kps);
  const copy = missionById(mission.missionId)[lang];
  let stats = { best: {}, cleared: 0 };
  try { stats = saveClear(localStorage, mission.missionId, kps, 0); } catch { /* ignore */ }
  const prevBest = stats.best[mission.missionId];
  const isRecord = prevBest !== undefined && prevBest <= kps;

  completeSub.textContent = strings().completeSub(copy.name, r, kps, secs);
  completeBlurb.textContent = (RANK_BLURBS[lang] || RANK_BLURBS.en)[r];
  completeKps.textContent = kps.toFixed(1);
  completeTime.textContent = lang === "ja" ? `${secs.toFixed(1)}秒` : `${secs.toFixed(1)}s`;
  completeKeys.textContent = String(mission.keystrokes);
  const bestKps = typeof stats.best[mission.missionId] === "number" ? stats.best[mission.missionId].toFixed(1) : kps.toFixed(1);
  completeRecord.textContent = lang === "ja"
    ? `${strings().bestLabel}: ${bestKps} KPS · ${strings().streakLabel(stats.cleared)} · ${titleFor(stats.cleared, lang)}`
    : `${strings().bestLabel}: ${bestKps} KPS · ${strings().streakLabel(stats.cleared)} · ${titleFor(stats.cleared, lang)}`;
  missionComplete.hidden = false;
  missionHud.hidden = true;
  mission.lastRank = r;
  mission.lastKps = kps;
  clearInterval(clockTimer);
  updateStatsHud();
}

function abortMission() {
  mission = null;
  missionHud.hidden = true;
  missionBrief.hidden = true;
  missionComplete.hidden = true;
  clearInterval(clockTimer);
  updateStatsHud();
  cursor = 0;
  render();
}

// ---- keyboard ----

window.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;
  if (key === "Escape") {
    overlay.hidden = true;
    clearTimeout(overlayTimer);
    if (missionBrief.hidden === false || missionComplete.hidden === false || mission) {
      abortMission();
    }
    return;
  }
  if (key === "f" || key === "F") { toggleFullscreen(); }
  if (key === "g" || key === "G") { showOverlay("granted"); }
  if (key === "d" || key === "D") { showOverlay("denied"); }

  if (!missionBrief.hidden) {
    if (key === "m" || key === "M") {
      startMission(MISSIONS[Math.max(0, briefIndex)].id);
    }
    return; // brief screen swallows typing
  }
  if (!missionComplete.hidden) {
    // completion screen swallows typing, but M opens the next brief
    if (key === "m" || key === "M") { openBrief(); }
    return;
  }

  if (key === "m" || key === "M") { openBrief(); return; }

  if (mission) {
    const result = advance(mission, mission.missionId);
    mission = result.state;
    cursor = Math.min(cursor + 3, activeCorpus().length);
    if (result.stageCleared && !result.missionCleared) {
      cursor = 0;
      showStageFlash();
    }
    if (result.missionCleared) {
      finishMission();
      return;
    }
    updateMissionHud();
    render();
    return;
  }

  cursor = nextCursor(cursor, activeCorpus());
  if (cursor === 0) rotateCorpus();
  render();
});

function showStageFlash() {
  // quick stage-cleared flash on the overlay element
  const stageId = STAGE_IDS[mission.stageIndex];
  const title = lang === "ja" ? "段階クリア" : "STAGE CLEARED";
  overlayTitle.textContent = title;
  overlaySub.textContent = strings().stageNames[stageId];
  overlay.classList.remove("denied");
  overlay.hidden = false;
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => { overlay.hidden = true; }, 1100);
}

// ---- chips ----

for (const chip of dock.querySelectorAll(".theme-chip[data-theme]")) {
  chip.addEventListener("click", () => applyTheme(chip.dataset.theme));
}

missionChip.addEventListener("click", () => { openBrief(); });
langChip.addEventListener("click", () => { applyLanguage(lang === "ja" ? "en" : "ja"); });

shareChip.addEventListener("click", async () => {
  await navigator.clipboard.writeText(window.location.href);
  flashChip(shareChip);
});

missionShareChip.addEventListener("click", async () => {
  if (!mission) return;
  const copy = missionById(mission.missionId)[lang];
  const text = strings().shareText(copy.name, mission.lastRank, mission.lastKps) + " " + window.location.origin;
  await navigator.clipboard.writeText(text);
  flashChip(missionShareChip);
});

againChip.addEventListener("click", () => { startMission(mission ? mission.missionId : MISSIONS[0].id); });
menuChip.addEventListener("click", () => { abortMission(); openBrief(); });

function flashChip(chip) {
  const original = chip.textContent;
  chip.textContent = "✓ copied";
  setTimeout(() => { chip.textContent = original; }, 1400);
}

// ---- boot ----

applyTheme(currentTheme());
applyLanguage(lang);
for (let i = 0; i < 220; i += 1) {
  cursor = nextCursor(cursor, activeCorpus());
  if (cursor === 0 && !mission) rotateCorpus();
}
render();
